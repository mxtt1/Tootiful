import express from 'express';
import AgencyAdminService from './agencyAdmin.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateToken } from '../../middleware/authenticateToken.js';

const router = express.Router();
const agencyAdminService = new AgencyAdminService();


// GET /api/agency-admins/:id - Get agencyAdmin by ID
router.get('/:id', authenticateToken, asyncHandler(agencyAdminService.handleGetAgencyAdminById.bind(agencyAdminService)));

// PATCH /api/agency-admins/:id - Update agencyAdmin 
router.patch('/:id', authenticateToken, asyncHandler(agencyAdminService.handleUpdateAgencyAdmin.bind(agencyAdminService)));

// PATCH /api/agency-admins/:id/password - Change agencyAdmin password
router.patch('/:id/password', authenticateToken, asyncHandler(agencyAdminService.handleChangePassword.bind(agencyAdminService)));

export default router;