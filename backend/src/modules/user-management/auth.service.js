import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import StudentService from './student.service.js';
import TutorService from './tutor.service.js';
import RefreshToken from './refreshToken.model.js';

export default class AuthService {
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access-secret';

        // Initialize services
        this.studentService = new StudentService();
        this.tutorService = new TutorService();
    }

    // Separate login handlers with HTTP cookies
    async handleStudentLogin(req, res) {
        const { email, password } = req.body;

        const student = await this.studentService.authenticateStudent(email, password);
        const tokens = await this.generateTokens(student.id, 'student');

        // Set refresh token as HTTP-only cookie
        this.setRefreshTokenCookie(res, tokens.refreshToken);

        res.status(200).json({
            accessToken: tokens.accessToken
        });
    }

    async handleTutorLogin(req, res) {
        const { email, password } = req.body;

        const tutor = await this.tutorService.authenticateTutor(email, password);
        const tokens = await this.generateTokens(tutor.id, 'tutor');

        // Set refresh token as HTTP-only cookie
        this.setRefreshTokenCookie(res, tokens.refreshToken);

        res.status(200).json({
            accessToken: tokens.accessToken
        });
    }

    async handleRefreshToken(req, res) {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        const tokens = await this.refreshAccessToken(refreshToken);

        res.status(200).json({
            accessToken: tokens.accessToken
        });
    }

    async handleLogout(req, res) {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            await this.revokeRefreshToken(refreshToken);
        }

        // Clear refresh token cookie
        this.clearRefreshTokenCookie(res);

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    }

    async handleLogoutAll(req, res) {
        const { userId, userType } = req.user; // From JWT middleware

        await this.revokeAllUserTokens(userId, userType);

        // Clear refresh token cookie
        this.clearRefreshTokenCookie(res);

        res.status(200).json({
            success: true,
            message: 'Logged out from all devices'
        });
    }

    // Business logic methods
    async generateTokens(userId, userType) {
        // Generate access token (still JWT)
        const accessToken = jwt.sign(
            {
                userId,
                userType,
                type: 'access'
            },
            this.accessTokenSecret,
            { expiresIn: '15m' }
        );

        // Generate opaque refresh token
        const refreshToken = crypto.randomBytes(32).toString('hex');

        // Store refresh token in database
        await this.storeRefreshToken(refreshToken, userId, userType);

        return { accessToken, refreshToken };
    }

    async refreshAccessToken(refreshToken) {
        // Find and validate refresh token in database
        const tokenRecord = await this.validateRefreshToken(refreshToken);

        if (!tokenRecord) {
            throw new Error('Invalid or expired refresh token');
        }

        // Generate new access token only (no new refresh token)
        const accessToken = jwt.sign(
            {
                userId: tokenRecord.userId,
                userType: tokenRecord.userType,
                type: 'access'
            },
            this.accessTokenSecret,
            { expiresIn: '15m' }
        );

        // Update last used timestamp but keep same refresh token
        await tokenRecord.update({ lastUsedAt: new Date() });

        return { accessToken }; // Only return new access token
    }

    async revokeRefreshToken(refreshToken) {
        try {
            const hashedToken = this.hashToken(refreshToken);
            await RefreshToken.update(
                { isRevoked: true },
                {
                    where: {
                        token: hashedToken,
                        isRevoked: false
                    }
                }
            );
        } catch (error) {
            // Token might be invalid, but that's okay for logout
            console.log('Error revoking token:', error.message);
        }
    }

    async revokeAllUserTokens(userId, userType) {
        await RefreshToken.update(
            { isRevoked: true },
            {
                where: {
                    userId,
                    userType,
                    isRevoked: false
                }
            }
        );
        console.log(`Revoked all tokens for user ${userId} of type ${userType}`);
    }

    // Database operations for refresh tokens
    async storeRefreshToken(token, userId, userType) {
        const hashedToken = this.hashToken(token);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        await RefreshToken.create({
            token: hashedToken,
            userId,
            userType,
            expiresAt,
            isRevoked: false
        });
    }

    async validateRefreshToken(token) {
        const hashedToken = this.hashToken(token);

        const tokenRecord = await RefreshToken.findOne({
            where: {
                token: hashedToken,
                isRevoked: false,
                expiresAt: {
                    [Op.gt]: new Date()
                }
            }
        });

        return tokenRecord;
    }

    // Cleanup expired tokens (utility method) not called yet
    async cleanupExpiredTokens() {
        await RefreshToken.destroy({
            where: {
                expiresAt: {
                    [Op.lt]: new Date()
                }
            }
        });
    }

    // Hash token for secure storage
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    // Cookie management methods
    setRefreshTokenCookie(res, refreshToken) {
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,           // Can't access via JavaScript
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict',       // CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            path: '/api/auth'         // Only send to auth endpoints
        });
    }

    clearRefreshTokenCookie(res) {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/auth'
        });
    }
}


