import express from 'express';
import studentService from './student.service.js';

const router = express.Router();

// GET /api/students - Get all students
router.get('/', studentService.handleGetAllStudents.bind(studentService));

// GET /api/students/:id - Get student by ID
router.get('/:id', studentService.handleGetStudentById.bind(studentService));

// POST /api/students - Create new student
router.post('/', studentService.handleCreateStudent.bind(studentService));

// POST /api/students/login - Student login
router.post('/login', studentService.handleStudentLogin.bind(studentService));

// PATCH /api/students/:id - Update student (partial)
router.patch('/:id', studentService.handleUpdateStudent.bind(studentService));

// PATCH /api/students/:id/password - Change student password
router.patch('/:id/password', studentService.handleChangePassword.bind(studentService));

// DELETE /api/students/:id - Delete student
router.delete('/:id', studentService.handleDeleteStudent.bind(studentService));

// PATCH /api/students/:id/deactivate - Soft delete student
router.patch('/:id/deactivate', studentService.handleDeactivateStudent.bind(studentService));

export default router;
