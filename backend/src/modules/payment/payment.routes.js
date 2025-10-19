import express from "express";
import PaymentService from "./payment.service.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";

const router = express.Router();
const paymentService = new PaymentService();

/**
 * GET /api/payments/calculate/:lessonId
 * Calculate payment details for a lesson
 */
router.get("/calculate/:lessonId", authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;

    const paymentDetails = await paymentService.calculateLessonPayment(
      lessonId
    );

    res.status(200).json({
      success: true,
      data: paymentDetails,
    });
  } catch (error) {
    console.error("Error calculating payment:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to calculate payment",
    });
  }
});

/**
 * POST /api/payments/create-intent
 * Create a Stripe Payment Intent for lesson enrollment
 */
router.post("/create-intent", authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.body;
    const studentId = req.user.userId;

    // Ensure only students can create payment intents
    if (req.user.userType !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can create payment intents",
      });
    }

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: "Lesson ID is required",
      });
    }

    const paymentIntent = await paymentService.createPaymentIntent(
      studentId,
      lessonId
    );

    res.status(200).json({
      success: true,
      data: paymentIntent,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create payment intent",
    });
  }
});

/**
 * POST /api/payments/confirm
 * Confirm payment and enroll student in lesson
 */
router.post("/confirm", authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Ensure only students can confirm payments
    if (req.user.userType !== "student") {
      return res.status(403).json({
        success: false,
        message: "Only students can confirm payments",
      });
    }

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment Intent ID is required",
      });
    }

    const confirmationResult = await paymentService.confirmPaymentAndEnroll(
      paymentIntentId
    );

    res.status(200).json({
      success: true,
      data: confirmationResult,
      message: "Payment confirmed and enrollment successful!",
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to confirm payment",
    });
  }
});

/**
 * GET /api/payments/status/:paymentIntentId
 * Get payment status
 */
router.get("/status/:paymentIntentId", authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const paymentStatus = await paymentService.getPaymentStatus(
      paymentIntentId
    );

    res.status(200).json({
      success: true,
      data: paymentStatus,
    });
  } catch (error) {
    console.error("Error getting payment status:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to get payment status",
    });
  }
});

/**
 * POST /api/payments/student
 * Create a StudentPayment record
 */
router.post("/student", authenticateToken, async (req, res) => {
  try {
    const { lessonId, amount } = req.body;
    const studentId = req.user.userId;
    if (!lessonId || !amount) {
      return res.status(400).json({
        success: false,
        message: "lessonId and amount are required",
      });
    }
    const payment = await paymentService.createStudentPayment({ studentId, lessonId, amount });
    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error creating student payment:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create student payment",
    });
  }
});

/**
 * GET /api/payments/student
 * Get StudentPayment records (optionally filter by studentId or lessonId)
 * Query params: studentId, lessonId
 */
router.get("/student", authenticateToken, async (req, res) => {
  try {
    const { studentId, lessonId } = req.query;
    const payments = await paymentService.getStudentPayments({ studentId, lessonId });
    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching student payments:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch student payments",
    });
  }
});

export default router;
