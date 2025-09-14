import { User, Subject, TutorSubject } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import bcrypt from 'bcrypt';

export default class TutorService {
    // Route handler methods with complete HTTP response logic
    async handleGetAllTutors(req, res) {
        const {
            page,
            limit,
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
            data: result.rows,
            ...(pagination ? { pagination } : {})
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
        const tutorData = req.body;
        const newTutor = await this.createTutor(tutorData);

        // Remove password from response
        const { password, ...tutorResponse } = newTutor.toJSON();

        res.status(201).json(tutorResponse);
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
    async createTutor(tutorData) {
        // Check if email already exists
        const existingTutor = await User.findOne({ where: { email: tutorData.email } });
        if (existingTutor) {
            throw new Error('User with this email already exists');
        }
        // Create tutor
        return await User.create({ ...tutorData, role: 'tutor' });
    }

    async getTutors(options = {}) {
        const { 
            page,
            limit,
            active,
            minRate,
            maxRate,
            subjects = []
        } = options;
        const where = { role: 'tutor' };
        const include = [
            {
                model: Subject,
                as: 'subjects',
                through: { attributes: ['experienceLevel'] }
            }
        ];
        if (active !== undefined) {
            where.isActive = active === 'true' || active === true;
        }
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
        if (subjects.length > 0) {
            const subjectWhere = {};
            if (subjects.length === 1) {
                subjectWhere.name = {
                    [Op.iLike]: `%${subjects[0]}%`
                };
            } else {
                subjectWhere.name = {
                    [Op.in]: subjects
                };
            }
            include[0].where = subjectWhere;
            include[0].required = true;
        }
        const queryOptions = {
            attributes: { exclude: ['password'] },
            where,
            include,
            order: [['createdAt', 'DESC']],
            distinct: true
        };
        if (page && limit) {
            queryOptions.limit = parseInt(limit);
            queryOptions.offset = (parseInt(page) - 1) * parseInt(limit);
        }
        return await User.findAndCountAll(queryOptions);
    }

    async getTutorById(id) {
        const tutor = await User.findOne({
            where: { id, role: 'tutor' },
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

    async updateTutor(id, updateData, subjects = null) {
        const transaction = await sequelize.transaction();
        try {
            if (updateData.email) {
                const existingTutor = await User.findOne({ where: { email: updateData.email} });
                if (existingTutor && existingTutor.id !== id) {
                    throw new Error('Email already exists for another user');
                }
            }
            const tutor = await this.getTutorById(id);
            await tutor.update(updateData, { transaction });
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

    async addSubjectToTutor(tutorId, subjectId, experienceLevel = 'intermediate') {
        const tutor = await this.getTutorById(tutorId);
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

    async changePassword(tutorId, currentPassword, newPassword) {
        const tutor = await this.getTutorById(tutorId);
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, tutor.password);
        if (!isValidCurrentPassword) {
            throw new Error('Current password is incorrect');
        }
        return await tutor.update({ password: newPassword });
    }
}