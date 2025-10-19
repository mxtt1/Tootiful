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
// GET /api/tutorPayments/agency/:id/revenue-summary - Get revenue summary for agency
router.get("/agency/:id/revenue-summary", tutorPaymentService.handleGetAgencyRevenueSummary.bind(tutorPaymentService));
// GET /api/tutorPayments/agency/:id/revenue-growth - Get revenue growth for agency
router.get('/agency/:id/revenue-growth', tutorPaymentService.handleGetRevenueGrowthData.bind(tutorPaymentService));
// GET /api/tutorPayments/agency/:id/subscription-growth - Get subscription growth for agency
router.get('/agency/:id/subscription-growth', tutorPaymentService.handleGetSubscriptionGrowthData.bind(tutorPaymentService));

//router.patch("/:id", tutorPaymentService.handleUpdatePaymentStatus.bind(tutorPaymentService));
//router.get("/tutor/:tutorId/summary", tutorPaymentService.handleGetTutorBalanceSummary.bind(tutorPaymentService));
export default router;