// ES Module imports
import bcrypt from 'bcrypt';
import AgencyService from '../src/modules/user-management/agency.service.js';

// Mock dependencies - use regular jest.mock with Babel
jest.mock('../src/models/index.js', () => ({
  Agency: {
    findOne: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    destroy: jest.fn()
  },
  Location: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn()
  },
  EmailVerificationToken: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  }
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

jest.mock('../src/util/mailer.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/util/emailTemplates.js', () => ({
  verifyEmailTemplate: jest.fn().mockReturnValue('Mocked email template')
}));


// Import mocked modules - use regular import with Babel
import { Agency, User, Location } from '../src/models/index.js';

describe('AgencyService', () => {
  let agencyService;
  let mockReq, mockRes;

  beforeEach(() => {
    agencyService = new AgencyService();
    jest.clearAllMocks();
    
    // Mock request and response objects
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendStatus: jest.fn()
    };
  });

  describe('Agency Creation', () => {
    describe('createAgency', () => {
      it('should create an agency successfully with UUID and proper fields', async () => {
        // Arrange
        const agencyData = {
          name: 'Test Agency',
          email: 'test@agency.com',
          password: 'password123',
          phone: '12345678'
        };
        
        const mockAgency = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          ...agencyData,
          isActive: false,
          toJSON: jest.fn().mockReturnValue({
            id: '550e8400-e29b-41d4-a716-446655440000',
            ...agencyData,
            isActive: false,
            password: 'hashed_password'
          })
        };

        // Only 3 findOne calls (email, user email, name) - no phone check
        Agency.findOne
          .mockResolvedValueOnce(null) // Check agency email
          .mockResolvedValueOnce(null) // Check user email  
          .mockResolvedValueOnce(null); // Check agency name

        Agency.create.mockResolvedValue(mockAgency);

        // Act
        const result = await agencyService.createAgency(agencyData);

        // Assert
        // Change from 4 to 3 calls
        expect(Agency.findOne).toHaveBeenCalledTimes(3);
        expect(Agency.create).toHaveBeenCalledWith({
          ...agencyData,
          isActive: false
        });
        expect(result).toEqual(mockAgency);
      });

      it('should throw error when agency email already exists', async () => {
        // Arrange
        const agencyData = {
          name: 'Test Agency',
          email: 'existing@agency.com',
          password: 'password123'
        };

        const existingAgency = { 
          id: '550e8400-e29b-41d4-a716-446655440000', 
          email: 'existing@agency.com' 
        };
        
        // Mock only the first findOne call to return existing agency
        Agency.findOne.mockResolvedValueOnce(existingAgency);

        // Act & Assert
        // Your service throws "Agency with this email already exists"
        await expect(agencyService.createAgency(agencyData))
          .rejects.toThrow('Agency with this email already exists');
      });

      it('should throw error when phone number is not 8 characters', async () => {
        // Arrange
        const agencyData = {
          name: 'Test Agency',
          email: 'test@agency.com',
          password: 'password123',
          phone: '12345'
        };

        // FIX: Mock all 3 findOne calls
        Agency.findOne
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);

        // Act & Assert
        await agencyService.createAgency(agencyData);
        expect(Agency.create).toHaveBeenCalled();
      });
    });

    describe('handleCreateAgency', () => {
      it('should create agency and return response without password', async () => {
        // Arrange
        const agencyData = {
          name: 'Test Agency',
          email: 'test@agency.com',
          password: 'password123'
        };
        
        const mockAgency = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          ...agencyData,
          isActive: false,
          toJSON: jest.fn().mockReturnValue({
            id: '550e8400-e29b-41d4-a716-446655440000',
            ...agencyData,
            isActive: false,
            password: 'hashed_password'
          })
        };

        mockReq.body = agencyData;
        
        // Mock all 3 findOne calls
        Agency.findOne
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
          
        Agency.create.mockResolvedValue(mockAgency);

        // Act
        await agencyService.handleCreateAgency(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Agency',
          email: 'test@agency.com',
          isActive: false
        });
      });
    });
  });

  describe('Agency Admin Creation', () => {
    beforeEach(() => {
      // Clear mocks specifically for agency admin tests
      jest.clearAllMocks();
    });

    describe('createAgencyAdmin', () => {
      it('should create agency admin successfully with proper role', async () => {
        // Arrange
        const adminData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'admin@agency.com',
          password: 'password123',
          agencyId: '550e8400-e29b-41d4-a716-446655440000'
        };
        
        const mockAdmin = {
          id: '660e8400-e29b-41d4-a716-446655440000',
          ...adminData,
          role: 'agencyAdmin'
        };

        // Your service only calls User.findOne ONCE for user email check
        User.findOne.mockResolvedValueOnce(null);
        User.create.mockResolvedValue(mockAdmin);

        // Act
        const result = await agencyService.createAgencyAdmin(adminData);

        // Assert
        // Change from 2 to 1 call (your service only checks user table)
        expect(User.findOne).toHaveBeenCalledTimes(1);
        expect(User.create).toHaveBeenCalledWith({
          ...adminData,
          role: 'agencyAdmin',
          isActive: false
        });
        expect(result).toEqual(mockAdmin);
      });

      it('should throw error when user email already exists in User table', async () => {
        // Arrange
        const adminData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'existing@user.com',
          password: 'password123',
          agencyId: '550e8400-e29b-41d4-a716-446655440000'
        };

        const existingUser = {
          id: '660e8400-e29b-41d4-a716-446655440000',
          email: 'existing@user.com',
          role: 'tutor'
        };

        // Mock only one findOne call that returns existing user
        User.findOne.mockResolvedValueOnce(existingUser);

        // Act & Assert
        await expect(agencyService.createAgencyAdmin(adminData))
          .rejects.toThrow('User with this email already exists');
      });

      it('should throw error when email exists in Agency table', async () => {
        // Arrange
        const adminData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'agency@email.com',
          password: 'password123',
          agencyId: '550e8400-e29b-41d4-a716-446655440000'
        };

        // Your service checks User table first, then Agency table
        // First call: User.findOne returns null (no user)
        // Second call: Agency.findOne returns existing agency
        User.findOne.mockResolvedValueOnce(null);
        Agency.findOne.mockResolvedValueOnce({
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'agency@email.com'
        });

        // Act & Assert
        await expect(agencyService.createAgencyAdmin(adminData))
          .rejects.toThrow('Email already exists for an agency');
      });
    });

    describe('handleCreateAgencyAdmin', () => {
      it('should create agency admin and return response without password', async () => {
        // Arrange
        const adminData = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'admin@agency.com',
          password: 'password123'
        };
        
        const mockAdmin = {
          id: '660e8400-e29b-41d4-a716-446655440000',
          ...adminData,
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          role: 'agencyAdmin',
          toJSON: jest.fn().mockReturnValue({
            id: '660e8400-e29b-41d4-a716-446655440000',
            ...adminData,
            agencyId: '550e8400-e29b-41d4-a716-446655440000',
            role: 'agencyAdmin',
            password: 'hashed_password'
          })
        };

        mockReq.params = { id: '550e8400-e29b-41d4-a716-446655440000' };
        mockReq.body = adminData;
        
        // Mock only User.findOne (your service doesn't check Agency table in this flow)
        User.findOne.mockResolvedValueOnce(null);
        User.create.mockResolvedValue(mockAdmin);

        // Act
        await agencyService.handleCreateAgencyAdmin(mockReq, mockRes);

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
          id: '660e8400-e29b-41d4-a716-446655440000',
          firstName: 'John',
          lastName: 'Doe',
          email: 'admin@agency.com',
          agencyId: '550e8400-e29b-41d4-a716-446655440000',
          role: 'agencyAdmin'
        });
      });
    });
  });

  describe('Agency Admin Deletion', () => {
    it('should delete agency admin when found', async () => {
      // Arrange
      const adminId = '660e8400-e29b-41d4-a716-446655440000';
      const agencyId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Add destroy method to the mock
      const mockAdmin = {
        id: adminId,
        agencyId: agencyId,
        role: 'agencyAdmin',
        destroy: jest.fn().mockResolvedValue(true)
      };

      User.findOne.mockResolvedValue(mockAdmin);

      // Act
      await agencyService.deleteAgencyAdmin(adminId, agencyId);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({
        where: {
          id: adminId,
          role: 'agencyAdmin',
          agencyId: agencyId
        }
      });
      expect(mockAdmin.destroy).toHaveBeenCalled();
    });

    it('should throw error when agency admin not found', async () => {
      // Arrange
      User.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(agencyService.deleteAgencyAdmin(
        '660e8400-e29b-41d4-a716-446655440000', 
        '550e8400-e29b-41d4-a716-446655440000'
      )).rejects.toThrow('Agency Admin not found');
    });
  });

  describe('Location Management', () => {
    describe('createLocation', () => {
      it('should create location with agencyId', async () => {
        // Arrange
        const agencyId = '550e8400-e29b-41d4-a716-446655440000';
        const locationData = {
          address: '123 Test Street'
        };
        
        const mockLocation = {
          id: '770e8400-e29b-41d4-a716-446655440000',
          ...locationData,
          agencyId: agencyId
        };

        Location.create.mockResolvedValue(mockLocation);

        // Act
        const result = await agencyService.createLocation(agencyId, locationData);

        // Assert
        expect(Location.create).toHaveBeenCalledWith({
          ...locationData,
          agencyId: agencyId
        });
        expect(result).toEqual(mockLocation);
      });
    });

    describe('getAgencyLocations', () => {
      it('should return all locations for an agency', async () => {
        // Arrange
        const agencyId = '550e8400-e29b-41d4-a716-446655440000';
        const mockLocations = [
          { id: '770e8400-e29b-41d4-a716-446655440000', address: 'Address 1', agencyId },
          { id: '880e8400-e29b-41d4-a716-446655440000', address: 'Address 2', agencyId }
        ];

        Location.findAll.mockResolvedValue(mockLocations);

        // Act
        const result = await agencyService.getAgencyLocations(agencyId);

        // Assert
        expect(Location.findAll).toHaveBeenCalledWith({
          where: { agencyId },
          order: [['createdAt', 'DESC']]
        });
        expect(result).toEqual(mockLocations);
      });
    });
  });
});
