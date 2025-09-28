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
            subject,
            agencyId,
            search
        } = req.query;

        // Handle multivalued parameters - convert to arrays if needed
        const subjects = Array.isArray(subject) ? subject : (subject ? [subject] : []);

        const result = await this.getTutors({ 
            page, 
            limit, 
            active, 
            minRate, 
            maxRate, 
            subjects,
            agencyId,
            search
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
            subjects = [],
            agencyId,
            search
        } = options;
        const where = { role: 'tutor' };
        // Server-side search logic
        if (search) {
            where[Op.or] = [
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { phone: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const include = [
            {
                model: Subject, // JOIN with subject model through tutor_subjects table
                as: 'subjects',
                through: { attributes: ['experienceLevel', 'hourlyRate'] } // include these cols from join table
            }
        ];

        // filter by agencyId
        if (agencyId !== undefined) {
          where.agencyId = agencyId;
        }

        // filter by active status
        if (active !== undefined) {
            where.isActive = active === 'true' || active === true;
        }

        // filter by tutor_subjects.hourlyRate
        if (minRate !== undefined || maxRate !== undefined) {
            include[0].through = {
                where: {}
            };  

            // both min and max rate provided
            if (minRate !== undefined && maxRate !== undefined) {     
                include[0].through.where.hourlyRate = {
                    [Op.between]: [parseFloat(minRate), parseFloat(maxRate)]
                };
            // only min rate provided
            } else if (minRate !== undefined) {
                include[0].through.where.hourlyRate = {
                    [Op.gte]: parseFloat(minRate)
                };
            // only max rate provided
            } else if (maxRate !== undefined) {
                include[0].through.where.hourlyRate = {
                    [Op.lte]: parseFloat(maxRate)
                };
            }
            
            include[0].required = true; 
        }

        // filter by subjects
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
                    through: { attributes: ['experienceLevel', 'hourlyRate'] }
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
                const existingTutor = await User.findOne({ 
                    where: { email: updateData.email },
                    transaction 
                });
                if (existingTutor && existingTutor.id !== id) {
                    throw new Error('Email already exists for another user');
                }
            }
            const tutor = await this.getTutorById(id);
            await tutor.update(updateData, { transaction });

            // when subjects are updated
            if (subjects !== null) {
                // fetch tutor's current subjects
                const currentSubjects = await tutor.getSubjects({ transaction });
                const currentSubjectIds = currentSubjects.map(subject => subject.id);

                // subjects to remove
                const subjectsToRemove = currentSubjectIds.filter(id => 
                    !subjects.some(subject => subject.subjectId === id)
                );
                
                // subjects to add
                const subjectsToAdd = subjects.filter(subject => 
                    !currentSubjectIds.includes(subject.subjectId)
                );
                
                // subjects to update (existing subjects)
                const subjectsToUpdate = subjects.filter(subject => 
                    currentSubjectIds.includes(subject.subjectId)
                );

                // remove subjects
                for (const subjectId of subjectsToRemove) {
                    await this.removeSubjectFromTutor(id, subjectId, transaction);
                }

                // add subjects
                for (const subject of subjectsToAdd) {
                    await this.addSubjectToTutor(
                        id, 
                        subject.subjectId, 
                        subject.experienceLevel, 
                        subject.hourlyRate, 
                        transaction
                    );
                }

                // update existing subjects (rates and experience levels)
                for (const subject of subjectsToUpdate) {
                    // Check if there are actual changes to update
                    const currentSubject = currentSubjects.find(s => s.id === subject.subjectId);
                    const tutorSubject = currentSubject.TutorSubject;
                    
                    if (subject.hourlyRate !== undefined && subject.hourlyRate !== tutorSubject.hourlyRate) {
                        await this.updateTutorSubjectRate(
                            id, 
                            subject.subjectId, 
                            subject.hourlyRate, 
                            transaction
                        );
                    }
                    
                    if (subject.experienceLevel !== undefined && subject.experienceLevel !== tutorSubject.experienceLevel) {
                        await this.updateTutorSubjectExperience(
                            id, 
                            subject.subjectId, 
                            subject.experienceLevel, 
                            transaction
                        );
                    }
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

    async addSubjectToTutor(tutorId, subjectId, experienceLevel = 'intermediate', hourlyRate = 45, transaction = null) {
        const options = { where: { tutorId, subjectId } };
        if (transaction) options.transaction = transaction;
        const existingRelation = await TutorSubject.findOne(options);
        if (existingRelation) {
            throw new Error('Tutor already teaches this subject');
        }
    
        const createOptions = {
            tutorId,
            subjectId,
            experienceLevel, 
            hourlyRate
        };
        if (transaction) createOptions.transaction = transaction;
        
        await TutorSubject.create(createOptions);
        return await this.getTutorById(tutorId);
    }

    async updateTutorSubjectExperience(tutorId, subjectId, experienceLevel, transaction = null) {
        const options = { where: { tutorId, subjectId } };
        if (transaction) options.transaction = transaction;
        
        const relation = await TutorSubject.findOne(options);
        if (!relation) {
            throw new Error('Tutor does not teach this subject');
        }
        
        const updateOptions = { experienceLevel };
        if (transaction) updateOptions.transaction = transaction;
        
        await relation.update(updateOptions);
        return await this.getTutorById(tutorId);
    }

    async updateTutorSubjectRate(tutorId, subjectId, hourlyRate, transaction = null) {
        const options = { where: { tutorId, subjectId } };
        if (transaction) options.transaction = transaction;
        
        const relation = await TutorSubject.findOne(options);
        if (!relation) {
            throw new Error('Tutor does not teach this subject');
        }
        
        const updateOptions = { hourlyRate };
        if (transaction) updateOptions.transaction = transaction;
        
        await relation.update(updateOptions);
        return await this.getTutorById(tutorId);
    }

    async removeSubjectFromTutor(tutorId, subjectId, transaction = null) {
        const options = { where: { tutorId, subjectId } };
        if (transaction) options.transaction = transaction;
        
        const deleted = await TutorSubject.destroy(options);
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