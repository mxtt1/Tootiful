import {
  Lesson,
  Subject,
  User,
  StudentLesson,
  Location,
  Agency,
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
    console.log(`Fetching lessons for agency: ${id}`);
    const lessons = await this.getAllLessonsByAgencyId(id); // Fetch all lessons for the agency
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
        currentCap: lessonData.currentCap,
        isActive: lessonData.isActive,
        createdAt: lessonData.createdAt,
        updatedAt: lessonData.updatedAt,

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

  async getAllLessonsByAgencyId(agencyId) {
    try {
      console.log(`Fetching lessons for agency: ${agencyId}`);
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
            required: false,
          },
        ],
        where: {
          agencyId,
          isActive: true,
        },
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

      console.log(
        `Found ${flattenedLessons.length} lessons for agency ${agencyId}`
      );
      return flattenedLessons;
    } catch (error) {
      console.error(
        `Failed to fetch lessons for agency ${agencyId}:`,
        error.message
      );
      throw new Error(`Failed to fetch lessons by agency ID: ${error.message}`);
    }
  }

  async createLesson(lessonData) {
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
        studentRate: parseFloat(lessonData.studentRate),
        totalCap: parseInt(lessonData.totalCap),
        currentCap: 0,
        isActive: lessonData.isActive !== false,
      });

      console.log(
        `Lesson created successfully: ${lesson.title} (ID: ${lesson.id})`
      );

      return lesson;
    } catch (error) {
      console.error("Lesson creation error:", error);
      throw new Error(`Failed to create lesson: ${error.message}`);
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

    const today = new Date().setHours(0, 0, 0, 0);
    // Common include for all lesson info
    const lessonInclude = [
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
    ];

    if (ongoing) {
      return await student.getStudentLessons({
        include: lessonInclude,
        through: {
          where: {
            startDate: { [Op.lte]: today },
            endDate: { [Op.gte]: today },
          },
        },
      });
    } else {
      return await student.getStudentLessons({
        include: lessonInclude,
      });
    }
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

      // Check for time clash
      const currentLessons = await student.getStudentLessons({
        joinTableAttributes: ["startDate", "endDate"],
        through: {
          where: {
            startDate: { [Op.lte]: today },
            endDate: { [Op.gte]: today },
          },
        },
        transaction,
      });
      for (const otherLesson of currentLessons) {
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

      // Enrol student and update lesson's currentCap
      await student.addStudentLesson(lesson, {
        through: { startDate: today, endDate: endDate },
        transaction,
      });
      lesson.currentCap = currentCapacity + 1;
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
