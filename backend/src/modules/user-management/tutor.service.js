import { Tutor, Subject, TutorSubject } from './user.model.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import bcrypt from 'bcrypt';

class TutorService {
    // Route handler methods with complete HTTP response logic
    async handleGetAllTutors(req, res) {
        const {
            page = 1,
            limit = 10,
            active,
            minRate,
            maxRate,
            subject
        } = req.query;

        // Handle multivalued parameters - convert to arrays if needed
        const subjects = Array.isArray(subject) ? subject : (subject ? [subject] : []);

        const result = await this.getTutors({ 
            page, 
            limit, 
            active, 
            minRate, 
            maxRate, 
            subjects
        });

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

    async handleGetTutorById(req, res) {
        const { id } = req.params;
        const tutor = await this.getTutorById(id);

        // Remove password from response
        const { password, ...tutorResponse } = tutor.toJSON();

        res.status(200).json(tutorResponse);
    }

    async handleCreateTutor(req, res) {
        const { tutorData, subjects } = req.body;
        const newTutor = await this.createTutor(tutorData, subjects);

        // Remove password from response
        const { password, ...tutorResponse } = newTutor.toJSON();

        res.status(201).json(tutorResponse);
    }

    async handleTutorLogin(req, res) {
        const { email, password } = req.body;
        const tutor = await this.authenticateTutor(email, password);

        res.status(200).json(tutor); //replace with signed JWT
    }

    async handleUpdateTutor(req, res) {
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
    }

    async handleChangePassword(req, res) {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        await this.changePassword(id, currentPassword, newPassword);

        res.status(200).json();
    }

    async handleDeleteTutor(req, res) {
        const { id } = req.params;
        await this.deleteTutor(id);

        res.status(200).json();
    }

    async handleDeactivateTutor(req, res) {
        const { id } = req.params;
        await this.deactivateTutor(id);

        res.status(200).json();
    }

    async handleGetAllSubjects(req, res) {
        const subjects = await this.getAllSubjects();
        res.status(200).json(subjects);
    }

    async handleCreateSubject(req, res) {
        const subjectData = req.body;
        const newSubject = await this.createSubject(subjectData);
        res.status(201).json(newSubject);
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

    async getTutors(options = {}) {
        const { 
            page = 1, 
            limit = 10, 
            active, 
            minRate, 
            maxRate, 
            subjects = []
        } = options;
        
        const offset = (page - 1) * limit;

        // Build where clause dynamically
        const where = {};
        const include = [
            {
                model: Subject,
                as: 'subjects',
                through: { attributes: ['experienceLevel'] }
            }
        ];

        // Filter by active status
        if (active !== undefined) {
            where.isActive = active === 'true' || active === true;
        }

        // Filter by hourly rate range
        if (minRate !== undefined && maxRate !== undefined) {
            where.hourlyRate = {
                [Op.between]: [parseFloat(minRate), parseFloat(maxRate)]
            };
        } else if (minRate !== undefined) {
            where.hourlyRate = {
                [Op.gte]: parseFloat(minRate)
            };
        } else if (maxRate !== undefined) {
            where.hourlyRate = {
                [Op.lte]: parseFloat(maxRate)
            };
        }

        // Filter by subjects
        if (subjects.length > 0) {
            const subjectWhere = {};

            if (subjects.length === 1) {
                // Single subject - use ILIKE for partial matching
                subjectWhere.name = {
                    [Op.iLike]: `%${subjects[0]}%`
                };
            } else {
                // Multiple subjects - use IN for exact matching
                subjectWhere.name = {
                    [Op.in]: subjects
                };
            }

            include[0].where = subjectWhere;
            include[0].required = true; // Inner join to only get tutors with matching subjects
        }

        return await Tutor.findAndCountAll({
            attributes: { exclude: ['password'] },
            where,
            include,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']],
            distinct: true
        });
    }

    async getTutorById(id) {
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
    }

    async getTutorByEmail(email) {
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
        const tutor = await this.getTutorById(id);
        await tutor.destroy();
    }

    async deactivateTutor(id) {
        return await this.updateTutor(id, { isActive: false });
    }

    async addSubjectToTutor(tutorId, subjectId, experienceLevel = 'intermediate') {
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
    }

    async updateTutorSubjectExperience(tutorId, subjectId, experienceLevel) {
        const relation = await TutorSubject.findOne({
            where: { tutorId, subjectId }
        });

        if (!relation) {
            throw new Error('Tutor does not teach this subject');
        }

        await relation.update({ experienceLevel });
        return await this.getTutorById(tutorId);
    }

    async removeSubjectFromTutor(tutorId, subjectId) {
        const deleted = await TutorSubject.destroy({
            where: { tutorId, subjectId }
        });

        if (deleted === 0) {
            throw new Error('Tutor does not teach this subject');
        }

        return await this.getTutorById(tutorId);
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
    async authenticateTutor(email, password) {
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
    }

    async changePassword(tutorId, currentPassword, newPassword) {
        const tutor = await this.getTutorById(tutorId);

        // Verify current password
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, tutor.password);
        if (!isValidCurrentPassword) {
            throw new Error('Current password is incorrect');
        }

        // Update with new password (will be automatically hashed by model hook)
        return await tutor.update({ password: newPassword });
    }
}

export default new TutorService();
