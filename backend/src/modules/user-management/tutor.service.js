import { User, Subject, TutorSubject, Agency, Lesson, Location, Attendance } from '../../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../../config/database.js';
import bcrypt from 'bcrypt';
import { createAndEmailVerificationLink } from "./emailVerification.service.js";
import generator from 'generate-password';

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

const formatLocalDateTimeString = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

// to set the +1 -1 window for tutor to mark attendance (so they cannot anyhow mark)
const buildMarkingWindow = (dateStr, startTime, endTime) => {
    if (!dateStr || !startTime || !endTime) {
        throw new Error('Missing values');
    }

    // to check if is a valid date
    const parseDateTime = (timeStr) => {
        const dateTime = new Date(`${dateStr}T${timeStr}`);
        if (Number.isNaN(dateTime.getTime())) {
            throw new Error('No such date/time');
        }
        return dateTime;
    };

    const startDateTime = parseDateTime(startTime);
    const endDateTime = parseDateTime(endTime);

    return {
        windowStart: new Date(startDateTime.getTime() - ONE_HOUR_IN_MS),
        windowEnd: new Date(endDateTime.getTime() + ONE_HOUR_IN_MS),
        startDateTime,
        endDateTime
    };
};

// helper to check attendance status
const determineAttendanceStatus = (isAttended, now, windowStart, windowEnd) => {
    if (isAttended) {
        return 'attended';
    }
    if (now < windowStart) {
        return 'upcoming';
    }
    if (now > windowEnd) {
        return 'missed';
    }
    return 'pending';
};

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

    async handleGetAvailableTutorsForSubject(req, res) {
        try {
            const { subjectId, agencyId } = req.query;
            console.log(`Fetching available tutors for subject: ${subjectId}, agency: ${agencyId || 'any'}`);

            if (!subjectId) {
                console.warn('Missing subjectId in request');
                return res.status(400).json({ 
                    success: false,
                    message: "subjectId is required" 
                });
            }

            const tutors = await this.getAvailableTutorsForSubject(subjectId, agencyId);
            console.log(`Found ${tutors.length} available tutors for subject ${subjectId}`);
            res.status(200).json({
                success: true,
                data: tutors
            });
        } catch (error) {
            console.error("Error fetching available tutors for subject:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async handleGetTutorById(req, res) {
        const { id } = req.params;
        const tutor = await this.getTutorById(id);
        const paymentSummary = await this.getTutorPaymentSummary(id);

        // Remove password from response
        const { password, ...tutorResponse } = tutor.toJSON();

        res.status(200).json({
            ...tutorResponse,
            paymentSummary
        });
    }

    async handleGetTutorPaymentSummary(req, res) {
        const { id } = req.params;
        const summary = await this.getTutorPaymentSummary(id);
        res.status(200).json({
            success: true,
            data: summary
        });
    }

    async handleCreateTutor(req, res) {
        const tutorData = req.body;
    
        // If password not provided, generate a random one, then email it to the tutor
        let generatedPassword = null;
        if (!tutorData.password) {
            generatedPassword = generator.generate({ length: 10, numbers: true });
            tutorData.password = generatedPassword;
        }

        const newTutor = await this.createTutor(tutorData);

        // Remove password from response
        const { password, ...tutorResponse } = newTutor.toJSON();

        res.status(201).json(tutorResponse);

        // user is created with isActive=false (default). Send verification email.
        await createAndEmailVerificationLink({ user: newTutor, email: newTutor.email, generatedPassword: generatedPassword  });

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
        // Check if email was changed
        const emailChanged =
        !!(tutorData?.email) && tutorData.email !== updatedTutor.email;

        res.status(200).json({
        ...tutorResponse,
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

        //Check if email already exists in Agency table
        const existingAgency = await Agency.findOne({ where: { email: tutorData.email } });
        if (existingAgency) {
            throw new Error('Agency with this email already exists');
        }

        // Create tutor
        return await User.create({ ...tutorData, role: 'tutor', isActive: false });
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
            search, 
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
            //filter by subject names 
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

    async getAvailableTutorsForSubject(subjectId, agencyId = null) {
        console.log(`Finding available tutors for subject ${subjectId}, agency: ${agencyId || 'any'}`);
        const where = { 
            role: 'tutor', 
            isActive: true,
            isSuspended: false
        };

        if (agencyId) {
            where.agencyId = agencyId;
        }

        const tutors = await User.findAll({
            where, 
            include: [
                {
                    model: Subject,
                    as: 'subjects',
                    where: { id: subjectId }, // Filter by subject ID
                    through: { attributes: ['experienceLevel', 'hourlyRate'] },
                    required: true // INNER JOIN - only tutors who teach this subject
                }
            ],
            attributes: { exclude: ['password'] },
            order: [['firstName', 'ASC'], ['lastName', 'ASC']]
        });
        console.log(`Found ${tutors.length} available tutors for subject ${subjectId}`);
        return tutors;
    }

    async getTutorById(id) {
        const tutor = await User.findOne({
            where: { id, role: 'tutor' },
            include: [
                {
                    model: Subject,
                    as: 'subjects',
                    through: { attributes: ['experienceLevel', 'hourlyRate'] }
                },
                {
                    model: Lesson,
                    as: 'tutorLessons',
                    attributes: [
                        'id',
                        'title',
                        'description',
                        'dayOfWeek',
                        'startTime',
                        'endTime',
                        'isActive',
                        'studentRate',
                        'totalCap',
                        'currentCap',
                        'subjectId',
                        'agencyId',
                        'locationId',
                        'createdAt',
                        'updatedAt'
                    ],
                    include: [
                        {
                            model: Subject,
                            as: 'subject',
                            attributes: ['id', 'name', 'gradeLevel', 'category']
                        },
                        {
                            model: Agency,
                            as: 'agency',
                            attributes: ['id', 'name']
                        },
                        {
                            model: Location,
                            as: 'location',
                            attributes: ['id', 'address', 'agencyId']
                        }
                    ]
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

            // Enforce uniqueness only if email is changing
            if (updateData.email) {
            const existing = await User.findOne({
                where: { email: updateData.email },
                transaction,
            });
            if (existing && existing.id !== id) {
                throw new Error("Email already exists for another user");
            }
            }

            const tutor = await this.getTutorById(id);

            // If no email change -> normal update
            if (!updateData.email || updateData.email === tutor.email) {
            await tutor.update(updateData, { transaction });
            } else {
                // same email change workflow:
                // 1) mark inactive and store pending email
                tutor.isActive = false;
                tutor.pendingEmail = updateData.email;        
                await tutor.save({ transaction });
                // 2) send verify link to NEW email
                await createAndEmailVerificationLink({ user: tutor, email: updateData.email });
                // 3) apply all other updates EXCEPT email
                const { email, ...rest } = updateData;
                await tutor.update(rest, { transaction });
            }

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

    // lesson attendance and student detail handlers for new frtonend
    async handleGetStudentsForLesson(req, res) {
        const { lessonId } = req.params;
        console.log(`Fetching students for lesson: ${lessonId}`);
        const result = await this.getStudentsForLesson(lessonId);
        res.status(200).json(result);
    }

    async handleGetLessonAttendance(req, res) {
        const { lessonId } = req.params;
        console.log(`Fetching attendance for lesson: ${lessonId}`);
        const result = await this.getLessonAttendance(lessonId);
        res.status(200).json(result);
    }

    async handleMarkAttendance(req, res) {
        const { lessonId, attendanceId } = req.params;
        const tutorId = req.user?.userId;
        console.log(`Tutor ${tutorId} attempting to mark attendance ${attendanceId} for lesson ${lessonId}`);
        const result = await this.markAttendance({ lessonId, attendanceId, tutorId });
        res.status(200).json({
            success: true,
            data: result
        });
    }

    formatAttendanceSession(attendanceRecord, lesson, now = new Date()) {
        const { windowStart, windowEnd, startDateTime, endDateTime } = buildMarkingWindow(
            attendanceRecord.date,
            lesson.startTime,
            lesson.endTime
        );

        const status = determineAttendanceStatus(
            attendanceRecord.isAttended,
            now,
            windowStart,
            windowEnd
        );

        return {
            id: attendanceRecord.id,
            lessonId: attendanceRecord.lessonId,
            tutorId: attendanceRecord.tutorId,
            date: attendanceRecord.date,
            isAttended: attendanceRecord.isAttended,
            status,
            canMarkNow: status === 'pending',
            markWindow: {
                start: formatLocalDateTimeString(windowStart),
                end: formatLocalDateTimeString(windowEnd),
                scheduledStart: formatLocalDateTimeString(startDateTime),
                scheduledEnd: formatLocalDateTimeString(endDateTime)
            },
            createdAt: attendanceRecord.createdAt,
            updatedAt: attendanceRecord.updatedAt
        };
    }

    async getLessonAttendanceData(lesson, now = new Date()) {
        const attendanceRecords = await Attendance.findAll({
            where: { lessonId: lesson.id },
            order: [['date', 'ASC']]
        });

        const classes = [];
        let attendedSessions = 0;
        let pendingSessions = 0;
        let upcomingSessions = 0;
        let missedSessions = 0;

        for (const attendanceRecord of attendanceRecords) {
            const session = this.formatAttendanceSession(attendanceRecord, lesson, now);
            classes.push(session);

            switch (session.status) {
                case 'attended':
                    attendedSessions += 1;
                    break;
                case 'pending':
                    pendingSessions += 1;
                    break;
                case 'upcoming':
                    upcomingSessions += 1;
                    break;
                case 'missed':
                    missedSessions += 1;
                    break;
                default:
                    break;
            }
        }

        return {
            classes,
            summary: {
                totalSessions: classes.length,
                attendedSessions,
                pendingSessions,
                upcomingSessions,
                missedSessions
            },
            serverTime: now.toISOString()
        };
    }

    async getLessonAttendance(lessonId) {
        const lesson = await Lesson.findByPk(lessonId, {
            attributes: [
                'id',
                'title',
                'description',
                'dayOfWeek',
                'startTime',
                'endTime',
                'tutorId',
                'subjectId',
                'agencyId',
                'locationId'
            ]
        });

        if (!lesson) {
            throw new Error('Lesson not found');
        }

        const overview = await this.getLessonAttendanceData(lesson);
        return {
            lesson: lesson.toJSON(),
            ...overview
        };
    }

    async markAttendance({ lessonId, attendanceId, tutorId }) {
        if (!tutorId) {
            throw new Error('Unauthorized: missing tutor context');
        }

        const attendanceRecord = await Attendance.findOne({
            where: { id: attendanceId, lessonId },
            include: [
                {
                    model: Lesson,
                    as: 'lesson',
                    attributes: ['id', 'title', 'tutorId', 'startTime', 'endTime']
                }
            ]
        });

        if (!attendanceRecord) {
            throw new Error('Attendance record not found');
        }

        const lesson = attendanceRecord.lesson;
        if (!lesson) {
            throw new Error('Lesson not found for attendance record');
        }

        const effectiveTutorId = lesson.tutorId || attendanceRecord.tutorId;
        if (effectiveTutorId && effectiveTutorId !== tutorId) {
            throw new Error('Unauthorized: you cannot mark this attendance');
        }

        if (attendanceRecord.isAttended) {
            throw new Error('Invalid request: attendance already marked');
        }

        const now = new Date();
        const { windowStart, windowEnd } = buildMarkingWindow(
            attendanceRecord.date,
            lesson.startTime,
            lesson.endTime
        );

        if (now < windowStart || now > windowEnd) {
            throw new Error(
                `Attendance must be marked within the allowed window between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`
            );
        }

        await attendanceRecord.update({
            isAttended: true,
            tutorId
        });

        const overview = await this.getLessonAttendanceData(lesson, now);
        const updatedSession = overview.classes.find(
            (session) => session.id === attendanceRecord.id
        );

        return {
            updatedSession,
            classes: overview.classes,
            summary: overview.summary,
            serverTime: overview.serverTime
        };
    }

    async getTutorPaymentSummary(tutorId) {
        const now = new Date();
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

        const startDate = monthStart.toISOString().slice(0, 10);
        const endDate = monthEnd.toISOString().slice(0, 10);

        const attendances = await Attendance.findAll({
            where: {
                tutorId,
                isAttended: true,
                date: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                {
                    model: Lesson,
                    as: 'lesson',
                    attributes: ['id', 'title', 'dayOfWeek', 'startTime', 'endTime', 'tutorRate'],
                    required: false
                }
            ],
            order: [['date', 'DESC']]
        });

        let totalPaid = 0;
        let totalPending = 0;
        let paidCount = 0;
        let pendingCount = 0;

        const breakdown = attendances.map((attendance) => {
            const lesson = attendance.lesson;

            const rawAmount = lesson?.tutorRate ?? 0;
            const amount = Number.parseFloat(rawAmount);
            const safeAmount = Number.isNaN(amount) ? 0 : amount;

            const isPaid = attendance?.isPaid === true;
            const paymentStatus = isPaid ? 'Paid' : 'Not Paid';

            if (isPaid) {
                totalPaid += safeAmount;
                paidCount += 1;
            } else {
                totalPending += safeAmount;
                pendingCount += 1;
            }

            return {
                id: `attendance-${attendance.id}`,
                attendanceId: attendance.id,
                lessonId: attendance?.lessonId ?? lesson?.id ?? null,
                lessonTitle: lesson?.title ?? null,
                lessonRate: lesson?.tutorRate ? Number.parseFloat(lesson.tutorRate) : null,
                paymentStatus,
                paymentAmount: safeAmount,
                paymentDate: isPaid ? attendance?.updatedAt ?? attendance?.date ?? null : null,
                attendanceDate: attendance?.date ?? null,
                isAttendanceMarked: attendance?.isAttended ?? null,
                isPaid,
                recordedAt: attendance?.updatedAt ?? attendance?.createdAt
            };
        });

        return {
            totalPaid: Number.parseFloat(totalPaid.toFixed(2)),
            totalPending: Number.parseFloat(totalPending.toFixed(2)),
            paymentsCount: breakdown.length,
            paidCount,
            pendingCount,
            breakdown
        };
    }

    async getStudentsForLesson(lessonId) {
        try {
            console.log(`Fetching students for lesson ${lessonId}`);

            const lesson = await Lesson.findByPk(lessonId, {
                include: [
                    {
                        model: Subject,
                        as: "subject",
                        attributes: ["id", "name", "gradeLevel", "category", "description"],
                    },
                    {
                        model: Location,
                        as: "location",
                        attributes: ["id", "address"],
                        include: [
                            {
                                model: Agency,
                                as: "agency",
                                attributes: ["id", "name"],
                            },
                        ],
                    },
                    {
                        model: User,
                        as: "tutor",
                        attributes: ["id", "firstName", "lastName", "email", "phone"],
                    },
                ],
            });

            if (!lesson) {
                throw new Error("Lesson not found");
            }

            const [students, attendanceOverview] = await Promise.all([
                User.findAll({
                    where: {
                        role: "student",
                    },
                    include: [
                        {
                            model: Lesson,
                            as: "studentLessons",
                            where: {
                                id: lessonId,
                            },
                            attributes: ["id"],
                            through: {
                                attributes: ["startDate", "endDate"],
                            },
                        },
                    ],
                    attributes: ["id", "firstName", "lastName", "email", "phone", "gender", "gradeLevel"],
                }),
                this.getLessonAttendanceData(lesson)
            ]);

            console.log(`Found ${students.length} students for lesson ${lessonId}`);

            return {
                ...lesson.toJSON(),
                students: students.map(student => ({
                    id: student.id,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    email: student.email,
                    phone: student.phone,
                    gender: student.gender,
                    gradeLevel: student.gradeLevel,
                })),
                classes: attendanceOverview.classes,
                attendanceSummary: attendanceOverview.summary,
                attendanceServerTime: attendanceOverview.serverTime
            };
        } catch (error) {
            console.error(
                `Failed to fetch students for lesson ${lessonId}:`,
                error.message
            );
            throw new Error(`Failed to fetch students: ${error.message}`);
        }
    }
}
