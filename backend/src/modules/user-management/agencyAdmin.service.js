import { User } from '../../models/index.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';

class AgencyAdminService {
    // Route handler methods with complete HTTP response logic
    

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

    // Business logic methods
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
