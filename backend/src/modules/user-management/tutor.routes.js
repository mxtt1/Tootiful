import express from 'express';
import TutorService from './tutor.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateToken } from '../../middleware/authenticateToken.js';

const router = express.Router();

const tutorService = new TutorService();

// GET /api/tutors - Get all tutors with optional filters
router.get('/', authenticateToken, asyncHandler(tutorService.handleGetAllTutors.bind(tutorService)));

// GET /api/tutors/available-for-subject = Get all available tutors for a specific subject of that agency
router.get('/available-for-subject', authenticateToken, asyncHandler(tutorService.handleGetAvailableTutorsForSubject.bind(tutorService)));

// GET /api/tutors/:id - Get tutor by ID
router.get('/:id', authenticateToken, asyncHandler(tutorService.handleGetTutorById.bind(tutorService)));

// POST /api/tutors - Create new tutor
router.post('/', asyncHandler(tutorService.handleCreateTutor.bind(tutorService)));

// PATCH /api/tutors/:id - Update tutor (partial)
router.patch('/:id', authenticateToken, asyncHandler(tutorService.handleUpdateTutor.bind(tutorService)));

// PATCH /api/tutors/:id/password - Change tutor password
router.patch('/:id/password', authenticateToken, asyncHandler(tutorService.handleChangePassword.bind(tutorService)));

// DELETE /api/tutors/:id - Delete tutor
router.delete('/:id', authenticateToken, asyncHandler(tutorService.handleDeleteTutor.bind(tutorService)));

// Subject management routes
// GET /api/tutors/subjects - Get all subjects
router.get('/subjects/all', asyncHandler(tutorService.handleGetAllSubjects.bind(tutorService)));

// POST /api/tutors/subjects - Create new subject
router.post('/subjects', asyncHandler(tutorService.handleCreateSubject.bind(tutorService)));

export default router;
