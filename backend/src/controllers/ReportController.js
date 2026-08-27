const { Chemical, Batch, Dispose, sequelize } = require("../models/index.js");
const { Op } = require("sequelize");
const PDFDocument = require("pdfkit");
const appConfig = require("../config/appConfig.js");

const COLOR_PRIMARY_DARK = "#0E2A20";
const COLOR_PRIMARY = "#1B4332";
const COLOR_ACCENT = "#B8873A";
const COLOR_TEXT = "#1B211D";
const COLOR_TEXT_MUTED = "#5B6660";
const COLOR_BORDER = "#E4E0D3";
const COLOR_DANGER = "#D6483F";
const COLOR_WARNING = "#D9822B";
const COLOR_SUCCESS = "#1E8A5A";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const getDaysRemaining = (expiryDate) => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const getExpiryStatus = (expiryDate) => {
  const daysRemaining = getDaysRemaining(expiryDate);
  if (daysRemaining === null) return "NO EXPIRY";
  if (daysRemaining < 0) return "EXPIRED";
  if (daysRemaining <= 30) return "EXPIRING SOON";
  return "ACTIVE";
};

const buildChemicalReportData = async (chemicalCode) => {
  const chemical = await Chemical.findOne({
    where: { chemicalCode },
    attributes: [
      "id",
      "chemicalCode",
      "canonicalName",
      "baseUnit",
      "stockDimension",
      "casNumber",
    ],
  });

  if (!chemical) {
    return null;
  }

  const batches = await Batch.findAll({
    where: { chemicalId: chemical.id },
    order: [["receivedDate", "DESC"]],
  });

  const formattedBatches = batches.map((batch) => {
    const quantityReceived = Number(batch.quantityReceived);
    const currentQuantity = Number(batch.currentQuantity);

    return {
      batchNumber: batch.batchNumber,
      receivedDate: batch.receivedDate,
      expiryDate: batch.expiryDate,
      quantityReceived,
      currentQuantity,
      quantityUsed: quantityReceived - currentQuantity,
      supplier: batch.supplier,
      daysRemaining: getDaysRemaining(batch.expiryDate),
      status: getExpiryStatus(batch.expiryDate),
    };
  });

  return {
    chemicalCode: chemical.chemicalCode,
    canonicalName: chemical.canonicalName,
    baseUnit: chemical.baseUnit,
    stockDimension: chemical.stockDimension,
    casNumber: chemical.casNumber,
    batches: formattedBatches,
  };
};
const getChemicalReport = async (req, res) => {
  try {
    const { chemicalCode } = req.params;

    const data = await buildChemicalReportData(chemicalCode);

    if (!data) {
      return res.status(404).json({ message: "Chemical not found." });
    }

    res.json(data);
  } catch (error) {
    console.error("Error building chemical report:", error);
    res.status(500).json({
      message: "An error occurred while generating the report.",
    });
  }
};

const downloadChemicalReport = async (req, res) => {
  try {
    const { chemicalCode } = req.params;

    const data = await buildChemicalReportData(chemicalCode);

    if (!data) {
      return res.status(404).json({ message: "Chemical not found." });
    }

    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${data.chemicalCode}-stock-report.pdf"`,
    );

    doc.pipe(res);

    const marginLeft = doc.page.margins.left;
    const marginTop = doc.page.margins.top;
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rowHeight = 22;

    const columns = [
      { key: "batchNumber", label: "Batch Number", width: 68 },
      { key: "receivedDate", label: "Received", width: 62 },
      { key: "expiryDate", label: "Expiry", width: 62 },
      { key: "quantityReceived", label: "Start Qty", width: 60 },
      { key: "currentQuantity", label: "Current Qty", width: 65 },
      { key: "daysRemaining", label: "Days Left", width: 55 },
      { key: "status", label: "Status", width: 78 },
      {
        key: "supplier",
        label: "Supplier",
        width: pageWidth - (68 + 62 + 62 + 60 + 65 + 55 + 78),
      },
    ];

    const statusColor = (status) => {
      if (status === "EXPIRED") return COLOR_DANGER;
      if (status === "EXPIRING SOON") return COLOR_WARNING;
      if (status === "ACTIVE") return COLOR_SUCCESS;
      return COLOR_TEXT_MUTED;
    };

    const drawFullHeader = () => {
      const bannerHeight = 58;
      const bannerY = marginTop;

      doc
        .rect(marginLeft, bannerY, pageWidth, bannerHeight)
        .fill(COLOR_PRIMARY_DARK);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(appConfig.appName, marginLeft + 16, bannerY + 10);

      doc
        .fillColor(COLOR_ACCENT)
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          "FACULTY LABORATORY CHEMICAL MANAGEMENT SYSTEM",
          marginLeft + 16,
          bannerY + 26,
        );

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Chemical Stock Report", marginLeft + 16, bannerY + 39);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica")
        .fontSize(8)
        .text(
          `Generated ${new Date().toLocaleString("en-GB")}`,
          marginLeft,
          bannerY + 39,
          { width: pageWidth - 16, align: "right" },
        );

      const cardY = bannerY + bannerHeight + 16;
      const cardHeight = 54;

      doc
        .rect(marginLeft, cardY, pageWidth, cardHeight)
        .fillAndStroke("#F3F0E8", COLOR_BORDER);

      doc
        .fillColor(COLOR_TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text("CHEMICAL", marginLeft + 14, cardY + 10);

      doc
        .fillColor(COLOR_TEXT)
        .font("Helvetica-Bold")
        .fontSize(15)
        .text(data.canonicalName, marginLeft + 14, cardY + 20, {
          width: pageWidth * 0.6,
          ellipsis: true,
        });

      doc
        .fillColor(COLOR_TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text("CHEMICAL CODE", marginLeft + pageWidth * 0.62, cardY + 10);

      doc
        .fillColor(COLOR_PRIMARY)
        .font("Helvetica-Bold")
        .fontSize(15)
        .text(data.chemicalCode, marginLeft + pageWidth * 0.62, cardY + 20);

      doc
        .fillColor(COLOR_TEXT_MUTED)
        .font("Helvetica")
        .fontSize(8)
        .text(
          `Base Unit: ${data.baseUnit}    |    Stock Type: ${data.stockDimension}    |    CAS: ${
            data.casNumber || "—"
          }    |     Count of Batches: ${data.batches.length}`,
          marginLeft + 14,
          cardY + cardHeight - 16,
        );

      doc.y = cardY + cardHeight + 18;
    };

    const drawCompactHeader = () => {
      const bannerHeight = 28;
      const bannerY = marginTop;

      doc
        .rect(marginLeft, bannerY, pageWidth, bannerHeight)
        .fill(COLOR_PRIMARY_DARK);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(
          `${appConfig.appName}  ·  ${data.canonicalName} (${data.chemicalCode})`,
          marginLeft + 14,
          bannerY + 9,
          { width: pageWidth * 0.7 },
        );

      doc
        .fillColor(COLOR_ACCENT)
        .font("Helvetica")
        .fontSize(8)
        .text("Chemical Stock Report (cont.)", marginLeft, bannerY + 9, {
          width: pageWidth - 14,
          align: "right",
        });

      doc.y = bannerY + bannerHeight + 14;
    };

    const drawTableHeader = (y) => {
      doc.rect(marginLeft, y, pageWidth, rowHeight).fill(COLOR_PRIMARY);
      let x = marginLeft;
      doc.fillColor("#FFFFFF").fontSize(8).font("Helvetica-Bold");
      columns.forEach((col) => {
        doc.text(col.label, x + 4, y + 7, { width: col.width - 8 });
        x += col.width;
      });
      return y + rowHeight;
    };

    let cursorY;

    doc.on("pageAdded", () => {
      drawCompactHeader();
      cursorY = drawTableHeader(doc.y);
    });

    drawFullHeader();
    cursorY = drawTableHeader(doc.y);

    if (data.batches.length === 0) {
      doc
        .fillColor(COLOR_TEXT_MUTED)
        .fontSize(9)
        .font("Helvetica-Oblique")
        .text(
          "No batches recorded for this chemical.",
          marginLeft + 4,
          cursorY + 10,
        );
    }

    data.batches.forEach((batch, index) => {
      if (
        cursorY + rowHeight >
        doc.page.height - doc.page.margins.bottom - 20
      ) {
        doc.addPage();
      }

      if (index % 2 === 0) {
        doc.rect(marginLeft, cursorY, pageWidth, rowHeight).fill("#F8F6F0");
      }

      const rowValues = {
        batchNumber: batch.batchNumber,
        receivedDate: formatDate(batch.receivedDate),
        expiryDate: formatDate(batch.expiryDate),
        quantityReceived: `${batch.quantityReceived}${data.baseUnit}`,
        currentQuantity: `${batch.currentQuantity}${data.baseUnit}`,
        daysRemaining:
          batch.daysRemaining === null ? "—" : `${batch.daysRemaining}d`,
        status: batch.status,
        supplier: batch.supplier || "—",
      };

      let x = marginLeft;
      columns.forEach((col) => {
        doc.fontSize(8);
        doc.font(col.key === "status" ? "Helvetica-Bold" : "Helvetica");
        doc.fillColor(
          col.key === "status" ? statusColor(batch.status) : COLOR_TEXT,
        );
        doc.text(String(rowValues[col.key]), x + 4, cursorY + 7, {
          width: col.width - 8,
          ellipsis: true,
        });
        x += col.width;
      });

      cursorY += rowHeight;
    });

    // ========== ADD SUMMARY SECTION HERE ==========

    // Calculate totals
    let totalAvailable = 0;
    let totalExpired = 0;

    data.batches.forEach((batch) => {
      if (batch.status === "EXPIRED") {
        totalExpired += batch.currentQuantity;
      } else {
        totalAvailable += batch.currentQuantity;
      }
    });

    // Add some spacing before summary
    cursorY += 16;

    // Check if we need a new page for summary
    const summaryHeight = 70;
    if (
      cursorY + summaryHeight >
      doc.page.height - doc.page.margins.bottom - 20
    ) {
      doc.addPage();
    }

    // Draw summary section background
    doc
      .rect(marginLeft, cursorY, pageWidth, summaryHeight)
      .fillAndStroke("#F3F0E8", COLOR_BORDER);

    // Summary title
    doc
      .fillColor(COLOR_TEXT_MUTED)
      .font("Helvetica-Bold")
      .fontSize(7)
      .text("STOCK SUMMARY", marginLeft + 14, cursorY + 10);

    // Total Available Quantity
    doc
      .fillColor(COLOR_TEXT_MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text("Total Available Quantity:", marginLeft + 14, cursorY + 26);

    doc
      .fillColor(COLOR_SUCCESS)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(
        `${totalAvailable.toFixed(2)} ${data.baseUnit}`,
        marginLeft + 14,
        cursorY + 38,
      );

    // Total Expired Quantity
    doc
      .fillColor(COLOR_TEXT_MUTED)
      .font("Helvetica")
      .fontSize(8)
      .text(
        "Total Expired Quantity:",
        marginLeft + pageWidth * 0.5,
        cursorY + 26,
      );

    doc
      .fillColor(COLOR_DANGER)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(
        `${totalExpired.toFixed(2)} ${data.baseUnit}`,
        marginLeft + pageWidth * 0.5,
        cursorY + 38,
      );

    cursorY += summaryHeight;

    // ========== END SUMMARY SECTION ==========

    // Footer on every page
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(7)
        .fillColor(COLOR_TEXT_MUTED)
        .font("Helvetica")
        .text(
          `Page ${i + 1} of ${range.count}   ·   Generated by ${appConfig.appName} — reflects stock levels at time of export.`,
          marginLeft,
          doc.page.height - doc.page.margins.bottom - 14,
          { width: pageWidth, align: "center", lineBreak: false },
        );
    }

    doc.end();
  } catch (error) {
    console.error("Error generating chemical report PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "An error occurred while generating the PDF report.",
      });
    }
  }
};

const buildUsageReportData = async (startDate, endDate) => {
  // Include end-of-day for endDate so the full day is captured
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const records = await Dispose.findAll({
    where: {
      dateReleased: {
        [Op.between]: [new Date(startDate), endOfDay],
      },
    },
    include: [
      {
        model: Chemical,
        as: "chemical",
        attributes: ["baseUnit", "binCardNumber"],
      },
    ],
    order: [["dateReleased", "DESC"]],
    attributes: [
      "id",
      "chemicalCode",
      "chemicalName",
      "batchNumber",
      "quantityUsed",
      "dateReleased",
      "dateReturned",
      "purpose",
      "userName",
      "stuRegisterNum",
      "returnedStatus",
      "remark",
    ],
  });

  return records.map((r) => ({
    id: r.id,
    chemicalCode: r.chemicalCode,
    binCardNumber: r.chemical ? r.chemical.binCardNumber : r.chemicalCode,
    chemicalName: r.chemicalName,
    batchNumber: r.batchNumber,
    quantityUsed: r.quantityUsed !== null ? Number(r.quantityUsed) : null,
    baseUnit: r.chemical ? r.chemical.baseUnit : "",
    dateReleased: r.dateReleased,
    dateReturned: r.dateReturned,
    purpose: r.purpose,
    userName: r.userName,
    stuRegisterNum: r.stuRegisterNum,
    returnedStatus: r.returnedStatus,
    remark: r.remark,
  }));
};

const getUsageReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required.",
      });
    }

    const records = await buildUsageReportData(startDate, endDate);
    res.json({ records });
  } catch (error) {
    console.error("Error building usage report:", error);
    res.status(500).json({
      message: "An error occurred while generating the usage report.",
    });
  }
};

const downloadUsageReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required.",
      });
    }

    const records = await buildUsageReportData(startDate, endDate);

    // ── Landscape A4 ──────────────────────────────────────────────────────────
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 20,
      bufferPages: true,
    });

    const friendlyStart = formatDate(startDate);
    const friendlyEnd = formatDate(endDate);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="usage-report-${startDate}-to-${endDate}.pdf"`,
    );

    doc.pipe(res);

    const marginLeft = doc.page.margins.left;
    const marginTop = doc.page.margins.top;
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    // A4 landscape inner width ≈ 801 pt  (841 – 20 – 20)

    const PURPOSE_COL_WIDTH = 110; // fixed width for Purpose column
    const REMARK_COL_WIDTH = 110; // fixed width for Remark column
    const HEADER_ROW_H = 20; // table-header row height
    const FONT_SIZE = 7.5;
    const LINE_H = FONT_SIZE * 1.3; // ≈9.75 pt per line
    const MAX_PURPOSE_LINES = 2;
    const ROW_PAD = 5; // vertical padding (top + bottom)
    const BASE_ROW_HEIGHT = Math.ceil(MAX_PURPOSE_LINES * LINE_H + ROW_PAD * 2); // ≈30 pt

    // Column definitions — total must equal pageWidth
    // Remaining width after Purpose + Remark = 801 – 110 – 110 = 581; distribute among 8 cols:
    //   75 + 115 + 65 + 75 + 52 + 50 + 60 + 89 = 581
    const columns = [
      { key: "binCardNumber", label: "Bin Card No.", width: 75 },
      { key: "chemicalName", label: "Chemical", width: 115 },
      { key: "batchNumber", label: "Batch No.", width: 65 },
      { key: "stuRegisterNum", label: "Released TG.No.", width: 75 },
      { key: "quantityUsed", label: "Qty Used", width: 52 },
      { key: "returnedStatus", label: "Status", width: 50 },
      { key: "dateReleased", label: "Released", width: 60 },
      {
        key: "dateReturned",
        label: "Returned",
        width:
          pageWidth -
          PURPOSE_COL_WIDTH -
          REMARK_COL_WIDTH -
          (75 + 115 + 65 + 75 + 52 + 50 + 60),
      },
      { key: "purpose", label: "Purpose", width: PURPOSE_COL_WIDTH },
      { key: "remark", label: "Remark", width: REMARK_COL_WIDTH },
    ];

    const statusColor = (status) => {
      if (status === "RETURNED") return COLOR_SUCCESS;
      if (status === "RELEASED") return COLOR_WARNING;
      return COLOR_TEXT_MUTED;
    };

    // ── Full page-1 header ────────────────────────────────────────────────────
    const drawUsageFullHeader = () => {
      const bannerHeight = 50;
      const bannerY = marginTop;

      doc
        .rect(marginLeft, bannerY, pageWidth, bannerHeight)
        .fill(COLOR_PRIMARY_DARK);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(appConfig.appName, marginLeft + 16, bannerY + 8);

      doc
        .fillColor(COLOR_ACCENT)
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          "FACULTY LABORATORY CHEMICAL MANAGEMENT SYSTEM",
          marginLeft + 16,
          bannerY + 23,
        );

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Chemical Usage Report", marginLeft + 16, bannerY + 35);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica")
        .fontSize(8)
        .text(
          `Generated ${new Date().toLocaleString("en-GB")}`,
          marginLeft,
          bannerY + 8,
          { width: pageWidth - 16, align: "right" },
        );

      // Date-range info card
      const cardY = bannerY + bannerHeight + 12;
      const cardH = 36;
      doc
        .rect(marginLeft, cardY, pageWidth, cardH)
        .fillAndStroke("#F3F0E8", COLOR_BORDER);

      doc
        .fillColor(COLOR_TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text("PERIOD", marginLeft + 14, cardY + 7);
      doc
        .fillColor(COLOR_TEXT)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(
          `${friendlyStart}  —  ${friendlyEnd}`,
          marginLeft + 14,
          cardY + 16,
        );

      doc
        .fillColor(COLOR_TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text("TOTAL RECORDS", marginLeft + pageWidth * 0.55, cardY + 7);
      doc
        .fillColor(COLOR_PRIMARY)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(
          String(records.length),
          marginLeft + pageWidth * 0.55,
          cardY + 16,
        );

      doc.y = cardY + cardH + 14;
    };

    // ── Compact running header (subsequent pages) ─────────────────────────────
    const drawUsageCompactHeader = () => {
      const bannerH = 26;
      const bannerY = marginTop;

      doc
        .rect(marginLeft, bannerY, pageWidth, bannerH)
        .fill(COLOR_PRIMARY_DARK);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(
          `${appConfig.appName}  ·  Usage Report  (${friendlyStart} — ${friendlyEnd})`,
          marginLeft + 14,
          bannerY + 8,
          { width: pageWidth * 0.7 },
        );

      doc
        .fillColor(COLOR_ACCENT)
        .font("Helvetica")
        .fontSize(8)
        .text("Chemical Usage Report (cont.)", marginLeft, bannerY + 8, {
          width: pageWidth - 14,
          align: "right",
        });

      doc.y = bannerY + bannerH + 12;
    };

    // ── Table-column header row ───────────────────────────────────────────────
    const drawUsageTableHeader = (y) => {
      doc.rect(marginLeft, y, pageWidth, HEADER_ROW_H).fill(COLOR_PRIMARY);
      let x = marginLeft;
      doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
      columns.forEach((col) => {
        doc.text(col.label, x + 4, y + 6, {
          width: col.width - 8,
          lineBreak: false,
        });
        x += col.width;
      });
      return y + HEADER_ROW_H;
    };

    let cursorY;

    doc.on("pageAdded", () => {
      drawUsageCompactHeader();
      cursorY = drawUsageTableHeader(doc.y);
    });

    // Page 1
    drawUsageFullHeader();
    cursorY = drawUsageTableHeader(doc.y);

    if (records.length === 0) {
      doc
        .fillColor(COLOR_TEXT_MUTED)
        .fontSize(9)
        .font("Helvetica-Oblique")
        .text(
          "No usage records found for this period.",
          marginLeft + 4,
          cursorY + 10,
        );
    }

    records.forEach((record, index) => {
      const rowHeight = BASE_ROW_HEIGHT;

      if (
        cursorY + rowHeight >
        doc.page.height - doc.page.margins.bottom - 20
      ) {
        doc.addPage();
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc.rect(marginLeft, cursorY, pageWidth, rowHeight).fill("#F8F6F0");
      }

      const rowValues = {
        binCardNumber: record.binCardNumber || "—",
        chemicalName: record.chemicalName || "—",
        batchNumber: record.batchNumber || "—",
        stuRegisterNum: record.stuRegisterNum || "—",
        quantityUsed:
          record.quantityUsed != null
            ? `${Number(record.quantityUsed).toFixed(2)}${record.baseUnit || ""}`
            : "—",
        returnedStatus: record.returnedStatus || "—",
        dateReleased: formatDate(record.dateReleased),
        dateReturned: record.dateReturned
          ? formatDate(record.dateReturned)
          : "—",
        purpose: record.purpose || "—",
        remark: record.remark || "—",
      };

      const textY = cursorY + ROW_PAD;

      let x = marginLeft;
      columns.forEach((col) => {
        doc.fontSize(FONT_SIZE);
        doc.font(col.key === "returnedStatus" ? "Helvetica-Bold" : "Helvetica");
        doc.fillColor(
          col.key === "returnedStatus"
            ? statusColor(record.returnedStatus)
            : COLOR_TEXT,
        );

        if (col.key === "purpose" || col.key === "remark") {
          // Fixed 2-row height — text is clipped to that height
          doc.text(String(rowValues[col.key]), x + 4, textY, {
            width: col.width - 8,
            height: MAX_PURPOSE_LINES * LINE_H,
            lineBreak: true,
            ellipsis: true,
          });
        } else {
          doc.text(String(rowValues[col.key]), x + 4, textY, {
            width: col.width - 8,
            lineBreak: false,
            ellipsis: true,
          });
        }

        x += col.width;
      });

      cursorY += rowHeight;
    });

    // ── Page-number footer ────────────────────────────────────────────────────
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(7)
        .fillColor(COLOR_TEXT_MUTED)
        .font("Helvetica")
        .text(
          `Page ${i + 1} of ${range.count}   ·   Generated by ${appConfig.appName} — Usage data for period ${friendlyStart} to ${friendlyEnd}.`,
          marginLeft,
          doc.page.height - doc.page.margins.bottom - 14,
          { width: pageWidth, align: "center", lineBreak: false },
        );
    }

    doc.end();
  } catch (error) {
    console.error("Error generating usage report PDF:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message: "An error occurred while generating the PDF report.",
      });
    }
  }
};

const downloadFullInventoryReport = async (req, res) => {
  try {
    const chemicals = await Chemical.findAll({
      attributes: [
        "id",
        "chemicalCode",
        "canonicalName",
        "baseUnit",
        "stockDimension",
        "casNumber",
      ],
      include: [
        {
          model: Batch,
          as: "batches",
        },
      ],
      order: [
        ["canonicalName", "ASC"],
        [{ model: Batch, as: "batches" }, "receivedDate", "DESC"],
      ],
    });

    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="full-inventory-report.pdf"',
    );

    doc.pipe(res);

    const marginLeft = doc.page.margins.left;
    const marginTop = doc.page.margins.top;
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const rowHeight = 20;

    const columns = [
      { key: "batchNumber", label: "Batch Number", width: 90 },
      { key: "receivedDate", label: "Received Date", width: 75 },
      { key: "expiryDate", label: "Expiry Date", width: 75 },
      { key: "quantityReceived", label: "Start Qty", width: 75 },
      { key: "currentQuantity", label: "Remaining Qty", width: 75 },
      { key: "daysRemaining", label: "Days Left", width: pageWidth - 390 },
    ];

    // Banner draw helper
    const drawInventoryFullHeader = () => {
      const bannerHeight = 58;
      const bannerY = marginTop;

      doc
        .rect(marginLeft, bannerY, pageWidth, bannerHeight)
        .fill(COLOR_PRIMARY_DARK);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(appConfig.appName, marginLeft + 16, bannerY + 10);

      doc
        .fillColor(COLOR_ACCENT)
        .font("Helvetica")
        .fontSize(7.5)
        .text(
          "FACULTY LABORATORY CHEMICAL MANAGEMENT SYSTEM",
          marginLeft + 16,
          bannerY + 26,
        );

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Full Inventory Status Report", marginLeft + 16, bannerY + 39);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica")
        .fontSize(8)
        .text(
          `Generated ${new Date().toLocaleString("en-GB")}`,
          marginLeft,
          bannerY + 10,
          { width: pageWidth - 16, align: "right" },
        );

      // Inventory Summary Card
      const cardY = bannerY + bannerHeight + 16;
      const cardHeight = 40;
      doc
        .rect(marginLeft, cardY, pageWidth, cardHeight)
        .fillAndStroke("#F3F0E8", COLOR_BORDER);

      doc
        .fillColor(COLOR_TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text("TOTAL UNIQUE CHEMICALS", marginLeft + 14, cardY + 8);

      doc
        .fillColor(COLOR_TEXT)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(String(chemicals.length), marginLeft + 14, cardY + 17);

      // Count batches
      let totalBatches = 0;
      chemicals.forEach((c) => {
        if (c.batches) totalBatches += c.batches.length;
      });

      doc
        .fillColor(COLOR_TEXT_MUTED)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text(
          "TOTAL BATCHES IN SYSTEM",
          marginLeft + pageWidth * 0.5,
          cardY + 8,
        );

      doc
        .fillColor(COLOR_PRIMARY)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(String(totalBatches), marginLeft + pageWidth * 0.5, cardY + 17);

      doc.y = cardY + cardHeight + 20;
    };

    const drawInventoryCompactHeader = () => {
      const bannerHeight = 28;
      const bannerY = marginTop;

      doc
        .rect(marginLeft, bannerY, pageWidth, bannerHeight)
        .fill(COLOR_PRIMARY_DARK);

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(
          `${appConfig.appName}  ·  Full Inventory Status Report`,
          marginLeft + 14,
          bannerY + 9,
          { width: pageWidth * 0.7 },
        );

      doc
        .fillColor(COLOR_ACCENT)
        .font("Helvetica")
        .fontSize(8)
        .text("Chemical Inventory (cont.)", marginLeft, bannerY + 9, {
          width: pageWidth - 14,
          align: "right",
        });

      doc.y = bannerY + bannerHeight + 14;
    };

    // Compact running header setup
    doc.on("pageAdded", () => {
      drawInventoryCompactHeader();
    });

    drawInventoryFullHeader();

    let cursorY = doc.y;

    chemicals.forEach((chemical) => {
      // Calculate sum of remaining quantity
      const totalRemaining = (chemical.batches || []).reduce(
        (sum, b) => sum + Number(b.currentQuantity || 0),
        0,
      );

      // Estimate the height of this chemical block
      // Header height: ~45pt. Each batch row: 20pt. Space below: 15pt.
      const batchCount = chemical.batches ? chemical.batches.length : 0;
      const estimatedHeight =
        45 + (batchCount > 0 ? (batchCount + 1) * rowHeight : 20) + 15;

      if (
        cursorY + estimatedHeight >
        doc.page.height - doc.page.margins.bottom
      ) {
        doc.addPage();
        cursorY = doc.y;
      }

      // Draw Chemical Card Section Header
      doc.rect(marginLeft, cursorY, pageWidth, 28).fill("#E7EFEA");
      doc.rect(marginLeft, cursorY, pageWidth, 28).stroke(COLOR_BORDER);

      // Chemical canonicalName + code
      doc
        .fillColor(COLOR_PRIMARY_DARK)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text(
          `${chemical.canonicalName} (${chemical.chemicalCode})`,
          marginLeft + 10,
          cursorY + 9,
          {
            width: pageWidth * 0.65,
            ellipsis: true,
          },
        );

      // Total Available/Remaining Qty on the right
      doc
        .fillColor(COLOR_TEXT)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(
          `Total Qty: ${totalRemaining.toFixed(2)} ${chemical.baseUnit}`,
          marginLeft,
          cursorY + 9,
          { width: pageWidth - 10, align: "right" },
        );

      cursorY += 28;

      if (!chemical.batches || chemical.batches.length === 0) {
        // No batches details
        cursorY += 6;
        doc
          .fillColor(COLOR_TEXT_MUTED)
          .font("Helvetica-Oblique")
          .fontSize(8.5)
          .text("No batch details in the system", marginLeft + 10, cursorY);
        cursorY += 15;
      } else {
        // Draw Batch Table Headers
        cursorY += 6;
        doc.rect(marginLeft, cursorY, pageWidth, rowHeight).fill(COLOR_PRIMARY);
        let tx = marginLeft;
        doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
        columns.forEach((col) => {
          doc.text(col.label, tx + 4, cursorY + 6, { width: col.width - 8 });
          tx += col.width;
        });

        cursorY += rowHeight;

        // Draw Batch Rows
        chemical.batches.forEach((batch, bIdx) => {
          if (bIdx % 2 === 1) {
            doc.rect(marginLeft, cursorY, pageWidth, rowHeight).fill("#F8F6F0");
          }

          const daysLeft = getDaysRemaining(batch.expiryDate);
          let friendlyDaysLeft = "—";
          if (daysLeft !== null) {
            if (daysLeft < 0) {
              friendlyDaysLeft = `Expired (${Math.abs(daysLeft)} days)`;
            } else if (daysLeft === 0) {
              friendlyDaysLeft = "Expires today";
            } else {
              friendlyDaysLeft = `${daysLeft} days`;
            }
          }

          const rowValues = {
            batchNumber: batch.batchNumber,
            receivedDate: formatDate(batch.receivedDate),
            expiryDate: formatDate(batch.expiryDate),
            quantityReceived: `${Number(batch.quantityReceived).toFixed(2)} ${chemical.baseUnit}`,
            currentQuantity: `${Number(batch.currentQuantity).toFixed(2)} ${chemical.baseUnit}`,
            daysRemaining: friendlyDaysLeft,
          };

          let bx = marginLeft;
          columns.forEach((col) => {
            doc.fontSize(7.5);
            doc.font("Helvetica");

            // Set alert colors for days left
            if (col.key === "daysRemaining" && daysLeft !== null) {
              if (daysLeft < 0) {
                doc.fillColor(COLOR_DANGER).font("Helvetica-Bold");
              } else if (daysLeft <= 30) {
                doc.fillColor(COLOR_WARNING).font("Helvetica-Bold");
              } else {
                doc.fillColor(COLOR_SUCCESS).font("Helvetica-Bold");
              }
            } else {
              doc.fillColor(COLOR_TEXT);
            }

            doc.text(String(rowValues[col.key]), bx + 4, cursorY + 6, {
              width: col.width - 8,
              ellipsis: true,
            });
            bx += col.width;
          });

          cursorY += rowHeight;
        });

        cursorY += 10; // separation space between chemicals
      }

      // Sync doc.y
      doc.y = cursorY;
    });

    // Add Page Number Footer dynamically
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(7)
        .fillColor(COLOR_TEXT_MUTED)
        .font("Helvetica")
        .text(
          `Page ${i + 1} of ${range.count}   ·   ${appConfig.appName} — Faculty Laboratory Chemical Management System`,
          marginLeft,
          doc.page.height - doc.page.margins.bottom - 14,
          { width: pageWidth, align: "center", lineBreak: false },
        );
    }

    doc.end();
  } catch (error) {
    console.error("Error generating full inventory report:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message:
          "An error occurred while generating the full inventory report.",
      });
    }
  }
};

const getUsageTrend = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required.",
      });
    }

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const trendData = await Dispose.findAll({
      attributes: [
        [
          sequelize.fn("date_trunc", "day", sequelize.col("date_released")),
          "date",
        ],
        [sequelize.fn("COUNT", sequelize.col("id")), "usageCount"],
      ],
      where: {
        dateReleased: {
          [Op.between]: [new Date(startDate), endOfDay],
        },
      },
      group: [
        sequelize.fn("date_trunc", "day", sequelize.col("date_released")),
      ],
      order: [
        [
          sequelize.fn("date_trunc", "day", sequelize.col("date_released")),
          "ASC",
        ],
      ],
      raw: true,
    });

    res.json({ success: true, trend: trendData });
  } catch (error) {
    console.error("Error fetching usage trend data:", error);
    res.status(500).json({
      message: "An error occurred while generating the usage trend data.",
    });
  }
};

module.exports = {
  getChemicalReport,
  downloadChemicalReport,
  getUsageReport,
  downloadUsageReport,
  downloadFullInventoryReport,
  getUsageTrend,
};
