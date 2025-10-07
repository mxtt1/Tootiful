// ES Module imports
import TutorService from '../src/modules/user-management/tutor.service.js';

// Mock dependencies
jest.mock('../src/models/index.js', () => ({
  User: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  Subject: {
    findAll: jest.fn(),
    create: jest.fn()
  },
  Agency: {
    findOne: jest.fn()
  },
  TutorSubject: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  }
}));

jest.mock('../src/util/mailer.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/util/emailTemplates.js', () => ({
  verifyEmailTemplate: jest.fn().mockReturnValue('Mocked email template')
}));

// Import mocked modules
import { User, Subject, Agency, TutorSubject } from '../src/models/index.js';

describe('TutorService - Available Tutors', () => {
  let tutorService;
  let mockReq, mockRes;

  beforeEach(() => {
    tutorService = new TutorService();
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

  describe('getAvailableTutorsForSubject', () => {
    it('should return available tutors filtered by subject and agency', async () => {
      // Arrange
      const subjectId = '550e8400-e29b-41d4-a716-446655440000';
      const agencyId = '660e8400-e29b-41d4-a716-446655440000';
      
      const mockTutors = [
        {
          id: '770e8400-e29b-41d4-a716-446655440000',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@tutor.com',
          role: 'tutor',
          isActive: true,
          isSuspended: false,
          agencyId: agencyId,
          subjects: [
            {
              id: subjectId,
              name: 'Mathematics',
              TutorSubject: {
                experienceLevel: 'intermediate',
                hourlyRate: 45
              }
            }
          ]
        }
      ];

      User.findAll.mockResolvedValue(mockTutors);

      // Act
      const result = await tutorService.getAvailableTutorsForSubject(subjectId, agencyId);

      // Assert
      expect(User.findAll).toHaveBeenCalledWith({
        where: {
          role: 'tutor',
          isActive: true,
          isSuspended: false,
          agencyId: agencyId
        },
        include: [
          {
            model: Subject,
            as: 'subjects',
            where: { id: subjectId },
            through: { attributes: ['experienceLevel', 'hourlyRate'] },
            required: true
          }
        ],
        attributes: { exclude: ['password'] },
        order: [['firstName', 'ASC'], ['lastName', 'ASC']]
      });
      expect(result).toEqual(mockTutors);
    });

    it('should return available tutors without agency filter when agencyId is null', async () => {
      // Arrange
      const subjectId = '550e8400-e29b-41d4-a716-446655440000';
      const mockTutors = [
        {
          id: '770e8400-e29b-41d4-a716-446655440000',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'tutor',
          isActive: true,
          isSuspended: false,
          agencyId: null, // No agency
          subjects: [
            {
              id: subjectId,
              name: 'Science',
              TutorSubject: {
                experienceLevel: 'advanced',
                hourlyRate: 60
              }
            }
          ]
        }
      ];

      User.findAll.mockResolvedValue(mockTutors);

      // Act
      const result = await tutorService.getAvailableTutorsForSubject(subjectId, null);

      // Assert
      expect(User.findAll).toHaveBeenCalledWith({
        where: {
          role: 'tutor',
          isActive: true,
          isSuspended: false
          // No agencyId filter
        },
        include: [
          {
            model: Subject,
            as: 'subjects',
            where: { id: subjectId },
            through: { attributes: ['experienceLevel', 'hourlyRate'] },
            required: true
          }
        ],
        attributes: { exclude: ['password'] },
        order: [['firstName', 'ASC'], ['lastName', 'ASC']]
      });
      expect(result).toEqual(mockTutors);
    });

    it('should only return active and non-suspended tutors', async () => {
      // Arrange
      const subjectId = '550e8400-e29b-41d4-a716-446655440000';
      const agencyId = '660e8400-e29b-41d4-a716-446655440000';

      const mockTutors = [
        {
          id: '770e8400-e29b-41d4-a716-446655440000',
          firstName: 'Active',
          lastName: 'Tutor',
          role: 'tutor',
          isActive: true,
          isSuspended: false,
          agencyId: agencyId,
          subjects: [/* subjects array */]
        }
        // Inactive or suspended tutors should not be included
      ];

      User.findAll.mockResolvedValue(mockTutors);

      // Act
      const result = await tutorService.getAvailableTutorsForSubject(subjectId, agencyId);

      // Assert
      expect(User.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            isSuspended: false
          })
        })
      );
    });
  });

  describe('handleGetAvailableTutorsForSubject', () => {
    it('should return available tutors with success response', async () => {
      // Arrange
      const subjectId = '550e8400-e29b-41d4-a716-446655440000';
      const agencyId = '660e8400-e29b-41d4-a716-446655440000';
      
      const mockTutors = [
        {
          id: '770e8400-e29b-41d4-a716-446655440000',
          firstName: 'John',
          lastName: 'Doe',
          role: 'tutor'
        }
      ];

      mockReq.query = { subjectId, agencyId };
      User.findAll.mockResolvedValue(mockTutors);

      // Act
      await tutorService.handleGetAvailableTutorsForSubject(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTutors
      });
    });

    it('should return 400 error when subjectId is missing', async () => {
      // Arrange
      mockReq.query = { agencyId: '660e8400-e29b-41d4-a716-446655440000' };
      // subjectId is missing

      // Act
      await tutorService.handleGetAvailableTutorsForSubject(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'subjectId is required'
      });
      expect(User.findAll).not.toHaveBeenCalled();
    });

    it('should return 500 error when database query fails', async () => {
      // Arrange
      const subjectId = '550e8400-e29b-41d4-a716-446655440000';
      mockReq.query = { subjectId };

      const dbError = new Error('Database connection failed');
      User.findAll.mockRejectedValue(dbError);

      // Act
      await tutorService.handleGetAvailableTutorsForSubject(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection failed'
      });
    });
  });
});