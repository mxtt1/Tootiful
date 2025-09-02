import { Student } from './user.model.js';
import bcrypt from 'bcrypt';

class StudentService {
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
