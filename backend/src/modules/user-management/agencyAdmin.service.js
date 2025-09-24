import { Agency, User } from '../../models/index.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';

class AgencyAdminService {
    // Route handler methods with complete HTTP response logic
    async handleGetAllAgencyAdmins(req, res) {
        const { page, limit } = req.query;
        const user = req.user;

        if (!user.agencyId) {
            return res.status(403).json({ message: 'Super admin must be associated with an agency' });
        }

        const where = { 
            role: 'agencyAdmin',
            agencyId: user.agencyId  // filter by super admin's agency
        };

        const result = await this.getAgencyAdmins({ page, limit, where });

        // Only return agencyAdmin-relevant fields
        const data = result.rows.map(user => {
            const { password, role, hourlyRate, aboutMe, education, dateOfBirth, gender, gradeLevel, image, phone, ...agencyAdmin } = user.toJSON();
            return agencyAdmin;
        });
        // Only include pagination if page and limit are present
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

    async handleGetAgencyAdminById(req, res) {
        const { id } = req.params;
        const user = req.user;

        const agencyAdmin = await this.getAgencyAdminById(id);

        if (user.role === 'superAgencyAdmin' && agencyAdmin.agencyId !== user.agencyId) {
            return res.status(403).json({ message: 'Access denied to agency admin from different agency' });
        }

        const { password, role, hourlyRate, aboutMe, education, dateOfBirth, gender, gradeLevel, image, phone, ...agencyAdminResponse } = agencyAdmin.toJSON();
        res.status(200).json(agencyAdminResponse);
    }

    async handleCreateAgencyAdmin(req, res) {
        const agencyAdminData = req.body;
        const user = req.user;

        // set agencyId to superAgencyAdmin's agency
        agencyAdminData.agencyId = user.agencyId;

        const newAgencyAdmin = await this.createAgencyAdmin(agencyAdminData);
        const { password, role, hourlyRate, aboutMe, education, dateOfBirth, gender, gradeLevel, image, phone, ...agencyAdminResponse } = newAgencyAdmin.toJSON();
        res.status(201).json(agencyAdminResponse);
    }

    async handleUpdateAgencyAdmin(req, res) {
        const { id } = req.params;
        const updateData = req.body;
        if (updateData.password) {
            return res.status(400).json({
                success: false,
                message: 'Use the password change endpoint to update passwords'
            });
        }
        const updatedAgencyAdmin = await this.updateAgencyAdmin(id, updateData);
        const { password, role, hourlyRate, aboutMe, education, dateOfBirth, gender, gradeLevel, image, phone, ...agencyAdminResponse } = updatedAgencyAdmin.toJSON();
        res.status(200).json(agencyAdminResponse);
    }

    async handleChangePassword(req, res) {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        await this.changePassword(id, currentPassword, newPassword);

        res.sendStatus(200);
    }

    async handleDeleteAgencyAdmin(req, res) {
        const { id } = req.params;
        await this.deleteAgencyAdmin(id);

        res.sendStatus(200);
    }

    // Business logic methods
    async createAgencyAdmin(agencyAdminData) {
        // Check if email already exists
        const existingUser = await User.findOne({ where: { email: agencyAdminData.email } });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        return await User.create({ ...agencyAdminData, role: 'agencyAdmin' });
    }

    async getAgencyAdmins(options = {}) {
        const { page, limit, where = {} } = options;

        const finalWhere = {
        role: 'agencyAdmin', // base filter
        ...where  // includes agencyId from handleGetAllAgencyAdmins
    };

        const queryOptions = {
            attributes: { exclude: ['password'] },
            where: finalWhere,
            order: [['createdAt', 'DESC']]
        };
        if (page && limit) {
            queryOptions.limit = parseInt(limit);
            queryOptions.offset = (parseInt(page) - 1) * parseInt(limit);
        }
        return await User.findAndCountAll(queryOptions);
    }

    async getAgencyAdminById(id) {
        const agencyAdmin = await User.findOne({ where: { id, role: 'agencyAdmin' } });
        if (!agencyAdmin) {
            throw new Error('Agency Admin not found');
        }
        return agencyAdmin;
    }

    async updateAgencyAdmin(id, updateData) {
        if (updateData.email) {
            const existingUser = await User.findOne({ where: { email: updateData.email } });
            if (existingUser && existingUser.id !== id) {
                throw new Error('Email already exists for another user');
            }
        }
        const agencyAdmin = await this.getAgencyAdminById(id);
        return await agencyAdmin.update(updateData);
    }

/*
    async updateAgencyLocation(id, locations = []) {
        const agency = await this.getAgencyById(id);
        return await agency.update({ locations });
    }
        */

    async deleteAgencyAdmin(id) {
        const agencyAdmin = await this.getAgencyAdminById(id);
        await agencyAdmin.destroy();
    }

    async changePassword(agencyAdminId, currentPassword, newPassword) {
        const agencyAdmin = await this.getAgencyAdminById(agencyAdminId);
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, agencyAdmin.password);
        if (!isValidCurrentPassword) {
            throw new Error('Current password is incorrect');
        }
        return await agencyAdmin.update({ password: newPassword });
    }
}

export default AgencyAdminService;
