import express from 'express';
import TenantService from './tenant.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateToken } from '../../middleware/authenticateToken.js';

const router = express.Router();

const tenantService = new TenantService();

// POST /api/tenant/extract-metadata - Extract metadata from agency website
router.post('/extract-metadata', authenticateToken, asyncHandler(tenantService.handleExtractMetadata.bind(tenantService)));

// POST /api/tenant/customization - Create customization (matches frontend)
router.post('/customization', authenticateToken, asyncHandler(tenantService.handleSaveCustomization.bind(tenantService)));

// GET /api/tenant/customization - Get customization config (matches frontend)
router.get('/customization', authenticateToken, asyncHandler(tenantService.handleGetConfig.bind(tenantService)));

// PATCH /api/tenant/customization - Update customization (matches frontend)
router.patch('/customization', authenticateToken, asyncHandler(tenantService.handleUpdateCustomization.bind(tenantService)));


export default router;