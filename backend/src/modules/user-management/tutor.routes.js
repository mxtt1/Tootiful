import express from 'express';
import tutorService from './tutor.service.js';

const router = express.Router();

// GET /api/tutors - Get all tutors with optional filters
router.get('/', tutorService.handleGetAllTutors.bind(tutorService));

// GET /api/tutors/:id - Get tutor by ID
router.get('/:id', tutorService.handleGetTutorById.bind(tutorService));

// POST /api/tutors - Create new tutor
router.post('/', tutorService.handleCreateTutor.bind(tutorService));

// POST /api/tutors/login - Tutor login
router.post('/login', tutorService.handleTutorLogin.bind(tutorService));

// PATCH /api/tutors/:id - Update tutor (partial)
router.patch('/:id', tutorService.handleUpdateTutor.bind(tutorService));

// PATCH /api/tutors/:id/password - Change tutor password
router.patch('/:id/password', tutorService.handleChangePassword.bind(tutorService));

// DELETE /api/tutors/:id - Delete tutor
router.delete('/:id', tutorService.handleDeleteTutor.bind(tutorService));

// PATCH /api/tutors/:id/deactivate - Soft delete tutor
router.patch('/:id/deactivate', tutorService.handleDeactivateTutor.bind(tutorService));

// Subject management routes
// GET /api/tutors/subjects - Get all subjects
router.get('/subjects/all', tutorService.handleGetAllSubjects.bind(tutorService));

// POST /api/tutors/subjects - Create new subject
router.post('/subjects', tutorService.handleCreateSubject.bind(tutorService));

export default router;
