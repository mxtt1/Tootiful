import express from "express";
import AgencyService from "./agency.service.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";

const router = express.Router();
const agencyService = new AgencyService();

// GET /api/agencies - Get all agencies (protected)
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleGetAllAgencies(req, res);
  })
);

// GET /api/agencies/public - Get all active agencies (public for students)
router.get(
  "/public",
  asyncHandler(async (req, res) => {
    await agencyService.handleGetPublicAgencies(req, res);
  })
);

// GET /api/agencies/locations/public - Get all unique locations for filtering
router.get(
  "/locations/public",
  asyncHandler(async (req, res) => {
    await agencyService.handleGetAllLocations(req, res);
  })
);

// GET /api/agencies/:id - Get agency by ID (protected) - NOW INCLUDES CUSTOMIZATION
router.get(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleGetAgencyById(req, res);
  })
);

// GET /api/agencies/:id/public - Get agency by ID (public for students)
router.get(
  "/:id/public",
  asyncHandler(async (req, res) => {
    await agencyService.handleGetPublicAgencyById(req, res);
  })
);

// POST /api/agencies - Create new agency (public - for registration)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    await agencyService.handleCreateAgency(req, res);
  })
);

// PATCH /api/agencies/:id - Update agency (protected) - NOW HANDLES CUSTOMIZATION
router.patch(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleUpdateAgency(req, res);
  })
);

// POST /api/agencies/:id/change-password - Change agency password (protected)
router.post(
  "/:id/change-password",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleChangePassword(req, res);
  })
);

// DELETE /api/agencies/:id - Delete agency (protected)
router.delete(
  "/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleDeleteAgency(req, res);
  })
);

// Agency Admin Management
// GET /api/agencies/:id/admins - Get all agency admins for an agency
router.get(
  "/:id/admins",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleGetAgencyAdmins(req, res);
  })
);

// POST /api/agencies/:id/admins - Create new agency admin for an agency
router.post(
  "/:id/admins",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleCreateAgencyAdmin(req, res);
  })
);

// DELETE /api/agencies/:id/admins/:adminId - Delete agencyAdmin
router.delete(
  "/:id/admins/:adminId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleDeleteAgencyAdmin(req, res);
  })
);

// Location Management
// GET /api/agencies/:id/locations - Get all locations for an agency
router.get(
  "/:id/locations",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleGetAgencyLocations(req, res);
  })
);

// POST /api/agencies/:id/locations - Create new location for an agency
router.post(
  "/:id/locations",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleCreateLocation(req, res);
  })
);

// DELETE /api/agencies/:agencyId/locations/:locationId - Delete a location
router.delete(
  "/:agencyId/locations/:locationId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agencyService.handleDeleteLocation(req, res);
  })
);

// BRAND CUSTOMISATION ROUTES

// POST /api/agencies/:id/extract-metadata - Extract metadata from agency website
router.post(
  '/:id/extract-metadata', 
  authenticateToken, 
  asyncHandler(async (req, res) => {
    await agencyService.handleExtractMetadata(req, res);
  })
);

export default router;