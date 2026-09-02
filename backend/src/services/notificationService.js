const { Op } = require("sequelize");
const { User, Notification, Batch, Chemical } = require("../models");
const { sendEmail } = require("./emailService.js");

/**
 * Finds all users who should receive notifications (ADMINs and TECHNICAL_OFFICERs).
 * @returns {Promise<User[]>} A promise that resolves to an array of user objects.
 */
const getNotifiableUsers = async () => {
  return User.findAll({
    where: {
      role: {
        [Op.in]: ['ADMIN', 'TECHNICAL_OFFICER'],
      },
      isActive: true,
    },
    attributes: ['id', 'fullName', 'email'],
  });
};

/**
 * A centralized service for creating and sending notifications to relevant users.
 *
 * @param {object} options - The details for the notification.
 * @param {object} options.actor - The user who performed the action. { id: string, fullName: string }
 * @param {string} options.type - The notification type from the ENUM in the model.
 * @param {string} options.severity - The severity ('INFO', 'WARNING', 'CRITICAL').
 * @param {object} options.entity - The entity related to the notification (e.g., the new chemical or user).
 * @param {string} [options.entityType] - The model name of the entity (e.g., 'Chemical').
 * @param {object} options.messageBuilder - An object containing functions to build personalized messages.
 * @param {function(entity): string} options.messageBuilder.actor - Function to build the message for the actor (2nd person).
 * @param {function(actorName, entity): string} options.messageBuilder.others - Function to build the message for other users (3rd person).
 */
const createNotification = async (options) => {
  try {
    const { actor, type, severity, entity, entityType, messageBuilder } = options;

    if (!actor || !type || !severity || !entity || !messageBuilder) {
      console.error('[NotificationService] Error: Service called with missing parameters.', options);
      return;
    }

    const notifiableUsers = await getNotifiableUsers();

    // Add detailed logging to see what's happening
    console.log(`[NotificationService] Found ${notifiableUsers.length} users to notify.`);

    if (notifiableUsers.length === 0) {
      console.warn('[NotificationService] No active ADMIN or TECHNICAL_OFFICER users found to send notifications to. Aborting.');
      return; // No one to notify
    }

    const notificationsToCreate = notifiableUsers.map(targetUser => {
      // Generate a personalized message for each target user
      const message = targetUser.id === actor.id
        ? messageBuilder.actor(entity)
        : messageBuilder.others(actor.fullName, entity);
      
      return {
        userId: targetUser.id,
        type,
        severity,
        message,
        entityType: entityType || null,
        entityId: entity.id || null,
      };
    });

    console.log(`[NotificationService] Attempting to create ${notificationsToCreate.length} notification records in the database.`);
    await Notification.bulkCreate(notificationsToCreate);
    console.log('[NotificationService] Successfully created notifications.');

  } catch (error) {
    // Log the full error for better debugging
    console.error('--- FAILED TO CREATE NOTIFICATIONS ---');
    console.error('Error details:', error);
    console.error('------------------------------------');
  }
};

const toDateOnlyString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateOnlyDiffInDays = (fromDateOnly, toDateOnly) => {
  const fromDate = new Date(`${fromDateOnly}T00:00:00Z`);
  const toDate = new Date(`${toDateOnly}T00:00:00Z`);
  return Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24));
};

const isExpiryAlertDay = (daysUntilExpiry) => {
  return daysUntilExpiry === 30 || daysUntilExpiry === 15 || (daysUntilExpiry >= 0 && daysUntilExpiry <= 7);
};

const getExpirySeverity = (daysUntilExpiry) => {
  if (daysUntilExpiry <= 7) return "CRITICAL";
  if (daysUntilExpiry === 15) return "WARNING";
  return "INFO";
};

const isLowStockBatch = (batch) => {
  const currentQuantity = Number(batch.currentQuantity);
  const thresholdQuantity = Number(batch.lowStockThresholdQuantity);

  return Number.isFinite(thresholdQuantity) && thresholdQuantity >= 0 && currentQuantity <= thresholdQuantity;
};

const buildExpiryMessage = (batch, daysUntilExpiry) => {
  const chemicalName = batch.chemical?.canonicalName || "Unknown chemical";
  const binCardNumber = batch.chemical?.binCardNumber ? ` (${batch.chemical.binCardNumber})` : "";
  const batchNumber = batch.batchNumber || "N/A";
  const unit = batch.chemical?.baseUnit ? ` ${batch.chemical.baseUnit}` : "";
  const quantity = batch.currentQuantity ? ` Current stock: ${batch.currentQuantity}${unit}.` : "";

  if (daysUntilExpiry === 0) {
    return `${chemicalName}${binCardNumber} batch ${batchNumber} expires today.${quantity}`;
  }

  return `${chemicalName}${binCardNumber} batch ${batchNumber} will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} on ${batch.expiryDate}.${quantity}`;
};

const buildExpiredMessage = (batch, daysExpired) => {
  const chemicalName = batch.chemical?.canonicalName || "Unknown chemical";
  const binCardNumber = batch.chemical?.binCardNumber ? ` (${batch.chemical.binCardNumber})` : "";
  const batchNumber = batch.batchNumber || "N/A";
  const unit = batch.chemical?.baseUnit ? ` ${batch.chemical.baseUnit}` : "";
  const quantity = batch.currentQuantity ? ` Current stock: ${batch.currentQuantity}${unit}.` : "";
  const expiredFor = daysExpired === 0
    ? "expired today"
    : `expired ${daysExpired} day${daysExpired === 1 ? "" : "s"} ago`;

  return `${chemicalName}${binCardNumber} batch ${batchNumber} ${expiredFor} on ${batch.expiryDate}.${quantity}`;
};

const notifyExpiredBatches = async () => {
  try {
    const today = new Date();
    const todayDateOnly = toDateOnlyString(today);

    const notifiableUsers = await getNotifiableUsers();
    if (notifiableUsers.length === 0) {
      return { checkedBatches: 0, expiredBatches: 0, createdNotifications: 0 };
    }

    const expiredBatches = await Batch.findAll({
      where: {
        expiryDate: {
          [Op.lt]: todayDateOnly,
        },
        currentQuantity: {
          [Op.gt]: 0,
        },
      },
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: ["canonicalName", "binCardNumber", "baseUnit", "isActive"],
          where: { isActive: true },
        },
      ],
    });

    if (expiredBatches.length === 0) {
      return { checkedBatches: 0, expiredBatches: 0, createdNotifications: 0 };
    }

    const existingNotifications = await Notification.findAll({
      where: {
        type: "EXPIRED_CHEMICAL",
        entityType: "Batch",
        entityId: {
          [Op.in]: expiredBatches.map((batch) => batch.id),
        },
        userId: {
          [Op.in]: notifiableUsers.map((user) => user.id),
        },
      },
      attributes: ["userId", "entityId"],
    });

    const existingKeys = new Set(
      existingNotifications.map((notification) => `${notification.userId}:${notification.entityId}`),
    );

    const notificationsToCreate = expiredBatches.flatMap((batch) => {
      const daysExpired = Math.abs(getDateOnlyDiffInDays(todayDateOnly, batch.expiryDate));
      const message = buildExpiredMessage(batch, daysExpired);

      return notifiableUsers
        .filter((user) => !existingKeys.has(`${user.id}:${batch.id}`))
        .map((user) => ({
          userId: user.id,
          type: "EXPIRED_CHEMICAL",
          severity: "CRITICAL",
          message,
          entityType: "Batch",
          entityId: batch.id,
        }));
    });

    if (notificationsToCreate.length > 0) {
      await Notification.bulkCreate(notificationsToCreate);
    }

    return {
      checkedBatches: expiredBatches.length,
      expiredBatches: expiredBatches.length,
      createdNotifications: notificationsToCreate.length,
    };
  } catch (error) {
    console.error("--- FAILED TO CREATE EXPIRED BATCH NOTIFICATIONS ---");
    console.error("Error details:", error);
    console.error("----------------------------------------------------");
    return { checkedBatches: 0, expiredBatches: 0, createdNotifications: 0, error };
  }
};

const notifyExpiringBatches = async () => {
  try {
    const today = new Date();
    const todayDateOnly = toDateOnlyString(today);
    const thirtyDaysFromToday = new Date(today);
    thirtyDaysFromToday.setDate(today.getDate() + 30);

    const notifiableUsers = await getNotifiableUsers();
    if (notifiableUsers.length === 0) {
      return { checkedBatches: 0, createdNotifications: 0 };
    }

    const batches = await Batch.findAll({
      where: {
        expiryDate: {
          [Op.between]: [todayDateOnly, toDateOnlyString(thirtyDaysFromToday)],
        },
        currentQuantity: {
          [Op.gt]: 0,
        },
      },
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: ["canonicalName", "binCardNumber", "baseUnit", "isActive"],
          where: { isActive: true },
        },
      ],
    });

    const alertableBatches = batches
      .map((batch) => ({
        batch,
        daysUntilExpiry: getDateOnlyDiffInDays(todayDateOnly, batch.expiryDate),
      }))
      .filter(({ daysUntilExpiry }) => isExpiryAlertDay(daysUntilExpiry));

    if (alertableBatches.length === 0) {
      return { checkedBatches: batches.length, createdNotifications: 0 };
    }

    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfToday.getDate() + 1);

    const existingNotifications = await Notification.findAll({
      where: {
        type: "EXPIRY_ALERT",
        entityType: "Batch",
        entityId: {
          [Op.in]: alertableBatches.map(({ batch }) => batch.id),
        },
        userId: {
          [Op.in]: notifiableUsers.map((user) => user.id),
        },
        createdAt: {
          [Op.gte]: startOfToday,
          [Op.lt]: startOfTomorrow,
        },
      },
      attributes: ["userId", "entityId"],
    });

    const existingKeys = new Set(
      existingNotifications.map((notification) => `${notification.userId}:${notification.entityId}`),
    );

    const notificationsToCreate = alertableBatches.flatMap(({ batch, daysUntilExpiry }) => {
      const message = buildExpiryMessage(batch, daysUntilExpiry);

      return notifiableUsers
        .filter((user) => !existingKeys.has(`${user.id}:${batch.id}`))
        .map((user) => ({
          userId: user.id,
          type: "EXPIRY_ALERT",
          severity: getExpirySeverity(daysUntilExpiry),
          message,
          entityType: "Batch",
          entityId: batch.id,
        }));
    });

    if (notificationsToCreate.length > 0) {
      await Notification.bulkCreate(notificationsToCreate);
    }

    return {
      checkedBatches: batches.length,
      alertableBatches: alertableBatches.length,
      createdNotifications: notificationsToCreate.length,
    };
  } catch (error) {
    console.error("--- FAILED TO CREATE EXPIRY NOTIFICATIONS ---");
    console.error("Error details:", error);
    console.error("---------------------------------------------");
    return { checkedBatches: 0, createdNotifications: 0, error };
  }
};

const buildLowStockMessage = (batch) => {
  const chemicalName = batch.chemical?.canonicalName || "Unknown chemical";
  const binCardNumber = batch.chemical?.binCardNumber ? ` (${batch.chemical.binCardNumber})` : "";
  const batchNumber = batch.batchNumber || "N/A";
  const unit = batch.chemical?.baseUnit ? ` ${batch.chemical.baseUnit}` : "";
  const quantityReceived = Number(batch.quantityReceived);
  const currentQuantity = Number(batch.currentQuantity);
  const thresholdQuantity = Number(batch.lowStockThresholdQuantity);
  const remainingPercentage = quantityReceived > 0
    ? ((currentQuantity / quantityReceived) * 100).toFixed(1)
    : "0.0";

  return `${chemicalName}${binCardNumber} batch ${batchNumber} is low on stock: ${currentQuantity}${unit} remaining from ${quantityReceived}${unit} (${remainingPercentage}%, threshold ${thresholdQuantity}${unit}).`;
};

const buildChemicalOutOfStockEmail = (chemical, totalQuantity) => {
  const chemicalName = chemical.canonicalName || "Unknown chemical";
  const binCardNumber = chemical.binCardNumber
    ? ` (${chemical.binCardNumber})`
    : "";
  const unit = chemical.baseUnit ? ` ${chemical.baseUnit}` : "";

  const subject = `[FOTLAB] Chemical Out of Stock - ${chemicalName}`;

  const text = `
Chemical Out of Stock Alert

Chemical: ${chemicalName}${binCardNumber}

Total available quantity: ${totalQuantity}${unit}

All batches belonging to this chemical currently have zero stock.

Please log in to the FOTLAB system and arrange the required action.

This is an automated email from FOTLAB.
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Chemical Out of Stock Alert</h2>

      <p>
        <strong>Chemical:</strong>
        ${chemicalName}${binCardNumber}
      </p>

      <p>
        <strong>Total available quantity:</strong>
        ${totalQuantity}${unit}
      </p>

      <p>
        All batches belonging to this chemical currently have
        <strong>zero stock</strong>.
      </p>

      <p>
        Please log in to the FOTLAB system and arrange the required action.
      </p>

      <hr />

      <p style="font-size: 13px; color: #666;">
        This is an automated email from FOTLAB.
      </p>
    </div>
  `.trim();

  return {
    subject,
    text,
    html,
  };
};

const createLowStockNotifications = async (
  batches,
  { sendOutOfStockEmail = false } = {},
) => {
  const lowStockBatches = batches.filter(isLowStockBatch);

  const notifiableUsers = await getNotifiableUsers();

  // ---------------------------------------------------------
  // 1. CREATE IN-APP LOW STOCK NOTIFICATIONS
  // ---------------------------------------------------------

  let notificationsToCreate = [];

  if (lowStockBatches.length > 0 && notifiableUsers.length > 0) {
    const existingNotifications = await Notification.findAll({
      where: {
        type: "LOW_STOCK",
        entityType: "Batch",
        entityId: {
          [Op.in]: lowStockBatches.map((batch) => batch.id),
        },
        userId: {
          [Op.in]: notifiableUsers.map((user) => user.id),
        },
      },
      attributes: ["userId", "entityId"],
    });

    const existingKeys = new Set(
      existingNotifications.map(
        (notification) =>
          `${notification.userId}:${notification.entityId}`,
      ),
    );

    notificationsToCreate = lowStockBatches.flatMap((batch) => {
      const message = buildLowStockMessage(batch);

      return notifiableUsers
        .filter(
          (user) =>
            !existingKeys.has(`${user.id}:${batch.id}`),
        )
        .map((user) => ({
          userId: user.id,
          type: "LOW_STOCK",
          severity: "WARNING",
          message,
          entityType: "Batch",
          entityId: batch.id,
        }));
    });

    if (notificationsToCreate.length > 0) {
      await Notification.bulkCreate(notificationsToCreate);
    }
  }

  // ---------------------------------------------------------
  // 2. CHECK CHEMICAL-LEVEL TOTAL STOCK
  // ---------------------------------------------------------

  const chemicalIds = [
    ...new Set(
      lowStockBatches.map((batch) => batch.chemicalId),
    ),
  ];

  let emailsSent = 0;

  // ---------------------------------------------------------
  // 3. EMAIL ONLY FROM STOCK-CHANGING OPERATIONS
  // ---------------------------------------------------------

  if (sendOutOfStockEmail && chemicalIds.length > 0) {
    const chemicals = await Chemical.findAll({
      where: {
        id: {
          [Op.in]: chemicalIds,
        },
        isActive: true,
      },
      attributes: [
        "id",
        "canonicalName",
        "binCardNumber",
        "baseUnit",
      ],
    });

    const hodEmail = process.env.HOD_EMAIL;

    if (!hodEmail) {
      console.error(
        "[NotificationService] HOD_EMAIL is not configured. Out-of-stock email cannot be sent.",
      );
    } else {
      for (const chemical of chemicals) {
        // ---------------------------------------------------
        // Calculate TOTAL AVAILABLE STOCK for this chemical
        // across all non-disposed batches.
        // ---------------------------------------------------

        const totalQuantity = await Batch.sum("currentQuantity", {
          where: {
            chemicalId: chemical.id,
            isDisposed: false,
          },
        });

        const totalStock = Number(totalQuantity || 0);

        console.log(
          `[NotificationService] Chemical ${chemical.canonicalName} (${chemical.binCardNumber}) total stock: ${totalStock}`,
        );

        // ---------------------------------------------------
        // EMAIL ONLY WHEN TOTAL CHEMICAL STOCK = 0
        // ---------------------------------------------------

        if (totalStock !== 0) {
          continue;
        }

        const email = buildChemicalOutOfStockEmail(
          chemical,
          totalStock,
        );

        try {
          await sendEmail({
            to: hodEmail,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });

          emailsSent += 1;

          console.log(
            `[NotificationService] Out-of-stock email sent to HOD for chemical ${chemical.canonicalName} (${chemical.binCardNumber}).`,
          );
        } catch (emailError) {
          console.error(
            `[NotificationService] Failed to send out-of-stock email to HOD (${hodEmail}) for chemical ${chemical.canonicalName}:`,
            emailError,
          );
        }
      }
    }
  }

  return {
    checkedBatches: batches.length,
    lowStockBatches: lowStockBatches.length,
    createdNotifications: notificationsToCreate.length,
    emailsSent,
  };
};

const notifyLowStockBatch = async (batchId) => {
  try {
    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: ["canonicalName", "binCardNumber", "baseUnit", "isActive"],
          where: { isActive: true },
        },
      ],
    });

    if (!batch) {
      return { checkedBatches: 0, lowStockBatches: 0, createdNotifications: 0 };
    }

    return createLowStockNotifications([batch], {
      sendOutOfStockEmail: true,
    });
  } catch (error) {
    console.error("--- FAILED TO CREATE LOW STOCK NOTIFICATIONS ---");
    console.error("Error details:", error);
    console.error("-----------------------------------------------");
    return { checkedBatches: 0, lowStockBatches: 0, createdNotifications: 0, error };
  }
};

const notifyLowStockBatches = async () => {
  try {
    const batches = await Batch.findAll({
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: [
            "canonicalName",
            "binCardNumber",
            "baseUnit",
            "isActive",
          ],
          where: { isActive: true },
        },
      ],
    });

    return createLowStockNotifications(batches, {
      sendOutOfStockEmail: false,
    });
  } catch (error) {
    console.error(
      "--- FAILED TO CREATE LOW STOCK NOTIFICATIONS ---",
    );
    console.error("Error details:", error);
    console.error("-----------------------------------------------");

    return {
      checkedBatches: 0,
      lowStockBatches: 0,
      createdNotifications: 0,
      emailsSent: 0,
      error,
    };
  }
};

module.exports = {
  createNotification,
  notifyExpiredBatches,
  notifyExpiringBatches,
  notifyLowStockBatch,
  notifyLowStockBatches,
};
