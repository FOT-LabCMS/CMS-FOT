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
        [Op.in]: ["ADMIN", "TECHNICAL_OFFICER"],
      },
      isActive: true,
    },
    attributes: ["id", "fullName", "email"],
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
    const { actor, type, severity, entity, entityType, messageBuilder } =
      options;

    if (!actor || !type || !severity || !entity || !messageBuilder) {
      console.error(
        "[NotificationService] Error: Service called with missing parameters.",
        options,
      );
      return;
    }

    const notifiableUsers = await getNotifiableUsers();

    // Add detailed logging to see what's happening
    console.log(
      `[NotificationService] Found ${notifiableUsers.length} users to notify.`,
    );

    if (notifiableUsers.length === 0) {
      console.warn(
        "[NotificationService] No active ADMIN or TECHNICAL_OFFICER users found to send notifications to. Aborting.",
      );
      return; // No one to notify
    }

    const notificationsToCreate = notifiableUsers.map((targetUser) => {
      // Generate a personalized message for each target user
      const message =
        targetUser.id === actor.id
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

    console.log(
      `[NotificationService] Attempting to create ${notificationsToCreate.length} notification records in the database.`,
    );
    await Notification.bulkCreate(notificationsToCreate);
    console.log("[NotificationService] Successfully created notifications.");
  } catch (error) {
    // Log the full error for better debugging
    console.error("--- FAILED TO CREATE NOTIFICATIONS ---");
    console.error("Error details:", error);
    console.error("------------------------------------");
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
  return (
    daysUntilExpiry === 30 ||
    daysUntilExpiry === 15 ||
    (daysUntilExpiry >= 0 && daysUntilExpiry <= 7)
  );
};

const getExpirySeverity = (daysUntilExpiry) => {
  if (daysUntilExpiry <= 7) return "CRITICAL";
  if (daysUntilExpiry === 15) return "WARNING";
  return "INFO";
};

const isLowStockBatch = (batch) => {
  const currentQuantity = Number(batch.currentQuantity);
  const thresholdQuantity = Number(batch.lowStockThresholdQuantity);

  return (
    Number.isFinite(thresholdQuantity) &&
    thresholdQuantity >= 0 &&
    currentQuantity <= thresholdQuantity
  );
};

const buildExpiryMessage = (batch, daysUntilExpiry) => {
  const chemicalName = batch.chemical?.canonicalName || "Unknown chemical";
  const binCardNumber = batch.chemical?.binCardNumber
    ? ` (${batch.chemical.binCardNumber})`
    : "";
  const batchNumber = batch.batchNumber || "N/A";
  const unit = batch.chemical?.baseUnit ? ` ${batch.chemical.baseUnit}` : "";
  const quantity = batch.currentQuantity
    ? ` Current stock: ${batch.currentQuantity}${unit}.`
    : "";

  if (daysUntilExpiry === 0) {
    return `${chemicalName}${binCardNumber} batch ${batchNumber} expires today.${quantity}`;
  }

  return `${chemicalName}${binCardNumber} batch ${batchNumber} will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} on ${batch.expiryDate}.${quantity}`;
};

const buildExpiredMessage = (batch, daysExpired) => {
  const chemicalName = batch.chemical?.canonicalName || "Unknown chemical";
  const binCardNumber = batch.chemical?.binCardNumber
    ? ` (${batch.chemical.binCardNumber})`
    : "";
  const batchNumber = batch.batchNumber || "N/A";
  const unit = batch.chemical?.baseUnit ? ` ${batch.chemical.baseUnit}` : "";
  const quantity = batch.currentQuantity
    ? ` Current stock: ${batch.currentQuantity}${unit}.`
    : "";
  const expiredFor =
    daysExpired === 0
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
      existingNotifications.map(
        (notification) => `${notification.userId}:${notification.entityId}`,
      ),
    );

    const notificationsToCreate = expiredBatches.flatMap((batch) => {
      const daysExpired = Math.abs(
        getDateOnlyDiffInDays(todayDateOnly, batch.expiryDate),
      );
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
    return {
      checkedBatches: 0,
      expiredBatches: 0,
      createdNotifications: 0,
      error,
    };
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
      existingNotifications.map(
        (notification) => `${notification.userId}:${notification.entityId}`,
      ),
    );

    const notificationsToCreate = alertableBatches.flatMap(
      ({ batch, daysUntilExpiry }) => {
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
      },
    );

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
  const binCardNumber = batch.chemical?.binCardNumber
    ? ` (${batch.chemical.binCardNumber})`
    : "";
  const batchNumber = batch.batchNumber || "N/A";
  const unit = batch.chemical?.baseUnit ? ` ${batch.chemical.baseUnit}` : "";
  const quantityReceived = Number(batch.quantityReceived);
  const currentQuantity = Number(batch.currentQuantity);
  const thresholdQuantity = Number(batch.lowStockThresholdQuantity);
  const remainingPercentage =
    quantityReceived > 0
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
  const subject = `[FOTLAB] URGENT - Chemical Out of Stock - ${chemicalName}`;
  const text =
    ` URGENT CHEMICAL STOCK ALERT FOTLAB Chemical Management System Chemical: ${chemicalName}${binCardNumber} Total available quantity: ${totalQuantity}${unit} STATUS: OUT OF STOCK All batches belonging to this chemical currently have zero available stock. Immediate attention is required. Please log in to the FOTLAB system and arrange the required action. This is an automated alert from FOTLAB. `.trim();
  const html =
    ` <!DOCTYPE html> <html> <head> <meta charset="UTF-8" /> <meta name="viewport" content="width=device-width, initial-scale=1.0" /> <title>FOTLAB Chemical Out of Stock Alert</title> </head> <body style=" margin: 0; padding: 0; background-color: #faf8f3; font-family: Arial, Helvetica, sans-serif; color: #1b211d; "> <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #faf8f3; padding: 32px 16px;" > <tr> <td align="center"> <!-- Main Email Container --> <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style=" max-width: 620px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #e4e0d3; box-shadow: 0 8px 24px rgba(14, 42, 32, 0.10); " > <!-- Brand Header --> <tr> <td style=" background-color: #0e2a20; padding: 26px 30px; border-bottom: 4px solid #b8873a; "> <div style=" font-size: 12px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #d6aa5e; margin-bottom: 8px; "> FOTLAB </div> <div style=" font-size: 22px; font-weight: 800; line-height: 1.3; color: #f6f4ec; "> Chemical Management System </div> <div style=" margin-top: 7px; font-size: 13px; color: #e7efea; "> Faculty of Technology · University of Ruhuna </div> </td> </tr> <!-- Urgent Alert Banner --> <tr> <td style=" background-color: #fff3f1; border-bottom: 1px solid #f0d0cc; padding: 18px 30px; "> <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" > <tr> <td width="42" valign="top"> <div style=" width: 32px; height: 32px; line-height: 32px; text-align: center; border-radius: 50%; background-color: #d6483f; color: #ffffff; font-size: 18px; font-weight: bold; "> ! </div> </td> <td valign="middle"> <div style=" font-size: 14px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: #b93630; "> Urgent Stock Alert </div> <div style=" margin-top: 3px; font-size: 13px; color: #6d514e; "> Immediate attention is required. </div> </td> </tr> </table> </td> </tr> <!-- Main Content --> <tr> <td style="padding: 30px;"> <div style=" font-size: 21px; font-weight: 800; color: #0e2a20; margin-bottom: 8px; "> Chemical Out of Stock </div> <div style=" font-size: 14px; line-height: 1.7; color: #5b6660; margin-bottom: 24px; "> The following chemical currently has no available stock across all of its batches. </div> <!-- Chemical Information Card --> <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style=" border: 1px solid #e4e0d3; border-radius: 10px; overflow: hidden; background-color: #faf8f3; " > <!-- Chemical Name --> <tr> <td style=" padding: 16px 18px; border-bottom: 1px solid #e4e0d3; "> <div style=" font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #8b948c; margin-bottom: 6px; "> Chemical </div> <div style=" font-size: 16px; font-weight: 700; color: #1b4332; "> ${chemicalName} </div> ${chemical.binCardNumber ? ` <div style=" display: inline-block; margin-top: 8px; padding: 4px 9px; border-radius: 6px; background-color: #e7efea; color: #1b4332; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; "> Bin Card: ${chemical.binCardNumber} </div> ` : ""} </td> </tr> <!-- Quantity --> <tr> <td style=" padding: 16px 18px; "> <div style=" font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #8b948c; margin-bottom: 6px; "> Total Available Quantity </div> <div style=" font-size: 25px; font-weight: 800; color: #d6483f; "> ${totalQuantity}${unit} </div> <div style=" margin-top: 4px; font-size: 12px; color: #8b948c; "> Current available stock </div> </td> </tr> </table> <!-- Status --> <div style=" margin-top: 22px; padding: 16px 18px; border-left: 4px solid #d6483f; background-color: #fff8f7; "> <div style=" font-size: 12px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #b93630; margin-bottom: 5px; "> Current Status </div> <div style=" font-size: 14px; font-weight: 700; color: #4c2926; "> OUT OF STOCK </div> <div style=" margin-top: 5px; font-size: 13px; line-height: 1.6; color: #6d514e; "> All batches belonging to this chemical currently have zero available stock. </div> </div> <!-- Action Message --> <div style=" margin-top: 24px; font-size: 14px; line-height: 1.7; color: #5b6660; "> Please log in to the <strong style="color: #1b4332;"> FOTLAB Chemical Management System </strong> and arrange the required action. </div> </td> </tr> <!-- Footer --> <tr> <td style=" background-color: #0e2a20; padding: 22px 30px; border-top: 1px solid rgba(214, 170, 94, 0.35); "> <div style=" font-size: 12px; font-weight: 700; letter-spacing: 1px; color: #d6aa5e; margin-bottom: 7px; "> FOTLAB </div> <div style=" font-size: 11px; line-height: 1.6; color: #e7efea; "> Faculty Laboratory Chemical Management System </div> <div style=" margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(246, 244, 236, 0.12); font-size: 10px; line-height: 1.6; color: #9eaaa3; "> This is an automated system alert. Please do not reply directly to this email. </div> </td> </tr> </table> <!-- Bottom Notice --> <div style=" max-width: 620px; padding-top: 14px; text-align: center; font-size: 10px; line-height: 1.5; color: #8b948c; "> FOTLAB · Department of Biosystem Technology · University of Ruhuna </div> </td> </tr> </table> </body> </html> `.trim();
  return { subject, text, html };
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
        (notification) => `${notification.userId}:${notification.entityId}`,
      ),
    );

    notificationsToCreate = lowStockBatches.flatMap((batch) => {
      const message = buildLowStockMessage(batch);

      return notifiableUsers
        .filter((user) => !existingKeys.has(`${user.id}:${batch.id}`))
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
    ...new Set(lowStockBatches.map((batch) => batch.chemicalId)),
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
      attributes: ["id", "canonicalName", "binCardNumber", "baseUnit"],
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

        const email = buildChemicalOutOfStockEmail(chemical, totalStock);

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
    return {
      checkedBatches: 0,
      lowStockBatches: 0,
      createdNotifications: 0,
      error,
    };
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
    console.error("--- FAILED TO CREATE LOW STOCK NOTIFICATIONS ---");
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
