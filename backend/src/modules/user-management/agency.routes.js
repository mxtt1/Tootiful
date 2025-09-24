import express from 'express';
import AgencyService from './agency.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { AgencyRoles } from "./middleware/agencyRoles.js";
import { authenticateToken } from '../../middleware/authenticateToken.js';

const router = express.Router();

const agencyService = new AgencyService();

// GET /api/agencyAdmins - Get all agencyAdmins of that agency
router.get('/', authenticateToken, AgencyRoles.requireSuperAgencyAdmin, asyncHandler(agencyService.handleGetAllAgencyAdmins.bind(agencyService)));

// GET /api/agencyAdmins/:id - Get agencyAdmin by ID
router.get('/:id', authenticateToken, asyncHandler(agencyService.handleGetAgencyAdminById.bind(agencyService)));

// POST /api/agencyAdmins - Create new agencyAdmin
router.post('/', authenticateToken, AgencyRoles.requireSuperAgencyAdmin, asyncHandler(agencyService.handleCreateAgencyAdmin.bind(agencyService)));

// PATCH /api/agencyAdmins/:id - Update agencyAdmin 
router.patch('/:id', authenticateToken, asyncHandler(agencyService.handleUpdateAgencyAdmin.bind(agencyService)));

// PATCH /api/agencyAdmins/:id/password - Change agencyAdmin password
router.patch('/:id/password', authenticateToken, asyncHandler(agencyService.handleChangePassword.bind(agencyService)));

/*
// DELETE /api/agencyAdmins/:id - Delete agencyAdmin
router.delete('/:id', authenticateToken, asyncHandler(agencyService.handleDeleteAgencyAdmin.bind(agencyService)));
*/

/*
// Location management routes
// GET /api/agencyAdmins/locations - Get all locations
router.get('/locations/all', asyncHandler(agencyService.handleGetAllLocations.bind(agencyService)));

// POST /api/agencyAdmins/locations - Create new location
router.post('/locations', asyncHandler(agencyService.handleCreateLocation.bind(agencyService)));
*/
export default router;
