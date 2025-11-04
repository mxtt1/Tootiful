import { Agency, Location, User, Lesson } from "../../models/index.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import metadataExtractor from '../../util/metadataExtractor.js'; 
import {
  createAndEmailVerificationLinkForAgency,
  createAndEmailVerificationLink,
} from "../user-management/emailVerification.service.js";

class AgencyService {
  // Route handler methods with complete HTTP response logic
  async handleGetAllAgencies(req, res) {
    const { page, limit, active } = req.query;
    const result = await this.getAgencies({ page, limit, active });
    const data = result.rows.map((agency) => {
      const { password, ...agencyResponse } = agency.toJSON();
      return agencyResponse;
    });
    let pagination = undefined;
    if (page && limit) {
      pagination = {
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / limit),
      };
    }
    res.status(200).json({
      data,
      ...(pagination ? { pagination } : {}),
    });
  }

  async handleCreateAgency(req, res) {
    const agencyData = req.body;
    const newAgency = await this.createAgency(agencyData);
    const { password, ...agencyResponse } = newAgency.toJSON();
    res.status(201).json(agencyResponse);
  }

  async handleCreateAgencyAdmin(req, res) {
    const { id: agencyId } = req.params; // Agency ID from URL
    const { firstName, lastName, email, password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    const newAgencyAdmin = await this.createAgencyAdmin({
      firstName,
      lastName,
      email,
      password,
      agencyId,
    });

    const { password: _, ...agencyAdminResponse } = newAgencyAdmin.toJSON();
    res.status(201).json(agencyAdminResponse);

    // send verification link
    try {
      const r = await createAndEmailVerificationLink({
        user: newAgencyAdmin,
        email: newAgencyAdmin.email,
      });
      if (!r.ok && r.message)
        console.warn(
          "Admin verification email throttled/soft-fail:",
          r.message
        );
    } catch (err) {
      console.error("Failed to send admin verification email:", err);
    }
  }

  // DELETE Agency Admin - FIXED
  async handleDeleteAgencyAdmin(req, res) {
    const { id: agencyId, adminId } = req.params;
    await this.deleteAgencyAdmin(adminId, agencyId);
    res
      .status(200)
      .json({
        message: "Agency admin deleted successfully",
        deletedAdmin: { id: adminId },
      });
  }

  async handleGetAgencyAdmins(req, res) {
    const { id: agencyId } = req.params;
    const { limit = 10, offset = 0 } = req.query; // Gets pagination from query params
    const { count, rows } = await User.findAndCountAll({
      where: {
        agencyId: agencyId,
        role: "agencyAdmin",
      },
      attributes: { exclude: ["password"] },
      limit: parseInt(limit), // Uses limit from frontend
      offset: parseInt(offset), // Uses offset from frontend
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({
      rows,
      totalCount: count, // Sends total count for pagination calc
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  }

  // Add similar try-catch blocks to other handler methods...
  async handleGetAgencyById(req, res) {
    const { id } = req.params;
    const agency = await this.getAgencyById(id);
    const { password, ...agencyResponse } = agency.toJSON();
    res.status(200).json({
      success: true,
      data: agencyResponse,
    });
  }

  // Public endpoints for students
  async handleGetPublicAgencies(req, res) {
    const result = await this.getPublicAgencies();
    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async handleGetPublicAgencyById(req, res) {
    const { id } = req.params;
    const agency = await this.getPublicAgencyById(id);
    res.status(200).json({
      success: true,
      data: agency,
    });
  }

  async handleGetAllLocations(req, res) {
    try {
      const locations = await this.getAllUniqueLocations();
      res.status(200).json({
        success: true,
        data: locations,
      });
    } catch (error) {
      console.error("Error fetching all locations:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async handleUpdateAgency(req, res) {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.password) {
      return res.status(400).json({
        success: false,
        message: "Use the password change endpoint to update passwords",
      });
    }

    const updatedAgency = await this.updateAgency(id, updateData);
    const { password, ...agencyResponse } = updatedAgency.toJSON();
    res.status(200).json(agencyResponse);
  }

  async handleChangePassword(req, res) {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    await this.changePassword(id, currentPassword, newPassword);
    res.sendStatus(200);
  }

  async handleDeleteAgency(req, res) {
    const { id } = req.params;
    await this.deleteAgency(id);
    res.sendStatus(200);
  }

  async handleGetAgencyLocations(req, res) {
    try {
      const { id } = req.params;
      const locations = await this.getAgencyLocations(id);
      res.status(200).json({
        success: true,
        data: locations, // nest locations in data property
        total: locations.length,
      });
    } catch (error) {
      console.error("Error fetching agency locations:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async handleCreateLocation(req, res) {
    const { id } = req.params;
    const locationData = req.body;
    const newLocation = await this.createLocation(id, locationData);
    res.status(201).json(newLocation);
  }

  async handleDeleteLocation(req, res) {
    const { agencyId, locationId } = req.params;
    //check if location is used in any lessons
    const lessonsUsingLocation = await Lesson.findAll({
      where: {
        locationId: locationId,
        agencyId: agencyId,
      },
      limit: 1, // We only need to know if at least one lesson uses it
    });

    if (lessonsUsingLocation.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete location as it is associated with existing lessons",
        error: "LOCATION_IN_USE",
      });
    }
    // but if no lessons use it, then proceed to delete
    const location = await Location.findOne({
      where: { id: locationId, agencyId: agencyId },
    });
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }
    await location.destroy();
    res.status(200).json({ message: "Location deleted successfully" });
  }

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

    try {
      const metadata = await metadataExtractor.extractMetadata(websiteUrl);
      
      res.json({
        success: true,
        metadata,
        previewUrl: websiteUrl
      });
    } catch (error) {
      console.error('Error extracting metadata:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to extract website metadata'
      });
    }
  }

  async handleSaveCustomization(req, res) {
    const { websiteUrl, customTheme, metadata, useCustomTheme, name, aboutUs } = req.body;
    
    const agencyId = this.getAgencyIdFromUser(req.user);
    
    if (!agencyId) {
      return res.status(403).json({
        success: false,
        error: 'User must be associated with an agency'
      });
    }

    try {
      // Extract potential image from metadata to update agency image
      let imageToUpdate = null;
      if (metadata) {
        imageToUpdate = metadata.displayImage || 
                      metadata.logo || 
                      metadata.ogImage || 
                      metadata.twitterImage ||
                      metadata.largeIcon;
      }

      const updateData = {
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(customTheme !== undefined && { customTheme }),
        ...(metadata !== undefined && { metadata }),
        ...(useCustomTheme !== undefined && { useCustomTheme: Boolean(useCustomTheme) }),
        ...(name !== undefined && { name }),
        ...(aboutUs !== undefined && { aboutUs }),
        ...(imageToUpdate && { image: imageToUpdate })
      };

      const [updatedCount, [updatedAgency]] = await Agency.update(updateData, {
        where: { id: agencyId },
        returning: true
      });

      if (updatedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Agency not found'
        });
      }

      // SIMPLIFIED RESPONSE - No more nested agency object
      const config = {
        id: updatedAgency.id,
        name: updatedAgency.name,
        email: updatedAgency.email,
        aboutUs: updatedAgency.aboutUs,
        image: updatedAgency.image,
        phone: updatedAgency.phone,
        websiteUrl: updatedAgency.websiteUrl,
        useCustomTheme: updatedAgency.useCustomTheme,
        metadata: updatedAgency.metadata || {},
        customTheme: updatedAgency.customTheme || {}
      };

      res.json({
        success: true,
        config,
        message: 'Customization saved successfully'
      });

    } catch (error) {
      console.error('Error saving customization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save customization'
      });
    }
  }
  async handleGetCustomization(req, res) {
    const agencyId = this.getAgencyIdFromUser(req.user);
    
    if (!agencyId) {
      return res.json({
        success: true,
        config: null
      });
    }

    try {
      const agency = await Agency.findByPk(agencyId, {
        attributes: [
          'id', 'name', 'email', 'phone', 'image', 'aboutUs', 
          'websiteUrl', 'useCustomTheme', 'metadata', 'customTheme',
          'isActive', 'createdAt', 'updatedAt'
        ]
      });

      if (!agency) {
        return res.json({
          success: true,
          config: null
        });
      }

      // SIMPLIFIED RESPONSE
      const config = {
        id: agency.id,
        name: agency.name,
        email: agency.email,
        aboutUs: agency.aboutUs,
        image: agency.image,
        phone: agency.phone,
        websiteUrl: agency.websiteUrl,
        useCustomTheme: agency.useCustomTheme,
        metadata: agency.metadata || {},
        customTheme: agency.customTheme || {}
      };

      res.json({
        success: true,
        config
      });

    } catch (error) {
      console.error('Error getting customization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load customization'
      });
    }
  }
  async handleResetCustomization(req, res) {
    const agencyId = this.getAgencyIdFromUser(req.user);
    
    if (!agencyId) {
      return res.status(403).json({
        success: false,
        error: 'User must be associated with an agency'
      });
    }

    try {
      const [updatedCount, [updatedAgency]] = await Agency.update({
        websiteUrl: null,
        useCustomTheme: false,
        metadata: {},
        customTheme: {}
      }, {
        where: { id: agencyId },
        returning: true
      });

      if (updatedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Agency not found'
        });
      }

      res.json({
        success: true,
        message: 'Customization reset to default',
        config: null
      });

    } catch (error) {
      console.error('Error resetting customization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset customization'
      });
    }
  }

  // Helper function to get agencyId from authenticated user
  getAgencyIdFromUser(user) {
    // For agency users (tutors, agencyAdmins)
    if (user.agencyId) {
      return user.agencyId;
    }
    
    // For direct agency login (userType === 'agency')
    if (user.userType === 'agency') {
      return user.id; // Use user.id for direct agency login
    }
    
    return null;
  }

  // Business logic methods
  async createAgency(agencyData) {
    // Check if email already exists
    const existingAgency = await Agency.findOne({
      where: { email: agencyData.email },
    });
    if (existingAgency) {
      throw new Error("Agency with this email already exists");
    }

    // Check if email already exists in User table
    const existingUser = await User.findOne({
      where: { email: agencyData.email },
    });
    if (existingUser) {
      throw new Error("Email already exists for a user");
    }

    // Check if name already exists
    const existingName = await Agency.findOne({
      where: { name: agencyData.name },
    });
    if (existingName) {
      throw new Error("Agency with this name already exists");
    }

    // Check phone uniqueness
    if (agencyData.phone) {
      const existingPhone = await Agency.findOne({
        where: { phone: agencyData.phone },
      });
      if (existingPhone) {
        throw new Error("Phone number already exists");
      }
    }

    // creating of agency
    const agency = await Agency.create({
      ...agencyData,
      isActive: false,
    });
    // sending of verification email
    try {
      const r = await createAndEmailVerificationLinkForAgency(agency);
      if (!r.ok && r.message) {
        console.warn(
          "Verification email wasn’t sent (cooldown or soft fail):",
          r.message
        );
      }
    } catch (err) {
      console.error("Failed to send verification email:", err);
    }

    return agency;
  }

  async getAgencies(options = {}) {
    const { page, limit, active } = options;
    const where = {};

    if (active !== undefined) {
      where.isActive = active === "true" || active === true;
    }

    const queryOptions = {
      attributes: { exclude: ["password"] },
      where,
      order: [["createdAt", "DESC"]],
    };

    if (page && limit) {
      queryOptions.limit = parseInt(limit); // Sets limit
      queryOptions.offset = (parseInt(page) - 1) * parseInt(limit); // calculates offset
    }

    return await Agency.findAndCountAll(queryOptions); // return count + rows
  }

  async getAgencyById(id) {
    const agency = await Agency.findByPk(id);
    if (!agency) {
      throw new Error("Agency not found");
    }
    return agency;
  }

  async updateAgency(id, updateData) {
    if (updateData.email) {
      const existingAgency = await Agency.findOne({
        where: { email: updateData.email },
      });
      if (existingAgency && existingAgency.id !== id) {
        throw new Error("Email already exists for another agency");
      }
    }

    if (updateData.name) {
      const existingName = await Agency.findOne({
        where: { name: updateData.name },
      });
      if (existingName && existingName.id !== id) {
        throw new Error("Agency name already exists");
      }
    }

    const agency = await this.getAgencyById(id);
    return await agency.update(updateData);
  }

  async deleteAgency(id) {
    const agency = await this.getAgencyById(id);
    await agency.destroy();
  }

  async changePassword(agencyId, currentPassword, newPassword) {
    const agency = await this.getAgencyById(agencyId);
    const isValidCurrentPassword = await bcrypt.compare(
      currentPassword,
      agency.password
    );

    if (!isValidCurrentPassword) {
      throw new Error("Current password is incorrect");
    }

    return await agency.update({ password: newPassword });
  }

  async createAgencyAdmin(agencyAdminData) {
    // Check if email already exists
    const existingUser = await User.findOne({
      where: { email: agencyAdminData.email },
    });
    if (existingUser) {
      throw new Error("User with this email already exists");
    }
    // Check if email already exists in Agency table
    const existingAgency = await Agency.findOne({
      where: { email: agencyAdminData.email },
    });
    if (existingAgency) {
      throw new Error("Email already exists for an agency");
    }
    return await User.create({
      ...agencyAdminData,
      role: "agencyAdmin",
      isActive: false, // must verify before login
    });
  }

  async deleteAgencyAdmin(adminId, agencyId) {
    console.log(
      `Deleting agency admin: adminId=${adminId}, agencyId=${agencyId}`
    );
    const agencyAdmin = await User.findOne({
      where: {
        id: adminId,
        role: "agencyAdmin",
        agencyId: agencyId,
      },
    });
    if (!agencyAdmin) {
      throw new Error("Agency Admin not found");
    }
    await agencyAdmin.destroy(); // UPDATE users SET deletedAt = NOW()
  }

  // Public methods for students to browse agencies
  async getPublicAgencies() {
    const agencies = await Agency.findAll({
      where: {
        isActive: true,
        isSuspended: false,
      },
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "image",
        "aboutUs",
        "isActive",
      ],
      include: [
        {
          model: Location,
          as: "locations",
          attributes: ["id", "address"],
          required: false,
        },
      ],
      order: [["name", "ASC"]],
    });
    return agencies;
  }

  async getPublicAgencyById(id) {
    const agency = await Agency.findOne({
      where: {
        id: id,
        isActive: true,
        isSuspended: false,
      },
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "image",
        "aboutUs",
        "isActive",
      ],
    });

    if (!agency) {
      throw new Error("Agency not found or not active");
    }

    return agency;
  }

  async getAgencyLocations(agencyId) {
    return await Location.findAll({
      where: { agencyId },
      order: [["createdAt", "DESC"]], // newest first
    });
  }

  async createLocation(agencyId, locationData) {
    return await Location.create({
      ...locationData, // Spread address, name
      agencyId, // force association to agency
    });
  }

  async getAllUniqueLocations() {
    const locations = await Location.findAll({
      attributes: ["address"],
      where: {
        address: {
          [Op.ne]: null, // not null
          [Op.ne]: "", // not empty string
        },
      },
      group: ["address"],
      order: [["address", "ASC"]],
    });

    return locations.map((location) => location.address).filter(Boolean);
  }
}

export default AgencyService;
