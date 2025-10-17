import express from "express";
import TutorPaymentService from "./tutorPayment.service.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";

const router = express.Router();
const tutorPaymentService = new TutorPaymentService();


//create endpoint to manhandle indiv attedance statusd

// ✅ ADD: Missing agency route
router.get("/agency/:id", tutorPaymentService.handleGetAllTutorPaymentsByAgency.bind(tutorPaymentService));
router.get("/agency/:id/payments", tutorPaymentService.handleGetPaidPaymentsFromAgencyID.bind(tutorPaymentService));
router.patch("/attendances/:id", tutorPaymentService.handleMarkAttendanceAsPaid.bind(tutorPaymentService));
router.post("/", tutorPaymentService.handleCreatePayment.bind(tutorPaymentService));
//router.patch("/:id", tutorPaymentService.handleUpdatePaymentStatus.bind(tutorPaymentService));
//router.get("/tutor/:tutorId/summary", tutorPaymentService.handleGetTutorBalanceSummary.bind(tutorPaymentService));
export default router;