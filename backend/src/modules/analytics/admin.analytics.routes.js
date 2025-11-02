import express from "express";
import AdminAnalyticsService from "./admin.analytics.service.js";
import { authenticateToken } from '../../middleware/authenticateToken.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

const router = express.Router();
const analyticsService = new AdminAnalyticsService();

// GET /api/analytics/admin/revenue-summary - Get revenue summary for all agencies
router.get("/admin/revenue-summary", authenticateToken, asyncHandler(analyticsService.handleGetAdminRevenueSummary.bind(analyticsService)));

// GET /api/analytics/admin/revenue-growth - Get revenue growth for all agencies
router.get('/admin/revenue-growth', authenticateToken, asyncHandler(analyticsService.handleGetAdminRevenueGrowthData.bind(analyticsService)));

// GET /api/analytics/admin/subscription-growth - Get subscription growth for all agencies
router.get('/admin/subscription-growth', authenticateToken, asyncHandler(analyticsService.handleGetAdminSubscriptionGrowthData.bind(analyticsService)));

// GET /api/analytics/admin/subscription-lessons - Get subscription lessons for all agencies
router.get('/admin/subscription-lessons', authenticateToken, asyncHandler(analyticsService.handleGetAdminSubscriptionLessons.bind(analyticsService)));

// GET /api/analytics/admin/attendance - Get attendance for all agencies
router.get('/admin/attendance', authenticateToken, asyncHandler(analyticsService.handleGetAdminAttendance.bind(analyticsService)));

// GET /api/analytics/admin/tutor-payments - Get tutor payments for all agencies
router.get('/admin/tutor-payments', authenticateToken, asyncHandler(analyticsService.handleGetAdminTutorPayments.bind(analyticsService)));

// GET /api/analytics/admin/agency-stats - Get agency statistics
router.get('/admin/agency-stats', authenticateToken, asyncHandler(analyticsService.handleGetAdminAgencyStats.bind(analyticsService)));

// GET /api/analytics/admin/platform-fee-transactions - Get platform fee transactions for all agencies
router.get('/admin/platform-fee-transactions', authenticateToken, asyncHandler(analyticsService.handleGetAdminPlatformFeeTransactions.bind(analyticsService)));
export default router;