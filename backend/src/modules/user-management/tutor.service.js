import { Tutor, Subject, TutorSubject } from './user.model.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import bcrypt from 'bcrypt';

class TutorService {
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
