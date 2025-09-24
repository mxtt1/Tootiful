import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import sequelize from "./config/database.js";
import studentRoutes from "./modules/user-management/student.routes.js";
import tutorRoutes from "./modules/user-management/tutor.routes.js";
import authRoutes from "./modules/user-management/auth.routes.js";
import agencyRoutes from "./modules/user-management/agency.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie parser middleware

// Proper CORS middleware for credentials support
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  })
);

// Routes
app.use("/api/students", studentRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/agencies", agencyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/agencyAdmins", agencyRoutes);

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

    // Sync database models (create tables if they don't exist)
    /*await sequelize.sync();
    console.log("Database synchronized successfully.");
    */

    // Start the server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Students API: http://localhost:${PORT}/api/students`);
      console.log(`Tutors API: http://localhost:${PORT}/api/tutors`);
      console.log(`AgencyAdmins API: http://localhost:${PORT}/api/agencyAdmins`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
};

startServer();
