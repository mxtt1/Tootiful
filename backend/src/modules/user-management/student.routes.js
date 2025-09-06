import express from 'express';
import StudentService from './student.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

const router = express.Router();

const studentService = new StudentService();

// GET /api/students - Get all students
router.get('/', asyncHandler(studentService.handleGetAllStudents.bind(studentService)));

// GET /api/students/:id - Get student by ID
router.get('/:id', asyncHandler(studentService.handleGetStudentById.bind(studentService)));

// POST /api/students - Create new student
router.post('/', asyncHandler(studentService.handleCreateStudent.bind(studentService)));

// PATCH /api/students/:id - Update student (partial)
router.patch('/:id', asyncHandler(studentService.handleUpdateStudent.bind(studentService)));

// PATCH /api/students/:id/password - Change student password
router.patch('/:id/password', asyncHandler(studentService.handleChangePassword.bind(studentService)));

// DELETE /api/students/:id - Delete student
router.delete('/:id', asyncHandler(studentService.handleDeleteStudent.bind(studentService)));

// PATCH /api/students/:id/deactivate - Soft delete student
router.patch('/:id/deactivate', asyncHandler(studentService.handleDeactivateStudent.bind(studentService)));

export default router;
