import { Lesson, Subject, User } from '../../models/index.js';

class LessonService {
  async handleGetAllSubjects(req, res) {
    const subjects = await this.getAllSubjects();
    res.status(200).json(subjects);
  }


  // Handler methods for routes
  async handleGetAllLessons(req, res) {
    const lessons = await this.getAllLessons();

    res.status(200).json({
      success: true,
      data: lessons,
    });
  }

  async handleGetLessonsByAgencyId(req, res) {
    const { id } = req.params;
    const lessons = await this.getAllLessonsByAgencyId(id); // Fetch all lessons for the agency
    res.status(200).json({
      success: true,
      data: lessons
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

  // getAllLessons without pagination and filtering, this is abit iffy havent really test so take note of these if things goes wrong.
  async getAllLessons() {
    try {
      return await Lesson.findAll({
        order: [['createdAt', 'DESC']],
      });
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

  async getAllLessonsByAgencyId(agencyId) {
    try {
      return await Lesson.findAll({
        where: { agencyId },
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      throw new Error(`Failed to fetch lessons by agency ID: ${error.message}`);
    }
  }

  async createLesson(lessonData) {
    try {
      console.log("Creating lesson with data:", JSON.stringify(lessonData, null, 2));

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
      console.error("Lesson creation error:", error);
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

}

export default LessonService;