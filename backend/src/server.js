const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env.${NODE_ENV} file
const nodeEnv = process.env.NODE_ENV || "development";
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`) });

const express = require("express");
const cors = require("cors");
const sequelize = require("./database/db.js");
const db = require("./models/index.js");

const userRoutes = require("./routes/UserRoute.js");
const chemicalRoutes = require("./routes/ChemicalRoute.js");
const locationRoutes = require("./routes/LocationRoute.js");
const batchRoutes = require("./routes/BatchRoute.js");
const disposeRoutes = require("./routes/DisposeRoute.js");
const auditLogRoutes = require("./routes/AuditLogRoute.js");
const usageRoutes = require("./routes/UsageRoute.js");
const notificationRoutes = require("./routes/NotificationRoute.js");
const reportRoutes = require("./routes/ReportRoute.js");
const instrumentRoutes = require("./routes/InstrumentRoute.js");
const {
  notifyExpiredBatches,
  notifyExpiringBatches,
  notifyLowStockBatches,
} = require("./services/notificationService.js");

const { verifyEmailConnection } = require("./services/emailService.js");

const {
  getUploadsRoot,
  getSdsUploadDir,
  getImageUploadDir,
  getInstrumentUploadDir,
} = require("./services/storageService.js");

const app = express();
const PORT = process.env.PORT || 5001;

// Trust the first proxy in front of the app (e.g., Render's load balancer)
// This is necessary to get the correct client IP address from req.ip
app.set("trust proxy", 1);

// Define a whitelist of allowed origins
const allowedOrigins = [
  "http://localhost:5173", // Your local frontend
  "https://fotcms.onrender.com", // Your deployed frontend
  "http://192.248.50.135:5173", // Your deployed frontend
  "http://192.248.50.135:5001", // Backend direct access (for uploads)
  "http://192.248.50.135", // Your deployed frontend
  "http://teclcms.duckdns.org",
];

// Dynamically add the FRONTEND_URL from the .env file to the whitelist if it's not already there.
if (
  process.env.FRONTEND_URL &&
  !allowedOrigins.includes(process.env.FRONTEND_URL)
) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests) or from the whitelist
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Ensure upload directories exist on server startup
getSdsUploadDir();
getImageUploadDir();
getInstrumentUploadDir();

// Serve uploaded files statically from configurable persistent storage root
app.use("/api/uploads", express.static(getUploadsRoot()));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CMS API is running",
  });
});
app.use("/api/users", userRoutes);
app.use("/api/chemicals", chemicalRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/dispose", disposeRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/instruments", instrumentRoutes);

const startExpiryNotificationScheduler = () => {
  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

  const runExpiryNotificationCheck = async () => {
    const expiredResult = await notifyExpiredBatches();
    const expiryResult = await notifyExpiringBatches();
    const lowStockResult = await notifyLowStockBatches();

    if (!expiredResult.error) {
      console.log(
        `[NotificationService] Expired batch check completed. Created ${expiredResult.createdNotifications || 0} notifications.`,
      );
    }

    if (!expiryResult.error) {
      console.log(
        `[NotificationService] Expiry check completed. Created ${expiryResult.createdNotifications || 0} notifications.`,
      );
    }

    if (!lowStockResult.error) {
      console.log(
        `[NotificationService] Low stock check completed. Created ${lowStockResult.createdNotifications || 0} notifications.`,
      );
    }
  };

  runExpiryNotificationCheck();
  setInterval(runExpiryNotificationCheck, oneDayInMilliseconds);
};

const startServer = async () => {
  try {
    console.log("Connecting to the database...");
    await sequelize.authenticate();
    console.log("Database connection established successfully.✅");

    await verifyEmailConnection();

    if (process.env.NODE_ENV === "development") {
      await db.sequelize.sync({ alter: true });
      console.log("All models were synchronized successfully.");
    }

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
    startExpiryNotificationScheduler();
  } catch (error) {
    console.error("\nServer startup failed:");
    console.error(error);
    process.exit(1);
  }
};

startServer();
