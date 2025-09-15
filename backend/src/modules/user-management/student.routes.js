import express from 'express';
import StudentService from './student.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateToken } from '../../middleware/authenticateToken.js';

const router = express.Router();

const studentService = new StudentService();

// GET /api/students - Get all students
router.get('/', authenticateToken, asyncHandler(studentService.handleGetAllStudents.bind(studentService)));

// GET /api/students/:id - Get student by ID
router.get('/:id', authenticateToken, asyncHandler(studentService.handleGetStudentById.bind(studentService)));

// POST /api/students - Create new student
router.post('/', asyncHandler(studentService.handleCreateStudent.bind(studentService)));

// PATCH /api/students/:id - Update student (partial)
router.patch('/:id', authenticateToken, asyncHandler(studentService.handleUpdateStudent.bind(studentService)));

// PATCH /api/students/:id/password - Change student password
router.patch('/:id/password', authenticateToken, asyncHandler(studentService.handleChangePassword.bind(studentService)));

// DELETE /api/students/:id - Delete student
router.delete('/:id', authenticateToken, asyncHandler(studentService.handleDeleteStudent.bind(studentService)));

export default router;
