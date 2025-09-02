import { Tutor, Subject, TutorSubject } from './user.model.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import bcrypt from 'bcrypt';
import experienceLevelEnum from '../../util/enum/experienceLevelEnum.js';

class TutorService {
  // Route handler methods with complete HTTP response logic
  async handleGetAllTutors(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        active, 
        minRate, 
        maxRate, 
        subject, 
        experience 
      } = req.query;
      const options = { page, limit };

      let result;
      
      // Search by subject and experience
      if (subject && experience) {
        if (!experienceLevelEnum.isValidLevel(experience)) {
          return res.status(400).json({
            success: false,
            message: `Experience must be one of: ${experienceLevelEnum.getAllLevels().join(', ')}`
          });
        }
        result = await this.searchTutorsBySubjectAndExperience(subject, experience, options);
      }
      // Search by subject only
      else if (subject) {
        result = await this.searchTutorsBySubject(subject, options);
      }
      // Filter by hourly rate range
      else if (minRate && maxRate) {
        result = await this.getTutorsByHourlyRateRange(
          parseFloat(minRate), 
          parseFloat(maxRate), 
          options
        );
      }
      // Filter by active status
      else if (active === 'true') {
        result = await this.getActiveTutors(options);
      }
      // Get all tutors
      else {
        result = await this.getAllTutors(options);
      }

      res.status(200).json({
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

  async handleGetTutorById(req, res) {
    try {
      const { id } = req.params;
      const tutor = await this.getTutorById(id);

      // Remove password from response and convert to plain js object
      const { password, ...tutorResponse } = tutor.toJSON();
      
      res.status(200).json(tutorResponse);
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        message: error.message
      });
    }
  }

  async handleCreateTutor(req, res) {
    try {
      const { tutorData, subjects } = req.body;
      const newTutor = await this.createTutor(tutorData, subjects);
      
      // Remove password from response
      const { password, ...tutorResponse } = newTutor.toJSON();
      
      res.status(201).json(tutorResponse);
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

  async handleTutorLogin(req, res) {
    try {
      const { email, password } = req.body;
      const tutor = await this.authenticateTutor(email, password);
      
      res.status(200).json(tutor);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleUpdateTutor(req, res) {
    try {
      const { id } = req.params;
      const { tutorData, subjects } = req.body;
      
      // Prevent password updates through this route
      if (tutorData && tutorData.password) {
        return res.status(400).json({
          success: false,
          message: 'Use the password change endpoint to update passwords'
        });
      }
      
      const updatedTutor = await this.updateTutor(id, tutorData, subjects);
      
      // Remove password from response
      const { password, ...tutorResponse } = updatedTutor.toJSON();
      
      res.status(200).json(tutorResponse);
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
      
      res.status(200).json();
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

  async handleDeleteTutor(req, res) {
    try {
      const { id } = req.params;
      const result = await this.deleteTutor(id);
      
      res.status(200).json();
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleDeactivateTutor(req, res) {
    try {
      const { id } = req.params;
      const updatedTutor = await this.deactivateTutor(id);
      
      res.status(200).json(updatedTutor);
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleGetAllSubjects(req, res) {
    try {
      const subjects = await this.getAllSubjects();
      
      res.status(200).json(subjects);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async handleCreateSubject(req, res) {
    try {
      const subjectData = req.body;
      const newSubject = await this.createSubject(subjectData);
      
      res.status(201).json(newSubject);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Business logic methods
  async createTutor(tutorData, subjects = []) {
    const transaction = await sequelize.transaction();
    try {
      // Check if email already exists
      const existingTutor = await Tutor.findOne({ where: { email: tutorData.email } });
      if (existingTutor) {
        throw new Error('Tutor with this email already exists');
      }

      // Create tutor
      const tutor = await Tutor.create(tutorData, { transaction });

      // Add subjects with experience levels if provided
      if (subjects.length > 0) {
        const tutorSubjects = subjects.map(subject => ({
          tutorId: tutor.id,
          subjectId: subject.subjectId,
          experienceLevel: subject.experienceLevel || 'intermediate'
        }));
        await TutorSubject.bulkCreate(tutorSubjects, { transaction });
      }

      await transaction.commit();
      
      // Return tutor with subjects
      return await this.getTutorById(tutor.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getAllTutors(options = {}) {
    try {
      const { page = 1, limit = 10, where = {} } = options;
      const offset = (page - 1) * limit;
      
      return await Tutor.findAndCountAll({
        where,
        include: [
          {
            model: Subject,
            as: 'subjects',
            through: { attributes: ['experienceLevel'] }
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Error fetching tutors: ${error.message}`);
    }
  }

  async getTutorById(id) {
    try {
      const tutor = await Tutor.findByPk(id, {
        include: [
          {
            model: Subject,
            as: 'subjects',
            through: { attributes: ['experienceLevel'] }
          }
        ]
      });
      
      if (!tutor) {
        throw new Error('Tutor not found');
      }
      return tutor;
    } catch (error) {
      throw error;
    }
  }

  async getTutorByEmail(email) {
    try {
      return await Tutor.findOne({ 
        where: { email },
        include: [
          {
            model: Subject,
            as: 'subjects',
            through: { attributes: ['experienceLevel'] }
          }
        ]
      });
    } catch (error) {
      throw new Error(`Error finding tutor by email: ${error.message}`);
    }
  }

  async updateTutor(id, updateData, subjects = null) {
    const transaction = await sequelize.transaction();
    try {
      // If email is being updated, check if it already exists
      if (updateData.email) {
        const existingTutor = await Tutor.findOne({ where: { email: updateData.email } });
        if (existingTutor && existingTutor.id !== parseInt(id)) {
          throw new Error('Email already exists for another tutor');
        }
      }

      const tutor = await this.getTutorById(id);
      await tutor.update(updateData, { transaction });

      // Update subjects if provided
      if (subjects !== null) {
        await TutorSubject.destroy({ where: { tutorId: id }, transaction });
        if (subjects.length > 0) {
          const tutorSubjects = subjects.map(subject => ({
            tutorId: id,
            subjectId: subject.subjectId,
            experienceLevel: subject.experienceLevel || 'intermediate'
          }));
          await TutorSubject.bulkCreate(tutorSubjects, { transaction });
        }
      }

      await transaction.commit();
      return await this.getTutorById(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async deleteTutor(id) {
    try {
      const tutor = await this.getTutorById(id);
      await tutor.destroy();
      return { message: 'Tutor deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  async deactivateTutor(id) {
    try {
      return await this.updateTutor(id, { isActive: false });
    } catch (error) {
      throw error;
    }
  }

  async getActiveTutors(options = {}) {
    try {
      const searchOptions = {
        ...options,
        where: { ...options.where, isActive: true }
      };
      return await this.getAllTutors(searchOptions);
    } catch (error) {
      throw error;
    }
  }

  async searchTutorsBySubject(subjectName, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      return await Tutor.findAndCountAll({
        where: { isActive: true },
        include: [
          {
            model: Subject,
            as: 'subjects',
            where: { 
              name: { [Op.like]: `%${subjectName}%` },
              isActive: true 
            },
            through: { attributes: ['experienceLevel'] }
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Error searching tutors by subject: ${error.message}`);
    }
  }

  async searchTutorsBySubjectAndExperience(subjectName, experienceLevel, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      return await Tutor.findAndCountAll({
        where: { isActive: true },
        include: [
          {
            model: Subject,
            as: 'subjects',
            where: { 
              name: { [Op.like]: `%${subjectName}%` },
              isActive: true 
            },
            through: { 
              attributes: ['experienceLevel'],
              where: { experienceLevel: experienceLevel }
            }
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Error searching tutors by subject and experience: ${error.message}`);
    }
  }

  async addSubjectToTutor(tutorId, subjectId, experienceLevel = 'intermediate') {
    try {
      const tutor = await this.getTutorById(tutorId);
      
      // Check if this tutor-subject relationship already exists
      const existingRelation = await TutorSubject.findOne({
        where: { tutorId, subjectId }
      });

      if (existingRelation) {
        throw new Error('Tutor already teaches this subject');
      }

      await TutorSubject.create({
        tutorId,
        subjectId,
        experienceLevel
      });

      return await this.getTutorById(tutorId);
    } catch (error) {
      throw error;
    }
  }

  async updateTutorSubjectExperience(tutorId, subjectId, experienceLevel) {
    try {
      const relation = await TutorSubject.findOne({
        where: { tutorId, subjectId }
      });

      if (!relation) {
        throw new Error('Tutor does not teach this subject');
      }

      await relation.update({ experienceLevel });
      return await this.getTutorById(tutorId);
    } catch (error) {
      throw error;
    }
  }

  async removeSubjectFromTutor(tutorId, subjectId) {
    try {
      const deleted = await TutorSubject.destroy({
        where: { tutorId, subjectId }
      });

      if (deleted === 0) {
        throw new Error('Tutor does not teach this subject');
      }

      return await this.getTutorById(tutorId);
    } catch (error) {
      throw error;
    }
  }

  async getTutorsByHourlyRateRange(minRate, maxRate, options = {}) {
    try {
      const searchOptions = {
        ...options,
        where: {
          ...options.where,
          hourlyRate: {
            [Op.between]: [minRate, maxRate]
          },
          isActive: true
        }
      };
      return await this.getAllTutors(searchOptions);
    } catch (error) {
      throw error;
    }
  }

  // Subject management methods
  async createSubject(subjectData) {
    try {
      return await Subject.create(subjectData);
    } catch (error) {
      throw new Error(`Error creating subject: ${error.message}`);
    }
  }

  async getAllSubjects() {
    try {
      return await Subject.findAll({
        where: { isActive: true },
        order: [['category', 'ASC'], ['name', 'ASC']]
      });
    } catch (error) {
      throw new Error(`Error fetching subjects: ${error.message}`);
    }
  }

  // Password management methods
  async validatePassword(tutorId, plainPassword) {
    try {
      const tutor = await this.getTutorById(tutorId);
      return await bcrypt.compare(plainPassword, tutor.password);
    } catch (error) {
      throw new Error(`Error validating password: ${error.message}`);
    }
  }

  async authenticateTutor(email, password) {
    try {
      const tutor = await this.getTutorByEmail(email);
      if (!tutor) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await bcrypt.compare(password, tutor.password);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Return tutor without password
      const { password: _, ...tutorData } = tutor.toJSON();
      return tutorData;
    } catch (error) {
      throw error;
    }
  }

  async changePassword(tutorId, currentPassword, newPassword) {
    try {
      const tutor = await this.getTutorById(tutorId);
      
      // Verify current password
      const isValidCurrentPassword = await bcrypt.compare(currentPassword, tutor.password);
      if (!isValidCurrentPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update with new password (will be automatically hashed by model hook)
      return await tutor.update({ password: newPassword });
    } catch (error) {
      throw error;
    }
  }
}

export default new TutorService();
