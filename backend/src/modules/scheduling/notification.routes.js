import express from 'express';
import NotificationService from './notification.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateToken } from '../../middleware/authenticateToken.js';

const router = express.Router();

const notificationService = new NotificationService();

// GET /api/notifications - Get user's notifications
router.get('/', authenticateToken, asyncHandler(notificationService.handleGetUserNotifications.bind(notificationService)));

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', authenticateToken, asyncHandler(notificationService.handleGetNotificationStats.bind(notificationService)));

// Template management routes
router.get('/:lessonId/next-grade-options', authenticateToken, asyncHandler(notificationService.handleGetNextGradeOptions.bind(notificationService)));
router.get('/lesson/:lessonId/template', authenticateToken, asyncHandler(notificationService.handleGetNotificationTemplate.bind(notificationService)));
router.post('/lesson/:lessonId/template', authenticateToken, asyncHandler(notificationService.handleSaveNotificationTemplate.bind(notificationService)));

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', authenticateToken, asyncHandler(notificationService.handleMarkAsRead.bind(notificationService)));

// PATCH /api/notifications/read-all - Mark all notifications as read for user
router.patch('/read-all', authenticateToken, asyncHandler(notificationService.handleMarkAllAsRead.bind(notificationService)));

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticateToken, asyncHandler(notificationService.handleDeleteNotification.bind(notificationService)));

export default router;