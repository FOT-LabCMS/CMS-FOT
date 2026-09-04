const { Dispose } = require("../models/index.js");
const { Chemical } = require("../models/index.js");
const { Batch } = require("../models/index.js");
const { Op } = require("sequelize");
const { logAction } = require("../services/auditLogService.js");
const { notifyLowStockBatch } = require("../services/notificationService.js");

const createreleaserecord = async (req, res) => {
  const {
    binCardNumber,
    stuRegisterNum,
    userName,
    batchNumber,
    dateReleased,
    purpose,
    remark,
    supervisorName,
  } = req.body;
  if (
    !binCardNumber ||
    !batchNumber ||
    !dateReleased ||
    !purpose ||
    !stuRegisterNum ||
    !userName ||
    !supervisorName
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const chemical = await Chemical.findOne({
      where: { binCardNumber: binCardNumber },
    });
    if (!chemical) {
      return res.status(404).json({ message: "Chemical not found" });
    }
    const batch = await Batch.findOne({
      where: { batchNumber: batchNumber },
    });
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }
    const dispose = await Dispose.create({
      binCardNumber: binCardNumber,
      chemicalName: chemical.canonicalName,
      batchNumber: batchNumber,
      dateReleased: dateReleased,
      purpose: purpose,
      stuRegisterNum: stuRegisterNum,
      userName: userName,
      supervisorName: supervisorName,
      remark: remark,
    });

    // Audit Log: Chemical Released
    await logAction({
      userId: req.user.id,
      userName: req.user.fullName,
      actionType: "RELEASE_CHEMICAL",
      entityType: "Dispose",
      entityId: dispose.id,
      details: {
        binCardNumber: dispose.binCardNumber,
        batchNumber: dispose.batchNumber,
        purpose: dispose.purpose,
      },
      ipAddress: req.ip,
    });
    res
      .status(201)
      .json({ message: "Release record created successfully", dispose });
  } catch (error) {
    console.error("Error creating release record:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const updateqty = async (req, res) => {
  const { id } = req.params;
  const { usageQty, returnDate, inputUnit, remark } = req.body;

  if (!usageQty || !returnDate) {
    return res
      .status(400)
      .json({ message: "Quantity used and return date are required" });
  }

  try {
    const dispose = await Dispose.findByPk(id);
    if (!dispose) {
      return res.status(404).json({ message: "Dispose record not found" });
    }

    const batch = await Batch.findOne({
      where: { batchNumber: dispose.batchNumber },
    });
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // --- Density Conversion ---
    // If user entered mass (g) but batch is tracked by volume, convert using density.
    let volumeToDeduct = Number(usageQty);
    let conversionNote = null;

    if (inputUnit === "g") {
      const chemical = await Chemical.findOne({
        where: { binCardNumber: dispose.binCardNumber },
        attributes: ["densityValue", "densityUnit", "stockDimension"],
      });

      if (
        chemical &&
        chemical.stockDimension === "VOLUME" &&
        chemical.densityValue &&
        Number(chemical.densityValue) > 0
      ) {
        volumeToDeduct = Number(usageQty) / Number(chemical.densityValue);
        conversionNote = `${usageQty} g converted to ${volumeToDeduct.toFixed(4)} ${chemical.densityUnit || "volume units"} using density ${chemical.densityValue}`;
      } else {
        conversionNote = "Density not available; treated input as native unit.";
      }
    }

    if (volumeToDeduct > Number(batch.currentQuantity)) {
      return res.status(400).json({
        message: `Quantity used (${volumeToDeduct.toFixed(4)}) exceeds current stock (${batch.currentQuantity})`,
      });
    }

    dispose.quantityUsed = parseFloat(volumeToDeduct.toFixed(4));
    dispose.dateReturned = returnDate;
    dispose.returnedStatus = "RETURNED";
    if (remark !== undefined) dispose.remark = remark;
    await dispose.save();

    batch.currentQuantity = parseFloat(
      (Number(batch.currentQuantity) - volumeToDeduct).toFixed(4),
    );
    await batch.save();
    await notifyLowStockBatch(batch.id);

    // Audit Log: Chemical Returned
    await logAction({
      userId: req.user.id,
      userName: req.user.fullName,
      actionType: "RETURN_CHEMICAL",
      entityType: "Dispose",
      entityId: dispose.id,
      details: {
        binCardNumber: dispose.binCardNumber,
        batchNumber: dispose.batchNumber,
        quantityUsed: dispose.quantityUsed,
        stockDeducted: volumeToDeduct.toFixed(4),
        conversionNote: conversionNote,
      },
      ipAddress: req.ip,
    });

    res.json({
      message: "Quantity updated and stock deducted successfully",
      dispose,
      updatedStock: batch.currentQuantity,
      conversionNote,
    });
  } catch (error) {
    console.error("Error updating quantity:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const viewreturnedchemicals = async (req, res) => {
  try {
    const returnedChemicals = await Dispose.findAll({
      where: { returnedStatus: "RETURNED" },
    });
    if (returnedChemicals.length === 0) {
      return res.status(404).json({ message: "No returned chemicals found" });
    }
    res.json({ returnedChemicals });
  } catch (error) {
    console.error("Error fetching returned chemicals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const viewnotreturnedchemicals = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const isPaginated = page !== undefined && limit !== undefined;

    const where = { returnedStatus: "RELEASED" };
    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      where[Op.or] = [
        { chemicalName: { [Op.iLike]: term } },
        { batchNumber: { [Op.iLike]: term } },
        { binCardNumber: { [Op.iLike]: term } },
        { userName: { [Op.iLike]: term } },
        { stuRegisterNum: { [Op.iLike]: term } },
      ];
    }

    const include = [
      {
        model: Chemical,
        as: "chemical",
        attributes: [
          "densityValue",
          "densityUnit",
          "stockDimension",
          "physicalState",
          "baseUnit",
        ],
      },
    ];

    if (isPaginated) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 5));
      const offset = (pageNum - 1) * limitNum;

      const { count, rows } = await Dispose.findAndCountAll({
        where,
        include,
        distinct: true,
        order: [["dateReleased", "DESC"]],
        offset,
        limit: limitNum,
      });

      return res.json({
        notReturnedChemicals: rows,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.max(1, Math.ceil(count / limitNum)),
        },
      });
    }

    const notReturnedChemicals = await Dispose.findAll({
      where,
      include,
      order: [["dateReleased", "DESC"]],
    });
    if (notReturnedChemicals.length === 0) {
      return res
        .status(404)
        .json({ message: "No not returned chemicals found" });
    }
    res.json({ notReturnedChemicals });
  } catch (error) {
    console.error("Error fetching not returned chemicals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getformdata = async (req, res) => {
  try {
    const chemicals = await Chemical.findAll({
      attributes: ["id", "binCardNumber", "canonicalName"],
      order: [["binCardNumber", "ASC"]],
    });
    res.json({ chemicals });
  } catch (error) {
    console.error("Error fetching form data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const getbatchbychemicalid = async (req, res) => {
  try {
    const { binCardNumber } = req.params;

    const chemical = await Chemical.findOne({
      where: { binCardNumber: binCardNumber },
    });

    if (!chemical) {
      return res.status(404).json({ message: "Chemical not found" });
    }
    const today = new Date().toISOString().split("T")[0];

    // Batches that are currently out (released and not yet returned) must not
    // be shown as available for a new request. A batch is out when it has at
    // least one Dispose record with returnedStatus = 'RELEASED'.
    const releasedBatchNumbers = (
      await Dispose.findAll({
        where: { returnedStatus: "RELEASED" },
        attributes: ["batchNumber"],
        raw: true,
      })
    ).map((record) => record.batchNumber);

    const batches = await Batch.findAll({
      where: {
        chemicalId: chemical.id,
        [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gte]: today } }],
        ...(releasedBatchNumbers.length > 0
          ? { batchNumber: { [Op.notIn]: releasedBatchNumbers } }
          : {}),
      },
      attributes: ["batchNumber", "expiryDate", "currentQuantity"],
      include: [
        {
          model: Chemical,
          as: "chemical",
          attributes: ["baseUnit"],
        },
      ],
      order: [["batchNumber", "ASC"]],
    });
    if (batches.length === 0) {
      return res.json({
        batches: [],
        message:
          "No batches are currently available for this chemical (all available batches are expired or currently out on release).",
      });
    }
    res.json({ batches, message: null });
  } catch (error) {
    console.error("Error fetching batches by chemical ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createreleaserecord,
  updateqty,
  viewreturnedchemicals,
  viewnotreturnedchemicals,
  getformdata,
  getbatchbychemicalid,
};
