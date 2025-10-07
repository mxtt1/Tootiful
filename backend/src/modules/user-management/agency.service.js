import { Agency, Location, User } from '../../models/index.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import { createAndEmailVerificationLinkForAgency, createAndEmailVerificationLink } from "../user-management/emailVerification.service.js";

class AgencyService {
    // Route handler methods with complete HTTP response logic
    async handleGetAllAgencies(req, res) {
        const { page, limit, active } = req.query;
        const result = await this.getAgencies({ page, limit, active });
        const data = result.rows.map(agency => {
            const { password, ...agencyResponse } = agency.toJSON();
            return agencyResponse;
        });
        let pagination = undefined;
        if (page && limit) {
            pagination = {
                total: result.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.count / limit)
            };
        }
        res.status(200).json({
            data,
            ...(pagination ? { pagination } : {})
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
            firstName, lastName, email, password, agencyId,
        });

        const { password: _, ...agencyAdminResponse } = newAgencyAdmin.toJSON();
        res.status(201).json(agencyAdminResponse);
        
        // send verification link
        try {
        const r = await createAndEmailVerificationLink({ user: newAgencyAdmin, email: newAgencyAdmin.email });
        if (!r.ok && r.message) console.warn("Admin verification email throttled/soft-fail:", r.message);
        } catch (err) {
        console.error("Failed to send admin verification email:", err);
        }
    }

    // DELETE Agency Admin - FIXED
    async handleDeleteAgencyAdmin(req, res) {
        const { id: agencyId, adminId } = req.params;
        await this.deleteAgencyAdmin(adminId, agencyId);
        res.status(200).json({ message: 'Agency admin deleted successfully', deletedAdmin: { id: adminId } });
    }

    async handleGetAgencyAdmins(req, res) {
        const { id: agencyId } = req.params;
        const { limit = 10, offset = 0 } = req.query;
        const { count, rows } = await User.findAndCountAll({
            where: {
                agencyId: agencyId,
                role: 'agencyAdmin'
            },
            attributes: { exclude: ['password'] },
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json({
            rows,
            totalCount: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    }

    // Add similar try-catch blocks to other handler methods...
    async handleGetAgencyById(req, res) {
        const { id } = req.params;
        const agency = await this.getAgencyById(id);
        const { password, ...agencyResponse } = agency.toJSON();
        res.status(200).json(agencyResponse);
    }

    async handleUpdateAgency(req, res) {
        const { id } = req.params;
        const updateData = req.body;

        if (updateData.password) {
            return res.status(400).json({
                success: false,
                message: 'Use the password change endpoint to update passwords'
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
                total: locations.length
            });
        } catch (error) {
            console.error("Error fetching agency locations:", error);
            res.status(500).json({
                success: false,
                message: error.message
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
        const location = await Location.findOne({
            where: { id: locationId, agencyId: agencyId }
        });
        if (!location) {
            return res.status(404).json({ message: 'Location not found' });
        }
        await location.destroy();
        res.status(200).json({ message: 'Location deleted successfully' });
    }

    // Business logic methods
    async createAgency(agencyData) {
        // Check if email already exists
        const existingAgency = await Agency.findOne({ where: { email: agencyData.email } });
        if (existingAgency) {
            throw new Error('Agency with this email already exists');
        }

        // Check if email already exists in User table
        const existingUser = await User.findOne({ where: { email: agencyData.email } });
        if (existingUser) {
            throw new Error('Email already exists for a user');
        }

        // Check if name already exists
        const existingName = await Agency.findOne({ where: { name: agencyData.name } });
        if (existingName) {
            throw new Error('Agency with this name already exists');
        }

        // Check phone uniqueness
        if (agencyData.phone) {
            const existingPhone = await Agency.findOne({ where: { phone: agencyData.phone } });
            if (existingPhone) {
            throw new Error('Phone number already exists');
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
            console.warn("Verification email wasn’t sent (cooldown or soft fail):", r.message);
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
            where.isActive = active === 'true' || active === true;
        }

        const queryOptions = {
            attributes: { exclude: ['password'] },
            where,
            order: [['createdAt', 'DESC']]
        };

        if (page && limit) {
            queryOptions.limit = parseInt(limit);
            queryOptions.offset = (parseInt(page) - 1) * parseInt(limit);
        }

        return await Agency.findAndCountAll(queryOptions);
    }

    async getAgencyById(id) {
        const agency = await Agency.findByPk(id);
        if (!agency) {
            throw new Error('Agency not found');
        }
        return agency;
    }

    async updateAgency(id, updateData) {
        if (updateData.email) {
            const existingAgency = await Agency.findOne({ where: { email: updateData.email } });
            if (existingAgency && existingAgency.id !== id) {
                throw new Error('Email already exists for another agency');
            }
        }

        if (updateData.name) {
            const existingName = await Agency.findOne({ where: { name: updateData.name } });
            if (existingName && existingName.id !== id) {
                throw new Error('Agency name already exists');
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
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, agency.password);

        if (!isValidCurrentPassword) {
            throw new Error('Current password is incorrect');
        }

        return await agency.update({ password: newPassword });
    }

    async createAgencyAdmin(agencyAdminData) {
        // Check if email already exists
        const existingUser = await User.findOne({ where: { email: agencyAdminData.email } });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        // Check if email already exists in Agency table
        const existingAgency = await Agency.findOne({ where: { email: agencyAdminData.email } });
        if (existingAgency) {
            throw new Error('Email already exists for an agency');
        }
           return await User.create({
            ...agencyAdminData,
            role: 'agencyAdmin',
            isActive: false,          // must verify before login
        });
    }
    
    async deleteAgencyAdmin(adminId, agencyId) {
        console.log(`Deleting agency admin: adminId=${adminId}, agencyId=${agencyId}`)
        const agencyAdmin = await User.findOne({ 
            where: { 
                id: adminId, 
                role: 'agencyAdmin',
                agencyId: agencyId
            } 
        });
        if (!agencyAdmin) {
            throw new Error('Agency Admin not found');
        }
        await agencyAdmin.destroy();
    }


    async getAgencyLocations(agencyId) {
        return await Location.findAll({
            where: { agencyId },
            order: [['createdAt', 'DESC']]
        });
    }

    async createLocation(agencyId, locationData) {
        return await Location.create({
            ...locationData,
            agencyId
        });
    }

}

export default AgencyService;