import express from 'express';
import studentService from './student.service.js';

const router = express.Router();

// GET /api/students - Get all students
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, active, gradeLevel } = req.query;
    const options = { page, limit };

    if (gradeLevel) {
      const result = await studentService.getStudentsByGradeLevel(gradeLevel, options);
      return res.status(200).json({
        success: true,
        data: result.rows,
        pagination: {
          total: result.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(result.count / limit)
        }
      });
    }

    let result;
    if (active === 'true') {
      result = await studentService.getActiveStudents(options);
    } else {
      result = await studentService.getAllStudents(options);
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

// GET /api/students/:id - Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const student = await studentService.getStudentById(id);
    
    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/students - Create new student
router.post('/', async (req, res) => {
  try {
    const studentData = req.body;
    const newStudent = await studentService.createStudent(studentData);
    
    // Remove password from response
    const { password, ...studentResponse } = newStudent.toJSON();
    
    res.status(201).json({
      success: true,
      data: studentResponse,
      message: 'Student created successfully'
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

// POST /api/students/login - Student login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await studentService.authenticateStudent(email, password);
    
    res.status(200).json({
      success: true,
      data: student,
      message: 'Student authenticated successfully'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// PATCH /api/students/:id - Update student (partial)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Prevent password updates through this route
    if (updateData.password) {
      return res.status(400).json({
        success: false,
        message: 'Use the password change endpoint to update passwords'
      });
    }
    
    const updatedStudent = await studentService.updateStudent(id, updateData);
    
    // Remove password from response
    const { password, ...studentResponse } = updatedStudent.toJSON();
    
    res.status(200).json({
      success: true,
      data: studentResponse,
      message: 'Student updated successfully'
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

// PATCH /api/students/:id/password - Change student password
router.patch('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    await studentService.changePassword(id, currentPassword, newPassword);
    
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

// DELETE /api/students/:id - Delete student
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await studentService.deleteStudent(id);
    
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

// PATCH /api/students/:id/deactivate - Soft delete student
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedStudent = await studentService.deactivateStudent(id);
    
    res.status(200).json({
      success: true,
      data: updatedStudent,
      message: 'Student deactivated successfully'
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
