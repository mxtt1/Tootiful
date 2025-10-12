import express from "express";
import LessonService from "./lesson.service.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";

const router = express.Router();
const lessonService = new LessonService();

// Dropdown data routes
router.get(
  "/subjects",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await lessonService.handleGetAllSubjects(req, res);
  })
);

// GET /api/lessons - Get all lessons
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await lessonService.handleGetAllLessons(req, res);
  })
);

// GET /api/lessons/:id - Get lesson by ID
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await lessonService.handleGetLessonById(req, res);
  })
);

// POST /api/lessons - Create new lesson
router.post(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await lessonService.handleCreateLesson(req, res);
  })
);

// GET /api/lessons/agency/:id - Get lessons by agency ID
router.get(
  "/agency/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await lessonService.handleGetLessonsByAgencyId(req, res);
  })
);

// PATCH /api/lessons/:id - Update lesson
router.patch(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await lessonService.handleUpdateLesson(req, res);
  })
);

// DELETE /api/lessons/:id - Delete lesson
router.delete(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await lessonService.handleDeleteLesson(req, res);
  })
);

// GET /api/lessons/students/:id - Get all lessons for a specific student
router.get(
  "/students/:id",
  asyncHandler(async (req, res) => {
    await lessonService.handleGetAllLessonsByStudentId(req, res);
  })
);

// GET /api/lessons/:lessonId/students/:studentId/status - Check if student is enrolled in lesson
router.get(
  "/:lessonId/students/:studentId/status",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await lessonService.handleCheckEnrollmentStatus(req, res);
  })
);

// POST /api/lessons/students/:id - Enrol a student in a lesson
router.post(
  "/students/:id",
  asyncHandler(async (req, res) => {
    await lessonService.handleEnrolStudentInLesson(req, res);
  })
);

// DELETE /api/lessons/students/:id - Unenrol a student from a lesson
router.delete(
  "/students/:id",
  asyncHandler(async (req, res) => {
    await lessonService.handleUnenrolStudentFromLesson(req, res);
  })
);

export default router;
