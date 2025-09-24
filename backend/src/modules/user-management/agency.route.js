import express from 'express';
import AgencyService from './agency.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateToken } from '../../middleware/authenticateToken.js';


const router = express.Router();
const agencyService = new AgencyService();

// GET /api/agencies - Get all agencies (protected)
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    await agencyService.handleGetAllAgencies(req, res);
}));


// GET /api/agencies/:id - Get agency by ID (protected)
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
    await agencyService.handleGetAgencyById(req, res);
}));

// POST /api/agencies - Create new agency (public - for registration)
router.post('/', asyncHandler(async (req, res) => {
    await agencyService.handleCreateAgency(req, res);
}));

// PATCH /api/agencies/:id - Update agency (protected)
router.patch('/:id', authenticateToken, asyncHandler(async (req, res) => {
    await agencyService.handleUpdateAgency(req, res);
}));

// POST /api/agencies/:id/change-password - Change agency password (protected)
router.post('/:id/change-password', authenticateToken, asyncHandler(async (req, res) => {
    await agencyService.handleChangePassword(req, res);
}));

// DELETE /api/agencies/:id - Delete agency (protected)
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
    await agencyService.handleDeleteAgency(req, res);
}));

export default router;