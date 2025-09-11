import { User } from '../../models/index.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import gradeLevelEnum from '../../util/enum/gradeLevelEnum.js';

class StudentService {
    // Route handler methods with complete HTTP response logic
    async handleGetAllStudents(req, res) {
        const { page = 1, limit = 10, active, gradeLevel } = req.query;
        const gradeLevels = Array.isArray(gradeLevel) ? gradeLevel : (gradeLevel ? [gradeLevel] : []);
        if (gradeLevels.length > 0) {
            const invalidLevels = gradeLevels.filter(level => !gradeLevelEnum.isValidLevel(level));
            if (invalidLevels.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid grade levels: ${invalidLevels.join(', ')}`
                });
            }
        }
        const result = await this.getStudents({ page, limit, active, gradeLevels });
        // Only return student-relevant fields
        const data = result.rows.map(user => {
            const { password, role, hourlyRate, aboutMe, education, ...student } = user.toJSON();
            return student;
        });
        res.status(200).json({
            data,
            pagination: {
                total: result.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(result.count / limit)
            }
        });
    }

    async handleGetStudentById(req, res) {
        const { id } = req.params;
        const student = await this.getStudentById(id);
        const { password, role, hourlyRate, aboutMe, education, ...studentResponse } = student.toJSON();
        res.status(200).json(studentResponse);
    }

    async handleCreateStudent(req, res) {
        const studentData = req.body;
        const newStudent = await this.createStudent(studentData);
        const { password, role, hourlyRate, aboutMe, education, ...studentResponse } = newStudent.toJSON();
        res.status(201).json(studentResponse);
    }

    async handleUpdateStudent(req, res) {
        const { id } = req.params;
        const updateData = req.body;
        if (updateData.password) {
            return res.status(400).json({
                success: false,
                message: 'Use the password change endpoint to update passwords'
            });
        }
        const updatedStudent = await this.updateStudent(id, updateData);
        const { password, role, hourlyRate, aboutMe, education, ...studentResponse } = updatedStudent.toJSON();
        res.status(200).json(studentResponse);
    }

    async handleChangePassword(req, res) {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        await this.changePassword(id, currentPassword, newPassword);

        res.sendStatus(200);
    }

    async handleDeleteStudent(req, res) {
        const { id } = req.params;
        await this.deleteStudent(id);

        res.sendStatus(200);
    }

    // Business logic methods
    async createStudent(studentData) {
        // Check if email already exists
        const existingUser = await User.findOne({ where: { email: studentData.email} });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        return await User.create({ ...studentData, role: 'student' });
    }

    async getStudents(options = {}) {
        const { page = 1, limit = 10, gradeLevels = [], active } = options;
        const offset = (page - 1) * limit;
        const where = { role: 'student' };
        if (gradeLevels.length > 0) {
            if (gradeLevels.length === 1) {
                where.gradeLevel = gradeLevels[0];
            } else {
                where.gradeLevel = {
                    [Op.in]: gradeLevels
                };
            }
        }
        if (active !== undefined) {
            where.isActive = active === 'true' || active === true;
        }
        return await User.findAndCountAll({
            attributes: { exclude: ['password'] },
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });
    }

    async getStudentById(id) {
        const student = await User.findOne({ where: { id, role: 'student' } });
        if (!student) {
            throw new Error('Student not found');
        }
        return student;
    }

    async updateStudent(id, updateData) {
        if (updateData.email) {
            const existingUser = await User.findOne({ where: { email: updateData.email} });
            if (existingUser && existingUser.id !== id) {
                throw new Error('Email already exists for another user');
            }
        }
        const student = await this.getStudentById(id);
        return await student.update(updateData);
    }

    async deleteStudent(id) {
        const student = await this.getStudentById(id);
        await student.destroy();
    }

    async changePassword(studentId, currentPassword, newPassword) {
        const student = await this.getStudentById(studentId);
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, student.password);
        if (!isValidCurrentPassword) {
            throw new Error('Current password is incorrect');
        }
        return await student.update({ password: newPassword });
    }
}

export default StudentService;
