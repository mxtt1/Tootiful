import express from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateToken } from '../../middleware/authenticateToken.js';
import metadataExtractor from '../../util/metadataExtractor.js';
import { TenantConfig, Agency } from '../../models/index.js';

const router = express.Router();

// Helper function to get agencyId from authenticated user
const getAgencyIdFromUser = (user) => {
  // For agency users (tutors, agencyAdmins)
  if (user.agencyId) {
    return user.agencyId;
  }
  
  // For direct agency login (userType === 'agency')
  if (user.userType === 'agency') {
    return user.userId;
  }
  
  return null;
};

// POST /api/tenant/extract-metadata - Extract metadata from agency website
router.post('/extract-metadata', authenticateToken, asyncHandler(async (req, res) => {
  const { websiteUrl } = req.body;
  
  if (!websiteUrl) {
    return res.status(400).json({ 
      success: false,
      error: 'Website URL is required' 
    });
  }

  const agencyId = getAgencyIdFromUser(req.user);
  
  if (!agencyId) {
    return res.status(403).json({
      success: false,
      error: 'User must be associated with an agency'
    });
  }

  const metadata = await metadataExtractor.extractMetadata(websiteUrl);
  
  res.json({
    success: true,
    metadata,
    previewUrl: websiteUrl
  });
}));

// POST /api/tenant/save-customization - Save agency customization preferences
router.post('/save-customization', authenticateToken, asyncHandler(async (req, res) => {
  const { websiteUrl, customTheme, useCustomTheme } = req.body;
  
  const agencyId = getAgencyIdFromUser(req.user);
  
  if (!agencyId) {
    return res.status(403).json({
      success: false,
      error: 'User must be associated with an agency'
    });
  }

  const [tenantConfig, created] = await TenantConfig.upsert({
    agencyId: agencyId,
    websiteUrl,
    customTheme,
    useCustomTheme: useCustomTheme || false
  }, {
    returning: true
  });

  res.json({
    success: true,
    config: tenantConfig,
    created
  });
}));

// GET /api/tenant/config - Get tenant configuration for current agency
router.get('/config', authenticateToken, asyncHandler(async (req, res) => {
  const agencyId = getAgencyIdFromUser(req.user);
  
  if (!agencyId) {
    return res.json({
      success: true,
      config: null
    });
  }

  const config = await TenantConfig.findOne({ 
    where: { agencyId },
    include: [{
      model: Agency,
      as: 'agency',
      attributes: ['id', 'name', 'email']
    }]
  });

  res.json({
    success: true,
    config
  });
}));

export default router;