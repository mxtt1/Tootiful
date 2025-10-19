import express from "express";
import AgencyAnalyticsService from "./agency.analytics.service.js";

const router = express.Router();
const analyticsService = new AgencyAnalyticsService();

// GET /api/analytics/agency/:id/revenue-summary - Get revenue summary for agency
router.get("/agency/:id/revenue-summary", analyticsService.handleGetAgencyRevenueSummary.bind(analyticsService));
// GET /api/analytics/agency/:id/revenue-growth - Get revenue growth for agency
router.get('/agency/:id/revenue-growth', analyticsService.handleGetRevenueGrowthData.bind(analyticsService));
// GET /api/analytics/agency/:id/subscription-growth - Get subscription growth for agency
router.get('/agency/:id/subscription-growth', analyticsService.handleGetSubscriptionGrowthData.bind(analyticsService));

export default router;
