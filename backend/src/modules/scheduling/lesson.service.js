import {
  Lesson,
  Subject,
  User,
  StudentLesson,
  Location,
  Agency,
  Attendance,
} from "../../models/index.js";
import { Op } from "sequelize";
import sequelize from "../../config/database.js";

class LessonService {
  async handleGetAllSubjects(req, res) {
    console.log("Fetching all subjects");
    const subjects = await this.getAllSubjects();
    console.log(`Retrieved ${subjects.length} subjects`);
    res.status(200).json(subjects);
  }


  // Handler methods for routes
  async handleGetAllLessons(req, res) {
    const lessons = await this.getAllLessons();
    console.log(`Retrieved ${lessons.length} lessons`);

    res.status(200).json({
      success: true,
      data: lessons,
    });
  }

  async handleGetLessonsByAgencyId(req, res) {
    const { id } = req.params;
    const { location } = req.query; 
    console.log(`Fetching lessons for agency: ${id}, location: ${location}`);   

    const lessons = await this.getAllLessonsByAgencyId(id, location); // Fetch all lessons for the agency
    console.log(`Retrieved ${lessons.length} lessons for agency ${id}`);
    res.status(200).json({
      success: true,
      data: lessons,
    });
  }

  async handleGetLessonById(req, res) {
    const { id } = req.params;
    console.log(`Fetching lessons by ID: ${id}`);
    const lesson = await this.getLessonById(id);
    console.log(`Retrieved lesson: ${lesson.title}`);

    res.status(200).json({
      success: true,
      data: lesson,
    });
  }

  async handleCreateLesson(req, res) {
    console.log("Creating new lesson");
    const lesson = await this.createLesson(req.body);
    console.log(
      `Lesson created successfully: ${lesson.title} (ID: ${lesson.id})`
    );

    res.status(201).json({
      success: true,
      message: "Lesson created successfully",
      data: lesson,
    });
  }

  async handleUpdateLesson(req, res) {
    const { id } = req.params;
    console.log(`Updating lesson: ${id}`);
    const lesson = await this.updateLesson(id, req.body);
    console.log(`Lesson updated successfully: ${lesson.title}`);
    res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      data: lesson,
    });
  }

  async handleDeleteLesson(req, res) {
    const { id } = req.params;
    console.log(`Deleting lesson: ${id}`);
    await this.deleteLesson(id);
    console.log(`Lesson deleted successfully: ${id}`);

    res.status(200).json({
      success: true,
      message: "Lesson deleted successfully",
    });
  }

  async handleGetAllLessonsByStudentId(req, res) {
    const { ongoing } = req.query;
    const { id: studentId } = req.params;
    const response = await this.getAllLessonsByStudentId(studentId, ongoing);
    res.status(200).json({
      success: true,
      data: response,
    });
  }



  async handleGetUnpaidAttendanceByLesson(req, res) {
    try {
      const { id } = req.params;
      console.log(`Fetching unpaid attendance for lesson: ${id}`);

      const unpaidAttendance = await this.getUnpaidAttendanceByLesson(id);

      res.status(200).json({
        success: true,
        data: unpaidAttendance,
      });
    } catch (error) {
      console.error("Error fetching unpaid attendance:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getUnpaidAttendanceByLesson(lessonId) {
    try {
      console.log(`Fetching unpaid attendance for lesson: ${lessonId}`);

      const lesson = await Lesson.findByPk(lessonId);
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      const unpaidAttendance = await Attendance.findAll({
        where: {
          lessonId,
          isAttended: false,
          isPaid: false
        },
        include: [
          {
            model: Lesson,
            as: 'lesson',
            attributes: ['id', 'title', 'tutorRate', 'tutorId']
          },
          {
            model: User,
            as: 'tutor', // Use your correct alias
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        order: [['date', 'DESC']]
      });

      console.log(`Found ${unpaidAttendance.length} unpaid attendance records`);

      return unpaidAttendance.map(attendance => ({
        id: attendance.id,
        date: attendance.date,
        isAttended: attendance.isAttended,
        isPaid: attendance.isPaid,
        tutorId: attendance.tutorId,
        tutorName: attendance.tutor ?
          `${attendance.tutor.firstName} ${attendance.tutor.lastName}` :
          'Unknown Tutor',
        lessonTitle: attendance.lesson?.title || 'Unknown Lesson',
        tutorRate: parseFloat(attendance.lesson?.tutorRate || 0),
        paymentAmount: parseFloat(attendance.lesson?.tutorRate || 0),
        lessonId: attendance.lessonId
      }));

    } catch (error) {
      console.error(`Failed to fetch unpaid attendance for lesson ${lessonId}:`, error);
      throw new Error(`Failed to fetch unpaid attendance: ${error.message}`);
    }
  }

  async handleUpdateAttendance(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log(`Updating attendance ${id} with:`, updateData);

      const updatedAttendance = await this.updateAttendance(id, updateData);

      res.status(200).json({
        success: true,
        message: "Attendance updated successfully",
        data: updatedAttendance,
      });
    } catch (error) {
      console.error("Error updating attendance:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateAttendance(attendanceId, updateData) {
    try {
      const attendance = await Attendance.findByPk(attendanceId);
      if (!attendance) {
        throw new Error("Attendance record not found");
      }

      // Update the attendance record
      await attendance.update({
        tutorId: updateData.tutorId,
        isAttended: updateData.isAttended,
        notes: updateData.notes,
        updatedAt: new Date()
      });

      console.log(`Attendance ${attendanceId} updated successfully`);
      return attendance;

    } catch (error) {
      console.error(`Failed to update attendance ${attendanceId}:`, error);
      throw new Error(`Failed to update attendance: At least one tutor must be assigned`);
    }
  }

  async handleEnrolStudentInLesson(req, res) {
    const { id: studentId } = req.params;
    const { lessonId } = req.body; // Expect lessonId in request body
    const result = await this.enrolStudentInLesson(studentId, lessonId);
    res.status(201).json({
      success: true,
      message: "Student enrolled in lesson successfully",
      data: result,
    });
  }

  async handleCheckEnrollmentStatus(req, res) {
    const { lessonId, studentId } = req.params;
    const result = await this.checkEnrollmentStatus(studentId, lessonId);
    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async handleUnenrolStudentFromLesson(req, res) {
    const { id: studentId } = req.params;
    const { lessonId } = req.body; // Expect lessonId in request body
    const result = await this.unenrolStudentFromLesson(studentId, lessonId);
    res.status(200).json({
      success: true,
      message: "Student unenrolled from lesson successfully",
      data: result,
    });
  }

  async handleGetAgencyAttendance(req, res) {
    try {
      const { id: agencyId } = req.params;
      const { location } = req.query; 
      console.log(`Fetching agency-wide attendance for agency: ${agencyId}, location: ${location}`);
      const agencyAttendance = await this.getAgencyAttendance(agencyId, location);

      console.log(`Retrieved attendance data for ${agencyAttendance.length} lessons in agency ${agencyId}`);

      res.status(200).json({
        success: true,
        data: agencyAttendance,
      });
    } catch (error) {
      console.error("Error fetching agency attendance:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAgencyAttendance(agencyId, location = 'all') {
    try {
      console.log(`Fetching agency-wide attendance for: ${agencyId}, location: ${location}`);
      // include array
      const include = [
        {
          model: Subject,
          as: "subject",
          attributes: ["id", "name", "gradeLevel", "category"],
        },
        {
          model: Location,
          as: "location",
          attributes: ["id", "address"],
        },
        {
          model: User,
          as: "tutor",
          attributes: ["id", "firstName", "lastName"],
          required: false,
        },
        {
          model: Attendance,
          as: "instances",
          attributes: ["id", "date", "isAttended", "tutorId", "createdAt"],
          order: [['date', 'DESC']]
        }
      ];
      const where = { agencyId };

      // location filtering
      if (location && location !== 'all') {
        include[1] = {
          ...include[1],
          where: { address: location },
          required: true
        };
      }

      // Get all lessons for the agency with their attendance
      const lessons = await Lesson.findAll({
        where,
        include,
        order: [["createdAt", "DESC"]],
      });

      // Format the response for agency-wide attendance view
      const agencyAttendance = lessons.map((lesson) => {
        const lessonData = lesson.toJSON();
        const attendances = lessonData.instances || [];

        // Calculate attendance statistics for this lesson
        const totalSessions = attendances.length;
        const attendedSessions = attendances.filter(a => a.isAttended).length;
        const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

        // Get recent sessions (last 4 weeks)
        const recentSessions = attendances.slice(0, 4).map(session => ({
          id: session.id,
          date: session.date,
          isAttended: session.isAttended,
          status: session.isAttended ? 'present' : 'absent'
        }));

        return {
          // Lesson identification
          lessonId: lessonData.id,
          lessonTitle: lessonData.title,
          dayOfWeek: lessonData.dayOfWeek,
          timeSlot: `${lessonData.startTime} - ${lessonData.endTime}`,

          // Lesson details
          subjectName: lessonData.subject?.name || 'N/A',
          gradeLevel: lessonData.subject?.gradeLevel || 'N/A',
          location: lessonData.location?.address || 'N/A',
          tutorName: lessonData.tutor ?
            `${lessonData.tutor.firstName} ${lessonData.tutor.lastName}` :
            'No Tutor Assigned',

          // Attendance summary
          attendanceSummary: {
            totalSessions,
            attendedSessions,
            attendanceRate: Math.round(attendanceRate),
            missedSessions: totalSessions - attendedSessions
          },

          // Recent sessions for quick overview
          recentSessions,

          // All sessions (if needed for detailed view)
          allSessions: attendances.map(session => ({
            id: session.id,
            date: session.date,
            isAttended: session.isAttended,
            status: session.isAttended ? 'present' : 'absent',
            markedAt: session.createdAt
          }))
        };
      });

      console.log(`Formatted attendance data for ${agencyAttendance.length} lessons`);
      return agencyAttendance;

    } catch (error) {
      console.error(`Failed to fetch agency attendance for agency ${agencyId}:`, error.message);
      throw new Error(`Failed to fetch agency attendance: ${error.message}`);
    }
  }



  // getAllLessons with related data for better frontend filtering and display
  async getAllLessons() {
    try {
      const lessons = await Lesson.findAll({
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
            attributes: ["id", "firstName", "lastName"],
            required: false, // Allow lessons without assigned tutors
          },
        ],
        where: { isActive: true },
        order: [["createdAt", "DESC"]],
      });

      // Flatten the response structure
      const flattenedLessons = lessons.map((lesson) => {
        const lessonData = lesson.toJSON();
        return {
          // Basic lesson fields
          id: lessonData.id,
          title: lessonData.title,
          description: lessonData.description,
          dayOfWeek: lessonData.dayOfWeek,
          startTime: lessonData.startTime,
          endTime: lessonData.endTime,
          studentRate: lessonData.studentRate,
          totalCap: lessonData.totalCap,
          currentCap: lessonData.currentCap,
          isActive: lessonData.isActive,
          createdAt: lessonData.createdAt,
          updatedAt: lessonData.updatedAt,
          lessonType: lessonData.lessonType,


          // Flattened subject fields
          subjectId: lessonData.subject?.id || null,
          subjectName: lessonData.subject?.name || null,
          subjectGradeLevel: lessonData.subject?.gradeLevel || null,
          subjectCategory: lessonData.subject?.category || null,
          subjectDescription: lessonData.subject?.description || null,

          // Flattened location fields
          locationId: lessonData.location?.id || null,
          locationAddress: lessonData.location?.address || null,

          // Flattened agency fields
          agencyId: lessonData.location?.agency?.id || null,
          agencyName: lessonData.location?.agency?.name || null,

          // Flattened tutor fields
          tutorId: lessonData.tutor?.id || null,
          tutorFirstName: lessonData.tutor?.firstName || null,
          tutorLastName: lessonData.tutor?.lastName || null,
          tutorFullName: lessonData.tutor
            ? `${lessonData.tutor.firstName} ${lessonData.tutor.lastName}`
            : null,
        };
      });

      console.log(`Found ${flattenedLessons.length} lessons`);
      return flattenedLessons;
    } catch (error) {
      console.error("Failed to fetch lessons:", error.message);
      throw new Error(`Failed to fetch lessons: ${error.message}`);
    }
  }

  async getLessonById(lessonId) {
    try {
      console.log(`Looking up lesson by ID: ${lessonId}`);
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
            attributes: ["id", "firstName", "lastName"],
            required: false,
          },
        ],
      });

      if (!lesson) {
        console.warn(`Lesson not found: ${lessonId}`);
        throw new Error("Lesson not found");
      }

      // Flatten the response structure
      const lessonData = lesson.toJSON();
      const flattenedLesson = {
        // Basic lesson fields
        id: lessonData.id,
        title: lessonData.title,
        description: lessonData.description,
        dayOfWeek: lessonData.dayOfWeek,
        startTime: lessonData.startTime,
        endTime: lessonData.endTime,
        studentRate: lessonData.studentRate,
        totalCap: lessonData.totalCap,
        lessonType: lessonData.lessonType,
        currentCap: lessonData.currentCap,
        isActive: lessonData.isActive,
        createdAt: lessonData.createdAt,
        updatedAt: lessonData.updatedAt,
        tutorRate: lessonData.tutorRate,
        startDate: lessonData.startDate,
        endDate: lessonData.endDate,

        // Flattened subject fields
        subjectId: lessonData.subject?.id || null,
        subjectName: lessonData.subject?.name || null,
        subjectGradeLevel: lessonData.subject?.gradeLevel || null,
        subjectCategory: lessonData.subject?.category || null,
        subjectDescription: lessonData.subject?.description || null,

        // Flattened location fields
        locationId: lessonData.location?.id || null,
        locationAddress: lessonData.location?.address || null,

        // Flattened agency fields
        agencyId: lessonData.location?.agency?.id || null,
        agencyName: lessonData.location?.agency?.name || null,

        // Flattened tutor fields
        tutorId: lessonData.tutor?.id || null,
        tutorFirstName: lessonData.tutor?.firstName || null,
        tutorLastName: lessonData.tutor?.lastName || null,
        tutorFullName: lessonData.tutor
          ? `${lessonData.tutor.firstName} ${lessonData.tutor.lastName}`
          : null,
      };

      console.log(`Lesson found: ${flattenedLesson.title}`);
      return flattenedLesson;
    } catch (error) {
      console.error(`Failed to fetch lesson ${lessonId}:`, error.message);
      throw new Error(`Failed to fetch lesson: ${error.message}`);
    }
  }

  async getAllLessonsByAgencyId(agencyId, location = 'all') {
    try {
      console.log(`Fetching lessons for agency: ${agencyId}, location: ${location}`);
      
      // Define include array first
      const include = [
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
          attributes: ["id", "firstName", "lastName"],
          required: false,
        },
      ];

      const where = {
        agencyId,
        isActive: true,
      };

      // location filtering
      if (location && location !== 'all') {
        // Create a copy of the location include with the where clause
        include[1] = {
          ...include[1],
          where: { address: location },
          required: true
        };
      }

      const lessons = await Lesson.findAll({
        include,
        where,
        order: [["createdAt", "DESC"]],
      });

      // Flatten the response structure
      const flattenedLessons = lessons.map((lesson) => {
        const lessonData = lesson.toJSON();
        return {
          // Basic lesson fields
          id: lessonData.id,
          title: lessonData.title,
          description: lessonData.description,
          dayOfWeek: lessonData.dayOfWeek,
          startTime: lessonData.startTime,
          endTime: lessonData.endTime,
          studentRate: lessonData.studentRate,
          totalCap: lessonData.totalCap,
          currentCap: lessonData.currentCap,
          isActive: lessonData.isActive,
          createdAt: lessonData.createdAt,
          updatedAt: lessonData.updatedAt,
          lessonType: lessonData.lessonType,
          tutorRate: lessonData.tutorRate,
          startDate: lessonData.startDate,
          endDate: lessonData.endDate,

          // Flattened subject fields
          subjectId: lessonData.subject?.id || null,
          subjectName: lessonData.subject?.name || null,
          subjectGradeLevel: lessonData.subject?.gradeLevel || null,
          subjectCategory: lessonData.subject?.category || null,
          subjectDescription: lessonData.subject?.description || null,

          // Flattened location fields
          locationId: lessonData.location?.id || null,
          locationAddress: lessonData.location?.address || null,

          // Flattened agency fields
          agencyId: lessonData.location?.agency?.id || null,
          agencyName: lessonData.location?.agency?.name || null,

          // Flattened tutor fields
          tutorId: lessonData.tutor?.id || null,
          tutorFirstName: lessonData.tutor?.firstName || null,
          tutorLastName: lessonData.tutor?.lastName || null,
          tutorFullName: lessonData.tutor
            ? `${lessonData.tutor.firstName} ${lessonData.tutor.lastName}`
            : null,
        };
      });

      console.log(`Found ${flattenedLessons.length} lessons for agency ${agencyId}`);
      return flattenedLessons;
    } catch (error) {
      console.error(`Failed to fetch lessons for agency ${agencyId}:`, error.message);
      throw new Error(`Failed to fetch lessons by agency ID: ${error.message}`);
    }
  }

  async createLesson(lessonData) {
    const transaction = await sequelize.transaction();
    try {
      console.log(
        "Creating lesson with data:",
        JSON.stringify(lessonData, null, 2)
      );

      const lesson = await Lesson.create({
        title: lessonData.title,
        description: lessonData.description,
        locationId: lessonData.locationId,
        agencyId: lessonData.agencyId,
        subjectId: lessonData.subjectId,
        tutorId: lessonData.tutorId,
        dayOfWeek: lessonData.dayOfWeek,
        startTime: lessonData.startTime,
        endTime: lessonData.endTime,
        startDate: lessonData.startDate,
        endDate: lessonData.endDate,
        studentRate: parseFloat(lessonData.studentRate),
        tutorRate: parseFloat(lessonData.tutorRate),
        totalCap: parseInt(lessonData.totalCap),
        currentCap: 0,
        isActive: lessonData.isActive !== false,
        lessonType: lessonData.lessonType

      }, { transaction });

      console.log(
        `Lesson created successfully: ${lesson.title} (ID: ${lesson.id})`
      );

      await transaction.commit();
      return lesson;
    } catch (error) {
      console.error("Lesson creation error:", error);
      throw new Error(`Failed to create lesson: ${error.message}`);
    }
  }



  //Helper function for generating attendance: 
  async generateAttendanceDates(lessonId, tutorId, dayOfWeek, transaction, monthsAhead) {
    try {
      console.log(`Generating attendance dates for lesson ${lessonId}, day: ${dayOfWeek}`);

      const start = new Date();
      const end = new Date();
      end.setMonth(start.getMonth() + monthsAhead);

      const dayIndex = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
      }[dayOfWeek.toLowerCase()];

      if (dayIndex === undefined) {
        throw new Error(`Invalid day of week: ${dayOfWeek}`);
      }

      const attendances = [];
      const currentDate = new Date(start);

      while (currentDate <= end) {
        if (currentDate.getDay() === dayIndex) {
          attendances.push({
            lessonId: lessonId,
            tutorId: tutorId || null, // ✅ Ensure null if undefined
            date: currentDate.toISOString().slice(0, 10),
            isAttended: false
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`Generated ${attendances.length} attendance dates`);
      console.log("Sample record:", JSON.stringify(attendances[0], null, 2)); // ✅ DEBUG

      if (attendances.length > 0) {
        // ✅ Try creating one record at a time to isolate the issue
        const createdRecords = [];
        for (const attendance of attendances) {
          try {
            const created = await Attendance.create(attendance, { transaction });
            createdRecords.push(created);
          } catch (error) {
            console.error("Failed to create individual attendance:", error);
            console.error("Attendance data:", JSON.stringify(attendance, null, 2));
            throw error;
          }
        }
        console.log(`Successfully created ${createdRecords.length} attendance records`);
      }

      return attendances.length;

    } catch (error) {
      console.error(`Failed to generate attendance dates:`, error);
      console.error("Error stack:", error.stack);
      throw new Error(`Failed to generate attendance dates: ${error.message}`);
    }
  }


  async updateLesson(lessonId, updateData) {
    try {
      console.log(
        `Updating lesson ${lessonId} with:`,
        JSON.stringify(updateData, null, 2)
      );
      const lesson = await Lesson.findByPk(lessonId);
      if (!lesson) {
        console.warn(`Lesson not found for update: ${lessonId}`);
        throw new Error("Lesson not found");
      }

      if (updateData.studentRate) {
        updateData.studentRate = parseFloat(updateData.studentRate);
      }
      if (updateData.totalCap) {
        updateData.totalCap = parseInt(updateData.totalCap);
      }

      await lesson.update(updateData);
      console.log(`Lesson updated successfully: ${lesson.title}`);
      return lesson;
    } catch (error) {
      console.error(`Failed to update lesson ${lessonId}:`, error.message);
      throw new Error(`Failed to update lesson: ${error.message}`);
    }
  }

  async deleteLesson(lessonId) {
    try {
      console.log(`Attempting to delete lesson: ${lessonId}`);
      const lesson = await Lesson.findByPk(lessonId);
      if (!lesson) {
        console.warn(`Lesson not found for deletion: ${lessonId}`);
        throw new Error("Lesson not found");
      }

      if (lesson.currentCap > 0) {
        console.warn(
          `Cannot delete lesson ${lessonId} - has ${lesson.currentCap} enrolled students`
        );
        throw new Error("Cannot delete lesson with enrolled students");
      }

      await lesson.destroy();
      console.log(`Lesson deleted successfully: ${lessonId}`);
    } catch (error) {
      console.error(`Failed to delete lesson ${lessonId}:`, error.message);
      throw new Error(`Failed to delete lesson: ${error.message}`);
    }
  }

  async getAllLessonsByStudentId(studentId, ongoing) {
    const student = await User.findByPk(studentId);
    if (!student || student.role !== "student") {
      throw new Error("Student not found");
    }

    const today = new Date().setUTCHours(0, 0, 0, 0);
    
    // Build where clause for StudentLesson
    const studentLessonWhere = { studentId };
    if (ongoing) {
      studentLessonWhere.startDate = { [Op.lte]: today };
      studentLessonWhere.endDate = { [Op.gte]: today };
    }

    // Fetch enrollments with lesson details
    const enrollments = await StudentLesson.findAll({
      where: studentLessonWhere,
      include: [
        {
          model: Lesson,
          as: 'lesson',
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
            },
            {
              model: Agency,
              as: "agency",
              attributes: ["id", "name"],
            },
            {
              model: User,
              as: "tutor",
              attributes: ["id", "firstName", "lastName"],
              required: false,
            },
          ],
        },
      ],
    });

    // Flatten the lesson data and include enrollment dates
    return enrollments.map(enrollment => ({
      ...enrollment.lesson.toJSON(),
      startDate: enrollment.startDate,
      endDate: enrollment.endDate,
    }));
  }

  async enrolStudentInLesson(studentId, lessonId) {
    const transaction = await sequelize.transaction();
    try {
      // Fetch student and lesson then check if they exist
      const student = await User.findByPk(studentId, { transaction });
      const lesson = await Lesson.findByPk(lessonId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!student || student.role !== "student") {
        throw new Error("Student not found");
      }
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // Set start and end dates for enrollment
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);

      // Check if lesson is full (count active enrollments)
      const currentCapacity = await StudentLesson.count({
        where: {
          lessonId,
          startDate: { [Op.lte]: today },
          endDate: { [Op.gte]: today },
        },
        transaction,
      });
      if (currentCapacity >= lesson.totalCap) {
        throw new Error("Lesson is full");
      }


      // Check if already enrolled
      const existing = await StudentLesson.findOne({
        where: {
          studentId,
          lessonId,
          startDate: { [Op.lte]: today },
          endDate: { [Op.gte]: today },
        },
        transaction,
      });
      if (existing) {
        throw new Error("Student is already enrolled in this lesson");
      }

      // Check grade level compatibility
      const subject = await Subject.findByPk(lesson.subjectId, { transaction });
      if (
        student.gradeLevel &&
        subject.gradeLevel &&
        student.gradeLevel !== subject.gradeLevel
      ) {
        throw new Error(
          "Student grade level does not match the lesson's grade level requirement"
        );
      }

      // Check for time clash
      const currentEnrollments = await StudentLesson.findAll({
        where: {
          studentId: student.id,
          startDate: { [Op.lte]: today },
          endDate: { [Op.gte]: today },
        },
        include: [
          {
            model: Lesson,
            as: 'lesson',
            attributes: ['id', 'dayOfWeek', 'startTime', 'endTime'],
          },
        ],
        transaction,
      });

      for (const enrollment of currentEnrollments) {
        const otherLesson = enrollment.lesson;
        if (
          otherLesson.dayOfWeek === lesson.dayOfWeek &&
          lesson.startTime < otherLesson.endTime &&
          lesson.endTime > otherLesson.startTime
        ) {
          throw new Error(
            "Lesson time clashes with another lesson student is currently enrolled in"
          );
        }
      }

      // Only generate if first student AND no attendance exists
      if (currentCapacity === 0) { // no students yet
        const existingAttendance = await Attendance.count({
          where: { lessonId },
          transaction,
        });

        if (existingAttendance === 0) { // no attendance exists
          if (!lesson.tutorId) {
            throw new Error("Cannot generate attendance - no tutor assigned");
          }
          await this.generateAttendanceDates(lesson.id, lesson.tutorId, lesson.dayOfWeek, transaction, 1);
        }
      }


      // Enrol student and update lesson's currentCap
      await StudentLesson.create({
        studentId: student.id,
        lessonId: lesson.id,
        startDate: today,
        endDate: endDate,
      }, { transaction });
      
      lesson.currentCap = currentCapacity + 1;
      await lesson.save({ transaction });

      await transaction.commit();

      return { studentId, lessonId };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async checkEnrollmentStatus(studentId, lessonId) {
    try {
      // Check if student exists
      const student = await User.findByPk(studentId);
      if (!student || student.role !== "student") {
        throw new Error("Student not found");
      }

      // Check if lesson exists
      const lesson = await Lesson.findByPk(lessonId);
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Check if student is currently enrolled in this lesson
      const enrollment = await StudentLesson.findOne({
        where: {
          studentId,
          lessonId,
          startDate: { [Op.lte]: today },
          [Op.or]: [{ endDate: { [Op.gte]: today } }, { endDate: null }],
        },
      });

      return {
        isEnrolled: !!enrollment,
        enrollmentDate: enrollment ? enrollment.startDate : null,
      };
    } catch (error) {
      console.error(
        `Failed to check enrollment status for student ${studentId} in lesson ${lessonId}:`,
        error.message
      );
      throw new Error(`Failed to check enrollment status: ${error.message}`);
    }
  }

  async unenrolStudentFromLesson(studentId, lessonId) {
    const transaction = await sequelize.transaction();
    try {
      // Fetch student and lesson then check if they exist
      const student = await User.findByPk(studentId, { transaction });
      const lesson = await Lesson.findByPk(lessonId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!student || student.role !== "student") {
        throw new Error("Student not found");
      }
      if (!lesson) {
        throw new Error("Lesson not found");
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Check if student is currently enrolled in this lesson
      const enrollment = await StudentLesson.findOne({
        where: {
          studentId,
          lessonId,
          startDate: { [Op.lte]: today },
          endDate: { [Op.gte]: today },
        },
        transaction,
      });

      if (!enrollment) {
        throw new Error("Student is not enrolled in this lesson");
      }

      // Remove enrollment and update lesson's currentCap
      await enrollment.destroy({ transaction });
      lesson.currentCap = Math.max(0, lesson.currentCap - 1);
      await lesson.save({ transaction });

      await transaction.commit();
      return { studentId, lessonId };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Business logic for dropdowns
  async getAllSubjects() {
    try {
      console.log("Fetching all active subjects");
      const subjects = await Subject.findAll({
        where: { isActive: true },
        attributes: ["id", "name", "description", "gradeLevel", "category"],
        order: [
          ["category", "ASC"],
          ["name", "ASC"],
        ],
      });
      console.log(`Retrieved ${subjects.length} active subjects`);
      return subjects;
    } catch (error) {
      console.error("Error fetching subjects:", error.message);
      throw new Error(`Error fetching subjects: ${error.message}`);
    }
  }
}

export default LessonService;