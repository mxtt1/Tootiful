import express from 'express';
import LocationService from './location.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

const router = express.Router();
const locationService = new LocationService();



// GET /api/locations/all - Get all locations (for debugging)
router.get('/', asyncHandler(async (req, res) => {
    await locationService.handleGetLocationsByAgency(req, res);

}));
// GET /api/locations - Get locations by agency ID
router.get('/all', asyncHandler(async (req, res) => {
    await locationService.handleGetAllLocations(req, res);
}));

export default router;