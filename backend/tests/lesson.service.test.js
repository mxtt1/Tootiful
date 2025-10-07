// ES Module imports
import LessonService from '../src/modules/user-management/lesson.service.js';

// Mock dependencies
jest.mock('../src/models/index.js', () => ({
  Lesson: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Subject: {
    findAll: jest.fn()
  },
  User: {
    findOne: jest.fn()
  }
}));

jest.mock('../src/util/mailer.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/util/emailTemplates.js', () => ({
  verifyEmailTemplate: jest.fn().mockReturnValue('Mocked email template')
}));

// Import mocked modules
import { Lesson, Subject, User } from '../src/models/index.js';

describe('LessonService', () => {
  let lessonService;
  let mockReq, mockRes;

  beforeEach(() => {
    lessonService = new LessonService();
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('Lesson Creation', () => {
    describe('createLesson', () => {
      it('should create a lesson successfully with all required fields', async () => {
        // Arrange
        const lessonData = {
          title: 'Math Basics',
          description: 'Introduction to mathematics',
          locationId: '550e8400-e29b-41d4-a716-446655440000',
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          subjectId: '660e8400-e29b-41d4-a716-446655440000',
          tutorId: '770e8400-e29b-41d4-a716-446655440000',
          dayOfWeek: 'monday',
          startTime: '09:00:00',
          endTime: '10:00:00',
          studentRate: 50,
          totalCap: 20,
          isActive: true
        };
        
        const mockLesson = {
          id: '880e8400-e29b-41d4-a716-446655440000',
          ...lessonData,
          currentCap: 0
        };

        Lesson.create.mockResolvedValue(mockLesson);

        // Act
        const result = await lessonService.createLesson(lessonData);

        // Assert
        expect(Lesson.create).toHaveBeenCalledWith({
          title: 'Math Basics',
          description: 'Introduction to mathematics',
          locationId: '550e8400-e29b-41d4-a716-446655440000',
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          subjectId: '660e8400-e29b-41d4-a716-446655440000',
          tutorId: '770e8400-e29b-41d4-a716-446655440000',
          dayOfWeek: 'monday',
          startTime: '09:00:00',
          endTime: '10:00:00',
          studentRate: 50,
          totalCap: 20,
          currentCap: 0,
          isActive: true
        });
        expect(result).toEqual(mockLesson);
      });

      it('should set isActive to true when not provided', async () => {
        // Arrange
        const lessonData = {
          title: 'Science Class',
          locationId: '550e8400-e29b-41d4-a716-446655440000',
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          subjectId: '660e8400-e29b-41d4-a716-446655440000',
          dayOfWeek: 'tuesday',
          startTime: '10:00:00',
          endTime: '11:00:00',
          studentRate: 60,
          totalCap: 15
          // isActive not provided
        };

        const mockLesson = {
          id: '880e8400-e29b-41d4-a716-446655440000',
          ...lessonData,
          isActive: true,
          currentCap: 0
        };

        Lesson.create.mockResolvedValue(mockLesson);

        // Act
        const result = await lessonService.createLesson(lessonData);

        // Assert
        expect(Lesson.create).toHaveBeenCalledWith(
          expect.objectContaining({
            isActive: true
          })
        );
      });
    });

    describe('handleCreateLesson', () => {
      it('should create lesson and return success response', async () => {
        // Arrange
        const lessonData = {
          title: 'English Lesson',
          locationId: '550e8400-e29b-41d4-a716-446655440000',
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          subjectId: '660e8400-e29b-41d4-a716-446655440000',
          dayOfWeek: 'wednesday',
          startTime: '14:00:00',
          endTime: '15:00:00',
          studentRate: 55,
          totalCap: 25
        };
        
        const mockLesson = {
          id: '880e8400-e29b-41d4-a716-446655440000',
          ...lessonData,
          currentCap: 0,
          isActive: true,
          toJSON: jest.fn().mockReturnValue({
            id: '880e8400-e29b-41d4-a716-446655440000',
            ...lessonData,
            currentCap: 0,
            isActive: true
          })
        };

        mockReq.body = lessonData;
        Lesson.create.mockResolvedValue(mockLesson);

        // Act
        await lessonService.handleCreateLesson(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Lesson created successfully',
        data: expect.objectContaining({
            id: '880e8400-e29b-41d4-a716-446655440000',
            title: 'English Lesson',
            locationId: '550e8400-e29b-41d4-a716-446655440000',
            agencyId: '550e8400-e29b-41d4-a716-446655440000',
            subjectId: '660e8400-e29b-41d4-a716-446655440000',
            dayOfWeek: 'wednesday',
            startTime: '14:00:00',
            endTime: '15:00:00',
            studentRate: 55,
            totalCap: 25,
            currentCap: 0,
            isActive: true
        })
        });
      });
    });
  });

  describe('Lesson Retrieval', () => {
    describe('getAllLessons', () => {
      it('should return all lessons ordered by creation date', async () => {
        // Arrange
        const mockLessons = [
          { id: 'lesson1', title: 'Math', createdAt: '2023-01-01' },
          { id: 'lesson2', title: 'Science', createdAt: '2023-01-02' }
        ];

        Lesson.findAll.mockResolvedValue(mockLessons);

        // Act
        const result = await lessonService.getAllLessons();

        // Assert
        expect(Lesson.findAll).toHaveBeenCalledWith({
          order: [['createdAt', 'DESC']]
        });
        expect(result).toEqual(mockLessons);
      });
    });

    describe('getLessonById', () => {
      it('should return lesson when found', async () => {
        // Arrange
        const lessonId = '550e8400-e29b-41d4-a716-446655440000';
        const mockLesson = {
          id: lessonId,
          title: 'Math Class'
        };

        Lesson.findByPk.mockResolvedValue(mockLesson);

        // Act
        const result = await lessonService.getLessonById(lessonId);

        // Assert
        expect(Lesson.findByPk).toHaveBeenCalledWith(lessonId);
        expect(result).toEqual(mockLesson);
      });

      it('should throw error when lesson not found', async () => {
        // Arrange
        Lesson.findByPk.mockResolvedValue(null);

        // Act & Assert
        await expect(lessonService.getLessonById('invalid-id'))
          .rejects.toThrow('Lesson not found');
      });
    });

    describe('getAllLessonsByAgencyId', () => {
      it('should return lessons filtered by agency ID', async () => {
        // Arrange
        const agencyId = '550e8400-e29b-41d4-a716-446655440000';
        const mockLessons = [
          { id: 'lesson1', title: 'Math', agencyId },
          { id: 'lesson2', title: 'Science', agencyId }
        ];

        Lesson.findAll.mockResolvedValue(mockLessons);

        // Act
        const result = await lessonService.getAllLessonsByAgencyId(agencyId);

        // Assert
        expect(Lesson.findAll).toHaveBeenCalledWith({
          where: { agencyId },
          order: [['createdAt', 'DESC']]
        });
        expect(result).toEqual(mockLessons);
      });
    });

    describe('handleGetAllLessons', () => {
      it('should return all lessons with success response', async () => {
        // Arrange
        const mockLessons = [
          { id: 'lesson1', title: 'Math' },
          { id: 'lesson2', title: 'Science' }
        ];

        Lesson.findAll.mockResolvedValue(mockLessons);

        // Act
        await lessonService.handleGetAllLessons(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockLessons
        });
      });
    });
  });

  describe('Lesson Update', () => {
    describe('updateLesson', () => {
      it('should update lesson successfully', async () => {
        // Arrange
        const lessonId = '550e8400-e29b-41d4-a716-446655440000';
        const updateData = {
          title: 'Updated Math Class',
          studentRate: 65,
          totalCap: 30
        };

        const mockLesson = {
          id: lessonId,
          title: 'Old Title',
          update: jest.fn().mockResolvedValue(true)
        };

        Lesson.findByPk.mockResolvedValue(mockLesson);

        // Act
        const result = await lessonService.updateLesson(lessonId, updateData);

        // Assert
        expect(Lesson.findByPk).toHaveBeenCalledWith(lessonId);
        expect(mockLesson.update).toHaveBeenCalledWith({
          title: 'Updated Math Class',
          studentRate: 65,
          totalCap: 30
        });
      });

      it('should parse numeric fields when provided', async () => {
        // Arrange
        const lessonId = '550e8400-e29b-41d4-a716-446655440000';
        const updateData = {
          studentRate: '75', // string input
          totalCap: '25' // string input
        };

        const mockLesson = {
          id: lessonId,
          title: 'Test Lesson',
          update: jest.fn().mockResolvedValue(true)
        };

        Lesson.findByPk.mockResolvedValue(mockLesson);

        // Act
        await lessonService.updateLesson(lessonId, updateData);

        // Assert
        expect(mockLesson.update).toHaveBeenCalledWith({
          studentRate: 75,
          totalCap: 25
        });
      });
    });
  });

  describe('Lesson Deletion', () => {
    describe('deleteLesson', () => {
      it('should delete lesson when no students enrolled', async () => {
        // Arrange
        const lessonId = '550e8400-e29b-41d4-a716-446655440000';
        const mockLesson = {
          id: lessonId,
          currentCap: 0,
          destroy: jest.fn().mockResolvedValue(true)
        };

        Lesson.findByPk.mockResolvedValue(mockLesson);

        // Act
        await lessonService.deleteLesson(lessonId);

        // Assert
        expect(Lesson.findByPk).toHaveBeenCalledWith(lessonId);
        expect(mockLesson.destroy).toHaveBeenCalled();
      });

      it('should throw error when lesson has enrolled students', async () => {
        // Arrange
        const lessonId = '550e8400-e29b-41d4-a716-446655440000';
        const mockLesson = {
          id: lessonId,
          currentCap: 5, // students enrolled
          destroy: jest.fn()
        };

        Lesson.findByPk.mockResolvedValue(mockLesson);

        // Act & Assert
        await expect(lessonService.deleteLesson(lessonId))
          .rejects.toThrow('Cannot delete lesson with enrolled students');
        expect(mockLesson.destroy).not.toHaveBeenCalled();
      });

      it('should throw error when lesson not found', async () => {
        // Arrange
        Lesson.findByPk.mockResolvedValue(null);

        // Act & Assert
        await expect(lessonService.deleteLesson('invalid-id'))
          .rejects.toThrow('Lesson not found');
      });
    });

    describe('handleDeleteLesson', () => {
      it('should delete lesson and return success response', async () => {
        // Arrange
        const lessonId = '550e8400-e29b-41d4-a716-446655440000';
        const mockLesson = {
          id: lessonId,
          currentCap: 0,
          destroy: jest.fn().mockResolvedValue(true)
        };

        mockReq.params = { id: lessonId };
        Lesson.findByPk.mockResolvedValue(mockLesson);

        // Act
        await lessonService.handleDeleteLesson(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Lesson deleted successfully'
        });
      });
    });
  });

  describe('Subject Management', () => {
    describe('getAllSubjects', () => {
      it('should return active subjects ordered by category and name', async () => {
        // Arrange
        const mockSubjects = [
          { id: 'sub1', name: 'Math', category: 'Science' },
          { id: 'sub2', name: 'Physics', category: 'Science' }
        ];

        Subject.findAll.mockResolvedValue(mockSubjects);

        // Act
        const result = await lessonService.getAllSubjects();

        // Assert
        expect(Subject.findAll).toHaveBeenCalledWith({
          where: { isActive: true },
          attributes: ['id', 'name', 'description', 'category'],
          order: [['category', 'ASC'], ['name', 'ASC']]
        });
        expect(result).toEqual(mockSubjects);
      });
    });

    describe('handleGetAllSubjects', () => {
      it('should return subjects with 200 status', async () => {
        // Arrange
        const mockSubjects = [
          { id: 'sub1', name: 'Math' },
          { id: 'sub2', name: 'Science' }
        ];

        Subject.findAll.mockResolvedValue(mockSubjects);

        // Act
        await lessonService.handleGetAllSubjects(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(mockSubjects);
      });
    });
  });
});