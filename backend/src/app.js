import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import sequelize from "./config/database.js";
import studentRoutes from "./modules/user-management/student.routes.js";
import tutorRoutes from "./modules/user-management/tutor.routes.js";
import authRoutes from "./modules/user-management/auth.routes.js";
import agencyRoutes from "./modules/user-management/agency.route.js";
import agencyAdminRoutes from "./modules/user-management/agencyAdmin.routes.js";
import lessonRoutes from "./modules/scheduling/lesson.routes.js";
import tutorPaymentRoutes from "./modules/payment/tutorPayment.route.js";
import paymentRoutes from "./modules/payment/payment.routes.js";
import adminAnalyticsRoutes from "./modules/analytics/admin.analytics.routes.js";
import agencyAnalyticsRoutes from "./modules/analytics/agency.analytics.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import "./models/index.js";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'STRIPE_SECRET_KEY',
  'SMTP_USER',
  'SMTP_PASS',
  'MAIL_FROM_EMAIL'
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie parser middleware

// CORS middleware - Allow all origins for now (mobile app + local frontend)
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "params", //allow params holder
      "Authorization",
    ],
  })
);

// Routes
app.use("/api/students", studentRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/lessons", lessonRoutes); //implement lesson routes
app.use("/api/agencies", agencyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/agency-admins", agencyAdminRoutes);
app.use("/api/tutorPayments", tutorPaymentRoutes); //tutor payment routes
app.use("/api/payments", paymentRoutes); //student payment routes
app.use("/api/analytics", agencyAnalyticsRoutes); // Agency analytics
app.use("/api/analytics", adminAnalyticsRoutes);  // Admin analytics 

// Global Error Handler Middleware
app.use(errorHandler);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");

    // Start the server
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Students API: http://localhost:${PORT}/api/students`);
      console.log(`Tutors API: http://localhost:${PORT}/api/tutors`);
      console.log(`Agency-admins API: http://localhost:${PORT}/api/agency-admins`);
      console.log(`Admin Analytics: http://localhost:${PORT}/api/analytics/admin`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed.');

        try {
          await sequelize.close();
          console.log('Database connection closed.');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
};

startServer();
