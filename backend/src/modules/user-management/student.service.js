import { Student } from './user.model.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import gradeLevelEnum from '../../util/enum/gradeLevelEnum.js';

class StudentService {
    // Route handler methods with complete HTTP response logic
    async handleGetAllStudents(req, res) {
        const { page = 1, limit = 10, active, gradeLevel } = req.query;

        // Handle multivalued parameters - convert to arrays if needed
        const gradeLevels = Array.isArray(gradeLevel) ? gradeLevel : (gradeLevel ? [gradeLevel] : []);

        // Validate grade levels if provided
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

        res.status(200).json({
            data: result.rows,
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

        // Manual password sanitization
        const { password, ...studentResponse } = student.toJSON();

        res.status(200).json(studentResponse);
    }

    async handleCreateStudent(req, res) {
        const studentData = req.body;
        const newStudent = await this.createStudent(studentData);

        // Remove password from response
        const { password, ...studentResponse } = newStudent.toJSON();

        res.status(201).json(studentResponse);
    }



    async handleUpdateStudent(req, res) {
        const { id } = req.params;
        const updateData = req.body;

        // Prevent password updates through this route
        if (updateData.password) {
            return res.status(400).json({
                success: false,
                message: 'Use the password change endpoint to update passwords'
            });
        }

        const updatedStudent = await this.updateStudent(id, updateData);

        // Remove password from response
        const { password, ...studentResponse } = updatedStudent.toJSON();

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

    async handleDeactivateStudent(req, res) {
        const { id } = req.params;
        await this.deactivateStudent(id);

        res.sendStatus(200);
    }

    // Business logic methods
    async createStudent(studentData) {
        // Check if email already exists
        const existingStudent = await Student.findOne({ where: { email: studentData.email } });
        if (existingStudent) {
            throw new Error('Student with this email already exists');
        }

        return await Student.create(studentData);
    }

    async getStudents(options = {}) {
        const { page = 1, limit = 10, gradeLevels = [], active } = options;
        const offset = (page - 1) * limit;

        // Build where clause dynamically
        const where = {};

        // Handle multiple grade levels
        if (gradeLevels.length > 0) {
            if (gradeLevels.length === 1) {
                where.gradeLevel = gradeLevels[0];
            } else {
                where.gradeLevel = {
                    [Op.in]: gradeLevels
                };
            }
        }

        // Filter by active status
        if (active !== undefined) {
            where.isActive = active === 'true' || active === true;
        }

        return await Student.findAndCountAll({
            attributes: { exclude: ['password'] },
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });
    }

    async getStudentById(id) {
        const student = await Student.findByPk(id);
        if (!student) {
            throw new Error('Student not found');
        }
        return student;
    }

    async getStudentByEmail(email) {
        return await Student.findOne({ where: { email } });
    }

    async updateStudent(id, updateData) {
        // If email is being updated, check if it already exists
        if (updateData.email) {
            const existingStudent = await Student.findOne({ where: { email: updateData.email } });
            if (existingStudent && existingStudent.id !== id) {
                throw new Error('Email already exists for another student');
            }
        }

        const student = await this.getStudentById(id);
        return await student.update(updateData);
    }

    async deleteStudent(id) {
        const student = await this.getStudentById(id);
        await student.destroy();
    }

    async deactivateStudent(id) {
        return await this.updateStudent(id, { isActive: false });
    }

    async authenticateStudent(email, password) {
        const student = await this.getStudentByEmail(email);
        if (!student) {
            throw new Error('Invalid email or password');
        }

        const isValidPassword = await bcrypt.compare(password, student.password);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        // Return student without password
        const { password: _, ...studentData } = student.toJSON();
        return studentData;
    }

    async changePassword(studentId, currentPassword, newPassword) {
        const student = await this.getStudentById(studentId);

        // Verify current password
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, student.password);
        if (!isValidCurrentPassword) {
            throw new Error('Current password is incorrect');
        }

        // Update with new password (will be automatically hashed by model hook)
        return await student.update({ password: newPassword });
    }
}

export default StudentService;
