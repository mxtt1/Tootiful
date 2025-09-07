import express from 'express';
import AuthService from './auth.service.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateToken } from '../../middleware/authenticateToken.js';

const router = express.Router();
const authService = new AuthService();


// router.post('/register', asyncHandler(authService.handleRegister.bind(authService)));

router.post('/student/login', asyncHandler(authService.handleStudentLogin.bind(authService)));
router.post('/tutor/login', asyncHandler(authService.handleTutorLogin.bind(authService)));

// Refresh access token endpoint (gets token from cookie)
router.post('/refresh', asyncHandler(authService.handleRefreshToken.bind(authService)));

// Logout endpoint (clears refresh token cookie)
router.post('/logout', asyncHandler(authService.handleLogout.bind(authService)));

// Logout from all devices
router.post('/logout-all',
    authenticateToken,
    asyncHandler(authService.handleLogoutAll.bind(authService))
);

export default router;
