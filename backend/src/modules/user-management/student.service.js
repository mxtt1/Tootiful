import { Student } from './user.model.js';
import bcrypt from 'bcrypt';

class StudentService {
  // Route handler methods with complete HTTP response logic
  async handleGetAllStudents(req, res) {
    try {
      const { page = 1, limit = 10, active, gradeLevel } = req.query;
      const options = { page, limit };

      if (gradeLevel) {
        const result = await this.getStudentsByGradeLevel(gradeLevel, options);
        return res.status(200).json({
          success: true,
          data: result.rows,
          pagination: {
            total: result.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(result.count / limit)
          }
        });
      }

      let result;
      if (active === 'true') {
        result = await this.getActiveStudents(options);
      } else {
        result = await this.getAllStudents(options);
      }

      res.status(200).json({
        success: true,
        data: result.rows,
        pagination: {
          total: result.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(result.count / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleGetStudentById(req, res) {
    try {
      const { id } = req.params;
      const student = await this.getStudentById(id);
      
      res.status(200).json({
        success: true,
        data: student
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleCreateStudent(req, res) {
    try {
      const studentData = req.body;
      const newStudent = await this.createStudent(studentData);
      
      // Remove password from response
      const { password, ...studentResponse } = newStudent.toJSON();
      
      res.status(201).json({
        success: true,
        data: studentResponse,
        message: 'Student created successfully'
      });
    } catch (error) {
      // Handle Sequelize validation errors
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: error.errors.map(e => e.message).join(', ')
        });
      }
      
      const statusCode = error.message.includes('already exists') ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleStudentLogin(req, res) {
    try {
      const { email, password } = req.body;
      const student = await this.authenticateStudent(email, password);
      
      res.status(200).json({
        success: true,
        data: student,
        message: 'Student authenticated successfully'
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleUpdateStudent(req, res) {
    try {
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
      
      res.status(200).json({
        success: true,
        data: studentResponse,
        message: 'Student updated successfully'
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('already exists') ? 409 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleChangePassword(req, res) {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      
      await this.changePassword(id, currentPassword, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      // Handle Sequelize validation errors
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: error.errors.map(e => e.message).join(', ')
        });
      }
      
      const statusCode = error.message.includes('not found') ? 404 : 
                        error.message.includes('incorrect') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleDeleteStudent(req, res) {
    try {
      const { id } = req.params;
      const result = await this.deleteStudent(id);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleDeactivateStudent(req, res) {
    try {
      const { id } = req.params;
      const updatedStudent = await this.deactivateStudent(id);
      
      res.status(200).json({
        success: true,
        data: updatedStudent,
        message: 'Student deactivated successfully'
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  // Business logic methods
  async createStudent(studentData) {
    try {
      // Check if email already exists
      const existingStudent = await Student.findOne({ where: { email: studentData.email } });
      if (existingStudent) {
        throw new Error('Student with this email already exists');
      }

      return await Student.create(studentData);
    } catch (error) {
      throw error;
    }
  }

  async getAllStudents(options = {}) {
    try {
      const { page = 1, limit = 10, where = {} } = options;
      const offset = (page - 1) * limit;
      
      return await Student.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Error fetching students: ${error.message}`);
    }
  }

  async getStudentById(id) {
    try {
      const student = await Student.findByPk(id);
      if (!student) {
        throw new Error('Student not found');
      }
      return student;
    } catch (error) {
      throw error;
    }
  }

  async getStudentByEmail(email) {
    try {
      return await Student.findOne({ where: { email } });
    } catch (error) {
      throw new Error(`Error finding student by email: ${error.message}`);
    }
  }

  async updateStudent(id, updateData) {
    try {
      // If email is being updated, check if it already exists
      if (updateData.email) {
        const existingStudent = await Student.findOne({ where: { email: updateData.email } });
        if (existingStudent && existingStudent.id !== parseInt(id)) {
          throw new Error('Email already exists for another student');
        }
      }

      const student = await this.getStudentById(id);
      return await student.update(updateData);
    } catch (error) {
      throw error;
    }
  }

  async deleteStudent(id) {
    try {
      const student = await this.getStudentById(id);
      await student.destroy();
      return { message: 'Student deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  async deactivateStudent(id) {
    try {
      return await this.updateStudent(id, { isActive: false });
    } catch (error) {
      throw error;
    }
  }

  async getActiveStudents(options = {}) {
    try {
      const searchOptions = {
        ...options,
        where: { ...options.where, isActive: true }
      };
      return await this.getAllStudents(searchOptions);
    } catch (error) {
      throw error;
    }
  }

  async getStudentsByGradeLevel(gradeLevel, options = {}) {
    try {
      const searchOptions = {
        ...options,
        where: { ...options.where, gradeLevel }
      };
      return await this.getAllStudents(searchOptions);
    } catch (error) {
      throw error;
    }
  }

  async validatePassword(studentId, plainPassword) {
    try {
      const student = await this.getStudentById(studentId);
      return await bcrypt.compare(plainPassword, student.password);
    } catch (error) {
      throw new Error(`Error validating password: ${error.message}`);
    }
  }

  async authenticateStudent(email, password) {
    try {
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
    } catch (error) {
      throw error;
    }
  }

  async changePassword(studentId, currentPassword, newPassword) {
    try {
      const student = await this.getStudentById(studentId);
      
      // Verify current password
      const isValidCurrentPassword = await bcrypt.compare(currentPassword, student.password);
      if (!isValidCurrentPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update with new password (will be automatically hashed by model hook)
      return await student.update({ password: newPassword });
    } catch (error) {
      throw error;
    }
  }
}

export default new StudentService();
