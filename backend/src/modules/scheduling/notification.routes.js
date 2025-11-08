import express from 'express';
import NotificationService from './notification.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateToken } from '../../middleware/authenticateToken.js';

const router = express.Router();

const notificationService = new NotificationService();

// GET /api/notifications - Get user's notifications
router.get('/', authenticateToken, asyncHandler(notificationService.handleGetUserNotifications.bind(notificationService)));

// GET /api/notifications/stats - Get notification statistics (unread count, etc.)
router.get('/stats', authenticateToken, asyncHandler(notificationService.handleGetNotificationStats.bind(notificationService)));

// GET /api/notifications/lessonId/next-grade-options - Get next grade lesson options
router.get('/:lessonId/next-grade-options', authenticateToken, (req, res, next) => {
    console.log("🔔 Backend: /notifications/:lessonId/next-grade-options route hit");
    console.log("🔔 Backend: Lesson ID:", req.params.lessonId);
    console.log("🔔 Backend: User ID:", req.user.userId);
    next();
}, asyncHandler(notificationService.handleGetNextGradeOptions.bind(notificationService)));

// POST /api/notifications/grade-progression/:lessonId - Send grade progression notifications for a lesson
router.post('/grade-progression/:lessonId', authenticateToken, asyncHandler(notificationService.handleSendGradeProgressionNotifications.bind(notificationService)));

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', authenticateToken, asyncHandler(notificationService.handleMarkAsRead.bind(notificationService)));

// PATCH /api/notifications/read-all - Mark all notifications as read for user
router.patch('/read-all', authenticateToken, asyncHandler(notificationService.handleMarkAllAsRead.bind(notificationService)));

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticateToken, asyncHandler(notificationService.handleDeleteNotification.bind(notificationService)));

export default router;