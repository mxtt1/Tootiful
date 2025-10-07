import { Lesson, Subject, User } from '../../models/index.js';

class LessonService {
  async handleGetAllSubjects(req, res) {
    console.log('Fetching all subjects');
    const subjects = await this.getAllSubjects();
    console.log(`Retrieved ${subjects.length} subjects`);
    res.status(200).json(subjects);
  }


  // Handler methods for routes
  async handleGetAllLessons(req, res) {
    console.log('Fetching all lessons');
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
      data: lessons
    });
  }

  async handleGetLessonById(req, res) {
    const { id } = req.params;    
    console.log(`Fetching lessons by ID: ${id}`);
    const lesson = await this.getLessonById(id);
    console.log(`Retrieved lesson: ${lesson.title}`);

    res.status(200).json({
      success: true,
      data: lesson
    });
  }

  async handleCreateLesson(req, res) {
    console.log('Creating new lesson');
    const lesson = await this.createLesson(req.body);
    console.log(`Lesson created successfully: ${lesson.title} (ID: ${lesson.id})`);

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  }

  async handleUpdateLesson(req, res) {
    const { id } = req.params;
    console.log(`Updating lesson: ${id}`);
    const lesson = await this.updateLesson(id, req.body);
    console.log(`Lesson updated successfully: ${lesson.title}`);
    res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      data: lesson
    });
  }

  async handleDeleteLesson(req, res) {
    const { id } = req.params;
    console.log(`Deleting lesson: ${id}`);
    await this.deleteLesson(id);
    console.log(`Lesson deleted successfully: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  }

  // getAllLessons without pagination and filtering, this is abit iffy havent really test so take note of these if things goes wrong.
  async getAllLessons() {
    try {
      console.log('Executing getAllLessons query');
      const lessons = await Lesson.findAll({
        order: [['createdAt', 'DESC']],
      });
      console.log(`Found ${lessons.length} total lessons`);
      return lessons;
    } catch (error) {
      console.error('Failed to fetch lessons:', error.message);
      throw new Error(`Failed to fetch lessons: ${error.message}`);
    }
  }

  async getLessonById(lessonId) {
    try {
      console.log(`Looking up lesson by ID: ${lessonId}`);
      const lesson = await Lesson.findByPk(lessonId);

      if (!lesson) {
        console.warn(`Lesson not found: ${lessonId}`);
        throw new Error('Lesson not found');
      }

      console.log(`Lesson found: ${lesson.title}`);
      return lesson;
    } catch (error) {
      console.error(`Failed to fetch lesson ${lessonId}:`, error.message);
      throw new Error(`Failed to fetch lesson: ${error.message}`);
    }
  }

  async getAllLessonsByAgencyId(agencyId) {
    try {
      console.log(`Fetching lessons for agency: ${agencyId}`);
      const lessons = await Lesson.findAll({
        where: { agencyId },
        order: [['createdAt', 'DESC']]
      });
      console.log(`Found ${lessons.length} lessons for agency ${agencyId}`);
      return lessons;
    } catch (error) {
      console.error(`Failed to fetch lessons for agency ${agencyId}:`, error.message);
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

      console.log(`Lesson created successfully: ${lesson.title} (ID: ${lesson.id})`);

      return lesson;
    } catch (error) {
      console.error("Lesson creation error:", error);
      throw new Error(`Failed to create lesson: ${error.message}`);
    }
  }

  async updateLesson(lessonId, updateData) {
    try {
      console.log(`Updating lesson ${lessonId} with:`, JSON.stringify(updateData, null, 2));
      const lesson = await Lesson.findByPk(lessonId);
      if (!lesson) {
        console.warn(`Lesson not found for update: ${lessonId}`);
        throw new Error('Lesson not found');
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
        throw new Error('Lesson not found');
      }

      if (lesson.currentCap > 0) {
        console.warn(`Cannot delete lesson ${lessonId} - has ${lesson.currentCap} enrolled students`);
        throw new Error('Cannot delete lesson with enrolled students');
      }

      await lesson.destroy();
      console.log(`Lesson deleted successfully: ${lessonId}`);
    } catch (error) {
      console.error(`Failed to delete lesson ${lessonId}:`, error.message);
      throw new Error(`Failed to delete lesson: ${error.message}`);
    }
  }

  // Business logic for dropdowns
  async getAllSubjects() {
    try {
      console.log('Fetching all active subjects');
      const subjects = await Subject.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'description', 'category'],
        order: [['category', 'ASC'], ['name', 'ASC']]
      });
      console.log(`Retrieved ${subjects.length} active subjects`);
      return subjects;
    } catch (error) {
        console.error('Error fetching subjects:', error.message);
      throw new Error(`Error fetching subjects: ${error.message}`);
    }
  }

}

export default LessonService;