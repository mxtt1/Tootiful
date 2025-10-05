import { User } from '../../models/index.js';
import { fn, col, where as sqWhere } from 'sequelize';
import bcrypt from 'bcrypt';
import { createAndEmailVerificationLink } from "./emailVerification.service.js";

class AgencyAdminService {
    // Route handler methods with complete HTTP response logic
    

    async handleGetAgencyAdminById(req, res) {
        const { id } = req.params;
        const user = req.user;

        const agencyAdmin = await this.getAgencyAdminById(id);

        const { password, role, hourlyRate, aboutMe, education, dateOfBirth, gender, gradeLevel, image, ...agencyAdminResponse } = agencyAdmin.toJSON();
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
        // const updatedAgencyAdmin = await this.updateAgencyAdmin(id, updateData);
        // const { password, role, hourlyRate, aboutMe, education, dateOfBirth, gender, gradeLevel, image, ...agencyAdminResponse } = updatedAgencyAdmin.toJSON();
        // res.status(200).json(agencyAdminResponse);
        const { admin: updatedAgencyAdmin, emailChanged } =
        await this.updateAgencyAdmin(id, updateData);
        const { password, role, hourlyRate, aboutMe, education, dateOfBirth, gender, gradeLevel, image, ...agencyAdminResponse } = updatedAgencyAdmin.toJSON();
        res.status(200).json({
            ...agencyAdminResponse,
            requiresEmailVerification: emailChanged,
            ...(emailChanged
            ? { message: "Email updated. A verification link has been sent to your new address." }
            : {}),
        });
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
        // if (updateData.email) {
        //     const existingUser = await User.findOne({ where: { email: updateData.email } });
        //     if (existingUser && existingUser.id !== id) {
        //         throw new Error('Email already exists for another user');
        //     }
        // }
        // const agencyAdmin = await this.getAgencyAdminById(id);
        // return await agencyAdmin.update(updateData);
        const admin = await this.getAgencyAdminById(id);

        // detect case-insensitive email change
        const newEmailLC = updateData.email
            ? String(updateData.email).trim().toLowerCase()
            : null;
        const currentEmailLC = String(admin.email).toLowerCase();
        const emailChanged = !!newEmailLC && newEmailLC !== currentEmailLC;

        // uniqueness checks only when changing email
        if (emailChanged) {
            const clashUser = await User.findOne({
            where: sqWhere(fn("lower", col("email")), newEmailLC),
            });
            if (clashUser && clashUser.id !== id) {
            throw new Error("Email already exists for another user");
            }
        }

        if (emailChanged) {
            // Write the new email immediately and require re-verification
            admin.email = newEmailLC;
            admin.isActive = false;
            await admin.save();

            try {
                const out = await createAndEmailVerificationLink({ user: admin, email: newEmailLC });
                if (!out.ok && out.message) {
                console.warn("AgencyAdmin email-change: verification throttled/soft fail:", out.message);
                }
            } catch (err) {
                console.error("AgencyAdmin email-change: failed to send verification email:", err);
            }
            }

            // Apply other (non-email) updates if any
            const patch = { ...updateData };
            delete patch.email;
            if (Object.keys(patch).length) {
            await admin.update(patch);
            }
            return { admin, emailChanged };

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
