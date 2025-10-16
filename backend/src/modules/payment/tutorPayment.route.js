import express from "express";
import TutorPaymentService from "./tutorPayment.service.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";

const router = express.Router();
const tutorPaymentService = new TutorPaymentService();

// GET /api/tutorPayments/agency/:id - Get all total tutor balances by agency ID
router.get("/agency/:id",
    authenticateToken,
    asyncHandler(async (req, res) => {
        await tutorPaymentService.handleGetAllTotalTutorBalance(req, res);
    })
);
export default router;