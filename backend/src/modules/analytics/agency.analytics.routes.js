import express from "express";
import AgencyAnalyticsService from "./agency.analytics.service.js";
import { authenticateToken } from '../../middleware/authenticateToken.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

const router = express.Router();
const analyticsService = new AgencyAnalyticsService();

// GET /api/analytics/agency/:id/revenue-summary - Get revenue summary for agency
router.get("/agency/:id/revenue-summary", authenticateToken, asyncHandler(analyticsService.handleGetAgencyRevenueSummary.bind(analyticsService)));
// GET /api/analytics/agency/:id/revenue-growth - Get revenue growth for agency
router.get('/agency/:id/revenue-growth', authenticateToken, asyncHandler(analyticsService.handleGetRevenueGrowthData.bind(analyticsService)));
// GET /api/analytics/agency/:id/subscription-growth - Get subscription growth for agency
router.get('/agency/:id/subscription-growth', authenticateToken, asyncHandler(analyticsService.handleGetSubscriptionGrowthData.bind(analyticsService)));

export default router;
