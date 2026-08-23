const { Dispose, Chemical, Batch, Location, sequelize } = require("../models/index.js");
const { Op, QueryTypes } = require("sequelize");
const { logAction } = require('../services/auditLogService.js');

const retriveBatchDetails = async (req, res) => {
  try {
    const batchDetails = await Batch.findAll({
      attributes: ["id", "batchNumber"],
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: ["canonicalName"],
        },
      ],
      order: [["batchNumber", "ASC"]],
    });

    res.json({ batchDetails });
  } catch (error) {
    console.error("Error retrieving batch details:", error);
    res.status(500).json({
      message: "An error occurred while retrieving batch details.",
    });
  }
};

const calculateUsageBatchvise = async (req, res) => {
  try {
    const { batchNumber } = req.body;

    const batch = await Batch.findOne({
      where: { batchNumber },
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: ["chemicalCode", "canonicalName", "baseUnit"],
        },
      ],
    });

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found",
      });
    }

    const quantityReceived = Number(batch.quantityReceived);
    const currentQuantity = Number(batch.currentQuantity);
    const quantityUsed = quantityReceived - currentQuantity;

    // Audit Log: View Batch Usage Report
    await logAction({
      userId: req.user.id,
      userName: req.user.fullName,
      actionType: "VIEW_BATCH_USAGE_REPORT",
      entityType: "Batch",
      entityId: batch.id,
      details: {
        batchNumber: batch.batchNumber,
        chemicalCode: batch.chemical.chemicalCode,
      },
      ipAddress: req.ip,
    });

    res.json({
      batchNumber: batch.batchNumber,
      chemicalCode: batch.chemical.chemicalCode,
      chemicalName: batch.chemical.canonicalName,
      unit: batch.chemical.baseUnit,
      quantityReceived,
      currentQuantity,
      quantityUsed,
      expiryDate: batch.expiryDate,
      supplier: batch.supplier,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
const calculateUsageChemicalvise = async (req, res) => {
  try {
    const { chemicalCode } = req.body;

    const chemical = await Chemical.findOne({
      where: { chemicalCode },
    });

    if (!chemical) {
      return res.status(404).json({
        message: "Chemical not found",
      });
    }

    const batches = await Batch.findAll({
      where: {
        chemicalId: chemical.id,
      },
      order: [["batchNumber", "ASC"]],
    });

    const today = new Date();

    const result = batches.map((batch) => {
      const quantityReceived = Number(batch.quantityReceived);
      const currentQuantity = Number(batch.currentQuantity);
      const quantityUsed = quantityReceived - currentQuantity;

      return {
        batchNumber: batch.batchNumber,
        quantityReceived,
        currentQuantity,
        quantityUsed,
        expiryDate: batch.expiryDate,
        supplier: batch.supplier,
        status:
          batch.expiryDate && new Date(batch.expiryDate) < today
            ? "EXPIRED"
            : "ACTIVE",
      };
    });

    // Audit Log: View Chemical Usage Report
    await logAction({
      userId: req.user.id,
      userName: req.user.fullName,
      actionType: "VIEW_CHEMICAL_USAGE_REPORT",
      entityType: "Chemical",
      entityId: chemical.id,
      details: {
        chemicalCode: chemical.chemicalCode,
        chemicalName: chemical.canonicalName,
      },
      ipAddress: req.ip,
    });

    res.json({
      chemicalCode: chemical.chemicalCode,
      chemicalName: chemical.canonicalName,
      batches: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getDashboardUsageTrend = async (req, res) => {
  try {
    const { startDate, endDate, chemicalCode, batchNumber } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required.",
      });
    }

    if (!chemicalCode && !batchNumber) {
      return res.status(400).json({
        message: "Select a chemical or batch to generate the usage trend.",
      });
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid startDate or endDate query parameter.",
      });
    }

    if (start > end) {
      return res.status(400).json({
        message: "startDate cannot be later than endDate.",
      });
    }

    end.setHours(23, 59, 59, 999);

    const whereClause = {
      dateReturned: {
        [Op.not]: null,
        [Op.between]: [start, end],
      },
      returnedStatus: "RETURNED",
      quantityUsed: { [Op.gt]: 0 },
    };

    if (chemicalCode) {
      whereClause.chemicalCode = chemicalCode;
    }

    if (batchNumber) {
      whereClause.batchNumber = batchNumber;
    }

    const trendDate = sequelize.fn(
      "date_trunc",
      "day",
      sequelize.col("date_returned"),
    );

    const trend = await Dispose.findAll({
      attributes: [
        [sequelize.fn("to_char", trendDate, "YYYY-MM-DD"), "date"],
        [sequelize.fn("SUM", sequelize.col("quantity_used")), "totalQuantity"],
      ],
      where: whereClause,
      group: [trendDate],
      order: [[trendDate, "ASC"]],
      raw: true,
    });

    let unit = "";
    let label = "";
    let totalUsed = 0;

    if (batchNumber) {
      const batch = await Batch.findOne({
        where: { batchNumber },
        include: [
          {
            model: Chemical,
            as: "chemical",
            attributes: ["canonicalName", "chemicalCode", "baseUnit"],
            ...(chemicalCode ? { where: { chemicalCode } } : {}),
          },
        ],
      });

      if (batch?.chemical) {
        unit = batch.chemical.baseUnit || "";
        label = `${batch.chemical.canonicalName} - ${batch.batchNumber}`;
        totalUsed = Number(batch.quantityReceived || 0) - Number(batch.currentQuantity || 0);
      } else {
        label = batchNumber;
      }
    } else if (chemicalCode) {
      const chemical = await Chemical.findOne({
        where: { chemicalCode },
        attributes: ["id", "canonicalName", "chemicalCode", "baseUnit"],
      });

      if (chemical) {
        unit = chemical.baseUnit || "";
        label = `${chemical.canonicalName} (${chemical.chemicalCode})`;

        const batches = await Batch.findAll({
          where: { chemicalId: chemical.id },
          attributes: ["quantityReceived", "currentQuantity"],
        });

        totalUsed = batches.reduce(
          (sum, batch) =>
            sum +
            (Number(batch.quantityReceived || 0) - Number(batch.currentQuantity || 0)),
          0,
        );
      } else {
        label = chemicalCode;
      }
    }

    return res.json({
      success: true,
      label,
      unit,
      totalUsed: Number(totalUsed.toFixed(4)),
      trend: trend.map((item) => ({
        date: item.date,
        totalQuantity: Number(item.totalQuantity || 0),
      })),
    });
  } catch (error) {
    console.error("Error fetching dashboard usage trend:", error);
    return res.status(500).json({
      message: "An error occurred while generating the dashboard usage trend.",
    });
  }
};

const getUsageByHazardCategory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required.",
      });
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid startDate or endDate query parameter.",
      });
    }

    if (start > end) {
      return res.status(400).json({
        message: "startDate cannot be later than endDate.",
      });
    }

    end.setHours(23, 59, 59, 999);

    const rows = await sequelize.query(
      `
        SELECT
          COALESCE(c.hazard_category::text, 'OTHER') AS "hazardCategory",
          SUM(d.quantity_used)::float AS "totalQuantity",
          COUNT(d.id)::int AS "recordCount"
        FROM disposals d
        LEFT JOIN chemicals c
          ON c.chemical_code = d.chemical_code
        WHERE d.date_returned IS NOT NULL
          AND d.date_returned BETWEEN :startDate AND :endDate
          AND d.returned_status = 'RETURNED'
          AND d.quantity_used > 0
        GROUP BY COALESCE(c.hazard_category::text, 'OTHER')
        ORDER BY SUM(d.quantity_used) DESC
      `,
      {
        replacements: { startDate: start, endDate: end },
        type: QueryTypes.SELECT,
      },
    );

    const categories = rows.map((row) => ({
      hazardCategory: row.hazardCategory || "OTHER",
      totalQuantity: Number(row.totalQuantity || 0),
      recordCount: Number(row.recordCount || 0),
    }));

    return res.json({
      success: true,
      categories,
      totalQuantity: categories.reduce(
        (sum, item) => sum + Number(item.totalQuantity || 0),
        0,
      ),
      totalRecords: categories.reduce(
        (sum, item) => sum + Number(item.recordCount || 0),
        0,
      ),
    });
  } catch (error) {
    console.error("Error fetching usage by hazard category:", error);
    return res.status(500).json({
      message: "An error occurred while generating usage by hazard category.",
    });
  }
};

const getInventorySnapshot = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batches = await Batch.findAll({
      attributes: [
        "id",
        "batchNumber",
        "currentQuantity",
        "lowStockThresholdQuantity",
        "expiryDate",
      ],
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: ["canonicalName", "chemicalCode", "baseUnit"],
          where: { isActive: true },
          required: true,
        },
        {
          model: Location,
          as: "location",
          attributes: ["name", "type"],
          required: false,
        },
      ],
      order: [
        ["expiryDate", "ASC"],
        ["currentQuantity", "ASC"],
        ["createdAt", "DESC"],
      ],
      limit: 12,
    });

    const rows = batches.map((batch) => {
      const currentQuantity = Number(batch.currentQuantity || 0);
      const lowStockThresholdQuantity = Number(batch.lowStockThresholdQuantity || 0);
      let daysRemaining = null;
      let status = "HEALTHY";

      if (batch.expiryDate) {
        const expiry = new Date(`${batch.expiryDate}T00:00:00`);
        if (!Number.isNaN(expiry.getTime())) {
          daysRemaining = Math.floor(
            (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );
        }
      }

      if (daysRemaining !== null && daysRemaining < 0) {
        status = "EXPIRED";
      } else if (currentQuantity <= lowStockThresholdQuantity) {
        status = "LOW_STOCK";
      } else if (daysRemaining !== null && daysRemaining <= 30) {
        status = "EXPIRING_SOON";
      }

      return {
        id: batch.id,
        chemicalName: batch.chemical?.canonicalName || "Unknown Chemical",
        chemicalCode: batch.chemical?.chemicalCode || "",
        batchNumber: batch.batchNumber,
        currentQuantity,
        unit: batch.chemical?.baseUnit || "",
        location: batch.location
          ? `${batch.location.name}${batch.location.type ? ` (${batch.location.type})` : ""}`
          : "Unassigned",
        expiryDate: batch.expiryDate,
        daysRemaining,
        status,
      };
    });

    return res.json({
      success: true,
      inventory: rows,
    });
  } catch (error) {
    console.error("Error fetching inventory snapshot:", error);
    return res.status(500).json({
      message: "An error occurred while fetching inventory snapshot.",
    });
  }
};

const getStockRiskSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batches = await Batch.findAll({
      attributes: [
        "id",
        "currentQuantity",
        "lowStockThresholdQuantity",
        "expiryDate",
      ],
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: ["id"],
          where: { isActive: true },
          required: true,
        },
      ],
    });

    const stats = batches.reduce(
      (summary, batch) => {
        const currentQuantity = Number(batch.currentQuantity || 0);
        const lowStockThresholdQuantity = Number(batch.lowStockThresholdQuantity || 0);
        let daysRemaining = null;

        if (batch.expiryDate) {
          const expiry = new Date(`${batch.expiryDate}T00:00:00`);
          if (!Number.isNaN(expiry.getTime())) {
            daysRemaining = Math.floor(
              (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );
          }
        }

        summary.total += 1;

        if (currentQuantity <= 0) {
          summary.outOfStock += 1;
        } else if (daysRemaining !== null && daysRemaining < 0) {
          summary.expired += 1;
        } else if (
          lowStockThresholdQuantity > 0 &&
          currentQuantity <= lowStockThresholdQuantity
        ) {
          summary.lowStock += 1;
        } else if (daysRemaining !== null && daysRemaining <= 30) {
          summary.expiringSoon += 1;
        } else {
          summary.healthy += 1;
        }

        return summary;
      },
      {
        total: 0,
        expired: 0,
        expiringSoon: 0,
        lowStock: 0,
        outOfStock: 0,
        healthy: 0,
      },
    );

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching stock risk summary:", error);
    return res.status(500).json({
      message: "An error occurred while fetching stock risk summary.",
    });
  }
};

const getRecentReturnActivity = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const whereClause = {
      returnedStatus: "RETURNED",
      dateReturned: { [Op.not]: null },
    };

    if (startDate || endDate) {
      if (!startDate || !endDate) {
        return res.status(400).json({
          message: "Both startDate and endDate query parameters are required.",
        });
      }

      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({
          message: "Invalid startDate or endDate query parameter.",
        });
      }

      if (start > end) {
        return res.status(400).json({
          message: "startDate cannot be later than endDate.",
        });
      }

      end.setHours(23, 59, 59, 999);
      whereClause.dateReturned = {
        [Op.not]: null,
        [Op.between]: [start, end],
      };
    }

    const returns = await Dispose.findAll({
      attributes: [
        "id",
        "chemicalCode",
        "chemicalName",
        "batchNumber",
        "quantityUsed",
        "dateReturned",
        "userName",
        "stuRegisterNum",
      ],
      where: whereClause,
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: ["baseUnit"],
          required: false,
        },
      ],
      order: [["dateReturned", "DESC"]],
      limit: 6,
    });

    return res.json({
      success: true,
      activities: returns.map((item) => ({
        id: item.id,
        chemicalCode: item.chemicalCode,
        chemicalName: item.chemicalName,
        batchNumber: item.batchNumber,
        quantityUsed: Number(item.quantityUsed || 0),
        unit: item.chemical?.baseUnit || "",
        dateReturned: item.dateReturned,
        userName: item.userName,
        stuRegisterNum: item.stuRegisterNum,
      })),
    });
  } catch (error) {
    console.error("Error fetching recent return activity:", error);
    return res.status(500).json({
      message: "An error occurred while fetching recent return activity.",
    });
  }
};

const getUnassignedStock = async (req, res) => {
  try {
    const whereClause = {
      locationId: null,
      currentQuantity: { [Op.gt]: 0 },
    };

    const include = [
      {
        model: Chemical,
        as: "chemical",
        attributes: ["canonicalName", "chemicalCode", "baseUnit"],
        where: { isActive: true },
        required: true,
      },
    ];

    const [total, batches] = await Promise.all([
      Batch.count({ where: whereClause, include }),
      Batch.findAll({
        attributes: ["id", "batchNumber", "currentQuantity", "expiryDate"],
        where: whereClause,
        include,
        order: [
          ["createdAt", "DESC"],
          ["batchNumber", "ASC"],
        ],
        limit: 6,
      }),
    ]);

    return res.json({
      success: true,
      total,
      batches: batches.map((batch) => ({
        id: batch.id,
        chemicalName: batch.chemical?.canonicalName || "Unknown Chemical",
        chemicalCode: batch.chemical?.chemicalCode || "",
        batchNumber: batch.batchNumber,
        currentQuantity: Number(batch.currentQuantity || 0),
        unit: batch.chemical?.baseUnit || "",
        expiryDate: batch.expiryDate,
      })),
    });
  } catch (error) {
    console.error("Error fetching unassigned stock:", error);
    return res.status(500).json({
      message: "An error occurred while fetching unassigned stock.",
    });
  }
};

const getExpiryWatchlist = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const batches = await Batch.findAll({
      attributes: ["id", "batchNumber", "currentQuantity", "expiryDate"],
      where: {
        currentQuantity: { [Op.gt]: 0 },
        expiryDate: { [Op.not]: null },
      },
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: ["canonicalName", "chemicalCode", "baseUnit"],
          where: { isActive: true },
          required: true,
        },
        {
          model: Location,
          as: "location",
          attributes: ["name", "type"],
          required: false,
        },
      ],
      order: [["expiryDate", "ASC"]],
      limit: 8,
    });

    return res.json({
      success: true,
      watchlist: batches.map((batch) => {
        const expiry = new Date(`${batch.expiryDate}T00:00:00`);
        const daysRemaining = Number.isNaN(expiry.getTime())
          ? null
          : Math.floor(
              (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );

        return {
          id: batch.id,
          chemicalName: batch.chemical?.canonicalName || "Unknown Chemical",
          chemicalCode: batch.chemical?.chemicalCode || "",
          batchNumber: batch.batchNumber,
          currentQuantity: Number(batch.currentQuantity || 0),
          unit: batch.chemical?.baseUnit || "",
          location: batch.location
            ? `${batch.location.name}${batch.location.type ? ` (${batch.location.type})` : ""}`
            : "Unassigned",
          expiryDate: batch.expiryDate,
          daysRemaining,
          status:
            daysRemaining !== null && daysRemaining < 0
              ? "EXPIRED"
              : daysRemaining !== null && daysRemaining <= 30
                ? "EXPIRING_SOON"
                : "UPCOMING",
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching expiry watchlist:", error);
    return res.status(500).json({
      message: "An error occurred while fetching expiry watchlist.",
    });
  }
};

module.exports = {
  retriveBatchDetails,
  calculateUsageBatchvise,
  calculateUsageChemicalvise,
  getDashboardUsageTrend,
  getUsageByHazardCategory,
  getInventorySnapshot,
  getStockRiskSummary,
  getRecentReturnActivity,
  getUnassignedStock,
  getExpiryWatchlist,
};
