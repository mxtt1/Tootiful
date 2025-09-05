import express from 'express';
import tutorService from './tutor.service.js';
import asyncHandler from '../../middleware/asyncHandler.js';

const router = express.Router();

// GET /api/tutors - Get all tutors with optional filters
router.get('/', asyncHandler(tutorService.handleGetAllTutors.bind(tutorService)));

// GET /api/tutors/:id - Get tutor by ID
router.get('/:id', asyncHandler(tutorService.handleGetTutorById.bind(tutorService)));

// POST /api/tutors - Create new tutor
router.post('/', asyncHandler(tutorService.handleCreateTutor.bind(tutorService)));

// POST /api/tutors/login - Tutor login
router.post('/login', asyncHandler(tutorService.handleTutorLogin.bind(tutorService)));

// PATCH /api/tutors/:id - Update tutor (partial)
router.patch('/:id', asyncHandler(tutorService.handleUpdateTutor.bind(tutorService)));

// PATCH /api/tutors/:id/password - Change tutor password
router.patch('/:id/password', asyncHandler(tutorService.handleChangePassword.bind(tutorService)));

// DELETE /api/tutors/:id - Delete tutor
router.delete('/:id', asyncHandler(tutorService.handleDeleteTutor.bind(tutorService)));

// PATCH /api/tutors/:id/deactivate - Soft delete tutor
router.patch('/:id/deactivate', asyncHandler(tutorService.handleDeactivateTutor.bind(tutorService)));

// Subject management routes
// GET /api/tutors/subjects - Get all subjects
router.get('/subjects/all', asyncHandler(tutorService.handleGetAllSubjects.bind(tutorService)));

// POST /api/tutors/subjects - Create new subject
router.post('/subjects', asyncHandler(tutorService.handleCreateSubject.bind(tutorService)));

export default router;
