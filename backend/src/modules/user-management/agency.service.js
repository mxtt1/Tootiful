import Agency from '../../models/agency.model.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';

class AgencyService {
    // Route handler methods with complete HTTP response logic
    async handleGetAllAgencies(req, res) {
        try {
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
        } catch (error) {
            console.error('Get all agencies error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async handleCreateAgency(req, res) {
        try {
            const agencyData = req.body;
            console.log('Creating agency with data:', agencyData); // Add logging

            const newAgency = await this.createAgency(agencyData);
            const { password, ...agencyResponse } = newAgency.toJSON();

            console.log('Agency created successfully:', agencyResponse); // Add logging
            res.status(201).json(agencyResponse);
        } catch (error) {
            console.error('Create agency error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    // Add similar try-catch blocks to other handler methods...
    async handleGetAgencyById(req, res) {
        try {
            const { id } = req.params;
            const agency = await this.getAgencyById(id);
            const { password, ...agencyResponse } = agency.toJSON();
            res.status(200).json(agencyResponse);
        } catch (error) {
            console.error('Get agency by ID error:', error);
            res.status(404).json({ error: error.message });
        }
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

    // Business logic methods
    async createAgency(agencyData) {
        // Check if email already exists
        const existingAgency = await Agency.findOne({ where: { email: agencyData.email } });
        if (existingAgency) {
            throw new Error('Agency with this email already exists');
        }

        // Check if name already exists
        const existingName = await Agency.findOne({ where: { name: agencyData.name } });
        if (existingName) {
            throw new Error('Agency with this name already exists');
        }

        return await Agency.create({
            ...agencyData,
            isActive: false // Default to inactive for new agencies
        });
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
}

export default AgencyService;