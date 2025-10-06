import { Lesson, Location, Subject, User } from '../../models/index.js';

class LessonService {
  async handleGetAllSubjects(req, res) {
    const subjects = await this.getAllSubjects();
    res.status(200).json(subjects);
  }

  // In lesson.service.js - fix the handleGetLocationsByAgency method
  async handleGetLocationsByAgency(req, res) {
    try {
      // ✅ The user is an agency admin, get their agencyId
      const agencyId = req.user.agencyId; // This should be the agency they belong to

      console.log("🔍 Agency Admin User:", req.user.email);
      console.log("🔍 Fetching locations for agencyId:", agencyId);

      const locations = await Location.findAll({
        where: {
          agencyId: agencyId
        },
        attributes: ['id', 'address', 'agencyId', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      console.log("📍 Found locations:", locations.length);

      res.status(200).json({
        success: true,
        data: locations
      });
    } catch (error) {
      console.error("❌ Error fetching locations:", error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Handler methods for routes
  async handleGetAllLessons(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const agencyId = req.user.agencyId || req.user.id; // Add agency filtering

    const result = await this.getAllLessons(page, limit, agencyId);

    res.status(200).json({
      success: true,
      data: result.lessons,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        total: result.total
      }
    });
  }

  async handleGetLessonById(req, res) {
    const { id } = req.params;
    const lesson = await this.getLessonById(id);

    res.status(200).json({
      success: true,
      data: lesson
    });
  }

  async handleCreateLesson(req, res) {
    const lesson = await this.createLesson(req.body);

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  }

  async handleUpdateLesson(req, res) {
    const { id } = req.params;
    const lesson = await this.updateLesson(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      data: lesson
    });
  }

  async handleDeleteLesson(req, res) {
    const { id } = req.params;
    await this.deleteLesson(id);

    res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  }

  // Business logic methods (REMOVE DUPLICATE - keep only this one)
  async getAllLessons(page = 1, limit = 10, agencyId = null) {
    try {
      const offset = (page - 1) * limit;

      // Add agency filtering
      const whereClause = agencyId ? { agencyId } : {};

      const { count, rows } = await Lesson.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['createdAt', 'DESC']]
      });

      return {
        lessons: rows,
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to fetch lessons: ${error.message}`);
    }
  }

  async getLessonById(lessonId) {
    try {
      const lesson = await Lesson.findByPk(lessonId);

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      return lesson;
    } catch (error) {
      throw new Error(`Failed to fetch lesson: ${error.message}`);
    }
  }

  async createLesson(lessonData) {
    try {
      console.log("📥 Creating lesson with data:", JSON.stringify(lessonData, null, 2));

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
        isActive: lessonData.isActive !== false
      });

      return lesson;
    } catch (error) {
      console.error("❌ Lesson creation error:", error);
      throw new Error(`Failed to create lesson: ${error.message}`);
    }
  }

  async updateLesson(lessonId, updateData) {
    try {
      const lesson = await Lesson.findByPk(lessonId);
      if (!lesson) {
        throw new Error('Lesson not found');
      }

      if (updateData.studentRate) {
        updateData.studentRate = parseFloat(updateData.studentRate);
      }
      if (updateData.totalCap) {
        updateData.totalCap = parseInt(updateData.totalCap);
      }

      await lesson.update(updateData);
      return lesson;
    } catch (error) {
      throw new Error(`Failed to update lesson: ${error.message}`);
    }
  }

  async deleteLesson(lessonId) {
    try {
      const lesson = await Lesson.findByPk(lessonId);
      if (!lesson) {
        throw new Error('Lesson not found');
      }

      await lesson.destroy();
    } catch (error) {
      throw new Error(`Failed to delete lesson: ${error.message}`);
    }
  }

  // Business logic for dropdowns
  async getAllSubjects() {
    try {
      return await Subject.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'description', 'category'],
        order: [['category', 'ASC'], ['name', 'ASC']]
      });
    } catch (error) {
      throw new Error(`Error fetching subjects: ${error.message}`);
    }
  }

  // Remove the duplicate getAllLocationsByAgency method and the unused getAllLocations method
}

export default LessonService;