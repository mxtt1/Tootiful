import express from 'express';
import tutorService from './tutor.service.js';

const router = express.Router();

// GET /api/tutors - Get all tutors with optional filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      active, 
      minRate, 
      maxRate, 
      subject, 
      experience 
    } = req.query;
    const options = { page, limit };

    let result;
    
    // Search by subject and experience
    if (subject && experience) {
      const validExperiences = ['beginner', 'intermediate', 'advanced', 'expert'];
      if (!validExperiences.includes(experience)) {
        return res.status(400).json({
          success: false,
          message: 'Experience must be one of: beginner, intermediate, advanced, expert'
        });
      }
      result = await tutorService.searchTutorsBySubjectAndExperience(subject, experience, options);
    }
    // Search by subject only
    else if (subject) {
      result = await tutorService.searchTutorsBySubject(subject, options);
    }
    // Filter by hourly rate range
    else if (minRate && maxRate) {
      result = await tutorService.getTutorsByHourlyRateRange(
        parseFloat(minRate), 
        parseFloat(maxRate), 
        options
      );
    }
    // Filter by active status
    else if (active === 'true') {
      result = await tutorService.getActiveTutors(options);
    }
    // Get all tutors
    else {
      result = await tutorService.getAllTutors(options);
    }

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/tutors/:id - Get tutor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tutor = await tutorService.getTutorById(id);
    
    res.status(200).json({
      success: true,
      data: tutor
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/tutors - Create new tutor
router.post('/', async (req, res) => {
  try {
    const { tutorData, subjects } = req.body;
    const newTutor = await tutorService.createTutor(tutorData, subjects);
    
    // Remove password from response
    const { password, ...tutorResponse } = newTutor.toJSON();
    
    res.status(201).json({
      success: true,
      data: tutorResponse,
      message: 'Tutor created successfully'
    });
  } catch (error) {
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors.map(e => e.message).join(', ')
      });
    }
    
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/tutors/login - Tutor login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const tutor = await tutorService.authenticateTutor(email, password);
    
    res.status(200).json({
      success: true,
      data: tutor,
      message: 'Tutor authenticated successfully'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// PATCH /api/tutors/:id - Update tutor (partial)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tutorData, subjects } = req.body;
    
    // Prevent password updates through this route
    if (tutorData && tutorData.password) {
      return res.status(400).json({
        success: false,
        message: 'Use the password change endpoint to update passwords'
      });
    }
    
    const updatedTutor = await tutorService.updateTutor(id, tutorData, subjects);
    
    // Remove password from response
    const { password, ...tutorResponse } = updatedTutor.toJSON();
    
    res.status(200).json({
      success: true,
      data: tutorResponse,
      message: 'Tutor updated successfully'
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// PATCH /api/tutors/:id/password - Change tutor password
router.patch('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    await tutorService.changePassword(id, currentPassword, newPassword);
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors.map(e => e.message).join(', ')
      });
    }
    
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('incorrect') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE /api/tutors/:id - Delete tutor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await tutorService.deleteTutor(id);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// PATCH /api/tutors/:id/deactivate - Soft delete tutor
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTutor = await tutorService.deactivateTutor(id);
    
    res.status(200).json({
      success: true,
      data: updatedTutor,
      message: 'Tutor deactivated successfully'
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// Subject management routes
// GET /api/tutors/subjects - Get all subjects
router.get('/subjects/all', async (req, res) => {
  try {
    const subjects = await tutorService.getAllSubjects();
    
    res.status(200).json({
      success: true,
      data: subjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/tutors/subjects - Create new subject
router.post('/subjects', async (req, res) => {
  try {
    const subjectData = req.body;
    const newSubject = await tutorService.createSubject(subjectData);
    
    res.status(201).json({
      success: true,
      data: newSubject,
      message: 'Subject created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
