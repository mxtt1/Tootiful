import { TenantConfig, Agency } from "../../models/index.js";
import metadataExtractor from "../../util/metadataExtractor.js";

class TenantService {
  // Helper function to get agencyId from authenticated user
  getAgencyIdFromUser(user) {
    // For agency users (tutors, agencyAdmins)
    if (user.agencyId) {
      return user.agencyId;
    }
    
    // For direct agency login (userType === 'agency')
    if (user.userType === 'agency') {
      return user.userId;
    }
    
    return null;
  }

  // Route handler methods with complete HTTP response logic
  async handleExtractMetadata(req, res) {
    const { websiteUrl } = req.body;
    
    if (!websiteUrl) {
      return res.status(400).json({ 
        success: false,
        error: 'Website URL is required' 
      });
    }

    const agencyId = this.getAgencyIdFromUser(req.user);
    
    if (!agencyId) {
      return res.status(403).json({
        success: false,
        error: 'User must be associated with an agency'
      });
    }

    const metadata = await this.extractMetadata(websiteUrl);
    
    res.json({
      success: true,
      metadata,
      previewUrl: websiteUrl
    });
  }

  async handleSaveCustomization(req, res) {
    const { websiteUrl, customTheme, useCustomTheme } = req.body;
    
    const agencyId = this.getAgencyIdFromUser(req.user);
    
    if (!agencyId) {
      return res.status(403).json({
        success: false,
        error: 'User must be associated with an agency'
      });
    }

    const config = await this.saveCustomization({
      agencyId,
      websiteUrl,
      customTheme,
      useCustomTheme
    });

    res.json({
      success: true,
      config,
      created: true
    });
  }

  async handleGetConfig(req, res) {
    const agencyId = this.getAgencyIdFromUser(req.user);
    
    if (!agencyId) {
      return res.json({
        success: true,
        config: null
      });
    }

    const config = await this.getConfig(agencyId);

    res.json({
      success: true,
      config
    });
  }

  async handleUpdateCustomization(req, res) {
    const { websiteUrl, customTheme, useCustomTheme } = req.body;
    
    const agencyId = this.getAgencyIdFromUser(req.user);
    
    if (!agencyId) {
      return res.status(403).json({
        success: false,
        error: 'User must be associated with an agency'
      });
    }

    const config = await this.updateCustomization({
      agencyId,
      websiteUrl,
      customTheme,
      useCustomTheme
    });

    res.json({
      success: true,
      config
    });
  }

  // Business logic methods
  async extractMetadata(websiteUrl) {
    return await metadataExtractor.extractMetadata(websiteUrl);
  }

  async saveCustomization(customizationData) {
    const { agencyId, websiteUrl, customTheme, useCustomTheme } = customizationData;

    const [tenantConfig] = await TenantConfig.upsert({
      agencyId: agencyId,
      websiteUrl,
      customTheme,
      useCustomTheme: useCustomTheme || false
    }, {
      returning: true
    });

    return tenantConfig;
  }

  async getConfig(agencyId) {
    const config = await TenantConfig.findOne({ 
      where: { agencyId },
      include: [{
        model: Agency,
        as: 'agency',
        attributes: ['id', 'name', 'email']
      }]
    });

    return config;
  }

  async updateCustomization(updateData) {
    const { agencyId, websiteUrl, customTheme, useCustomTheme } = updateData;

    const [updated] = await TenantConfig.update({
      websiteUrl,
      customTheme,
      useCustomTheme: useCustomTheme || false,
      updatedAt: new Date()
    }, {
      where: { agencyId },
      returning: true
    });

    if (!updated) {
      throw new Error('Customization not found');
    }

    const config = await TenantConfig.findOne({ where: { agencyId } });
    return config;
  }
}

export default TenantService;