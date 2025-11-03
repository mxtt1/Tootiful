import express from "express";
import PaperService from "./paper.service.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";

const router = express.Router();
const paperService = new PaperService();

// Get all papers for a tutor
router.get(
  "/tutor/:tutorId",
  authenticateToken,
  asyncHandler(paperService.handleGetPapersByTutorId.bind(paperService))
);

// Get a single paper by ID
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(paperService.handleGetPaperById.bind(paperService))
);

export default router;
