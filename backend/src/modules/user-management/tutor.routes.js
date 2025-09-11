import express from 'express';
import TutorService from './tutor.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

const router = express.Router();

const tutorService = new TutorService();

// GET /api/tutors - Get all tutors with optional filters
router.get('/', asyncHandler(tutorService.handleGetAllTutors.bind(tutorService)));

// GET /api/tutors/:id - Get tutor by ID
router.get('/:id', asyncHandler(tutorService.handleGetTutorById.bind(tutorService)));

// POST /api/tutors - Create new tutor
router.post('/', asyncHandler(tutorService.handleCreateTutor.bind(tutorService)));

// PATCH /api/tutors/:id - Update tutor (partial)
router.patch('/:id', asyncHandler(tutorService.handleUpdateTutor.bind(tutorService)));

// PATCH /api/tutors/:id/password - Change tutor password
router.patch('/:id/password', asyncHandler(tutorService.handleChangePassword.bind(tutorService)));

// DELETE /api/tutors/:id - Delete tutor
router.delete('/:id', asyncHandler(tutorService.handleDeleteTutor.bind(tutorService)));

// Subject management routes
// GET /api/tutors/subjects - Get all subjects
router.get('/subjects/all', asyncHandler(tutorService.handleGetAllSubjects.bind(tutorService)));

// POST /api/tutors/subjects - Create new subject
router.post('/subjects', asyncHandler(tutorService.handleCreateSubject.bind(tutorService)));

export default router;
