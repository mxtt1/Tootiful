import express from 'express';
import AgencyAdminService from './agencyAdmin.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { AgencyRole } from "../../middleware/agencyRole.js";
import { authenticateToken } from '../../middleware/authenticateToken.js';

const router = express.Router();
const agencyAdminService = new AgencyAdminService();

// GET /api/agency-admins - Get all agencyAdmins of that agency
router.get('/', authenticateToken, AgencyRole.requireSuperAgencyAdmin, asyncHandler(agencyAdminService.handleGetAllAgencyAdmins.bind(agencyAdminService)));

// GET /api/agency-admins/:id - Get agencyAdmin by ID
router.get('/:id', authenticateToken, asyncHandler(agencyAdminService.handleGetAgencyAdminById.bind(agencyAdminService)));

// POST /api/agency-admins - Create new agencyAdmin
router.post('/', authenticateToken, AgencyRole.requireSuperAgencyAdmin, asyncHandler(agencyAdminService.handleCreateAgencyAdmin.bind(agencyAdminService)));

// PATCH /api/agency-admins/:id - Update agencyAdmin 
router.patch('/:id', authenticateToken, asyncHandler(agencyAdminService.handleUpdateAgencyAdmin.bind(agencyAdminService)));

// PATCH /api/agency-admins/:id/password - Change agencyAdmin password
router.patch('/:id/password', authenticateToken, asyncHandler(agencyAdminService.handleChangePassword.bind(agencyAdminService)));

/*
// DELETE /api/agency-admins/:id - Delete agencyAdmin
router.delete('/:id', authenticateToken, asyncHandler(agencyAdminService.handleDeleteAgencyAdmin.bind(agencyAdminService)));
*/

/*
// Location management routes
// GET /api/agency-admins/locations - Get all locations
router.get('/locations/all', asyncHandler(agencyAdminService.handleGetAllLocations.bind(agencyAdminService)));

// POST /api/agency-admins/locations - Create new location
router.post('/locations', asyncHandler(agencyAdminService.handleCreateLocation.bind(agencyAdminService)));
*/
export default router;