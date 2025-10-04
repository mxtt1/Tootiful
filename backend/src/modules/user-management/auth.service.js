import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { Op } from "sequelize";
import { User, RefreshToken, Agency } from "../../models/index.js";

export default class AuthService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || "access-secret";
  }

  // Get user by ID (for /auth/me)
  async getUserById(userId) {
    return await User.findByPk(userId);
  }

  async getAgencyById(agencyId) {
    return await Agency.findByPk(agencyId);
  }


  // Separate login handlers with HTTP cookies
  async handleLogin(req, res) {
    const { admin } = req.query;
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Email not found
      throw new Error("Invalid email");
    }

    if (admin && !(user.role === 'admin' || user.role === 'agencyAdmin')) {
      throw new Error("Admin access only");
    }

    // Prevent admin and agencyAdmin from logging in here
    if (!admin && (user.role === 'admin' || user.role === 'agencyAdmin')) {
      throw new Error("Admin accounts cannot log in here");
    }

    if (user.isSuspended) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "Please verify your email to continue.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      // Password incorrect
      throw new Error("Invalid password");
    }

    const tokens = await this.generateTokens(user);

    // Set refresh token as HTTP-only cookie
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    res.status(200).json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        agencyId: user.agencyId
      },
    });
  }

  // NEW: Agency login method
  async handleAgencyLogin(req, res) {
    const { email, password } = req.body;

    const agency = await Agency.findOne({ where: { email } });

    if (!agency) {
      throw new Error("Invalid email");
    }

    if (!agency.isActive) {
      throw new Error("Account is deactivated. Please contact support.");
    }

    const passwordMatch = await bcrypt.compare(password, agency.password);
    if (!passwordMatch) {
      throw new Error("Invalid password");
    }

    // Generate only access token for agencies (no refresh token)
    const accessToken = jwt.sign(
      {
        userId: agency.id,
        userType: 'agency',
        type: "access",
        name: agency.name
      },
      this.accessTokenSecret,
      { expiresIn: "7d" } // 7 days since no refresh mechanism
    );

    res.status(200).json({
      accessToken,
      user: {
        id: agency.id,
        email: agency.email,
        name: agency.name,
        phone: agency.phone,
        userType: 'agency'
      },
    });
  }

  async handleRefreshToken(req, res) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const token = await this.refreshAccessToken(refreshToken);

    res.status(200).json({
      accessToken: token,
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
      message: "Logged out successfully",
    });
  }

  async handleLogoutAll(req, res) {
    const { userId } = req.user; // From JWT middleware

    await this.revokeAllUserTokens(userId);

    // Clear refresh token cookie
    this.clearRefreshTokenCookie(res);

    res.status(200).json({
      success: true,
      message: "Logged out from all devices",
    });
  }

  // Business logic methods
  async generateTokens(user) {
    // Generate access token (still JWT)
    const accessToken = jwt.sign(
      {
        userId: user.id,
        userType: user.role,
        type: "access",
      },
      this.accessTokenSecret,
      { expiresIn: "15m" }
    );

    // Generate opaque refresh token
    const refreshToken = crypto.randomBytes(32).toString("hex");

    // Store refresh token in database
    await this.storeRefreshToken(refreshToken, user.id);

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken) {
    // Find and validate refresh token in database
    const tokenRecord = await this.validateRefreshToken(refreshToken);

    if (!tokenRecord) {
      throw new Error("Invalid or expired refresh token");
    }

    const user = await tokenRecord.getUser();
    // Generate new access token only (no new refresh token)
    const accessToken = jwt.sign(
      {
        userId: tokenRecord.userId,
        userType: user.role,
        type: "access",
      },
      this.accessTokenSecret,
      { expiresIn: "15m" }
    );

    // Update last used timestamp but keep same refresh token
    await tokenRecord.update({ lastUsedAt: new Date() });

    return accessToken; // Only return new access token
  }

  async revokeRefreshToken(refreshToken) {
    try {
      const hashedToken = this.hashToken(refreshToken);
      await RefreshToken.update(
        { isRevoked: true },
        {
          where: {
            token: hashedToken,
            isRevoked: false,
          },
        }
      );
    } catch (error) {
      // Token might be invalid, but that's okay for logout
      console.log("Error revoking token:", error.message);
    }
  }

  async revokeAllUserTokens(userId) {
    await RefreshToken.update(
      { isRevoked: true },
      {
        where: {
          userId,
          isRevoked: false,
        },
      }
    );
    console.log(`Revoked all tokens for user ${userId}`);
  }

  // Database operations for refresh tokens
  async storeRefreshToken(token, userId) {
    const hashedToken = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await RefreshToken.create({
      token: hashedToken,
      userId,
      expiresAt,
      isRevoked: false,
    });
  }

  async validateRefreshToken(token) {
    const hashedToken = this.hashToken(token);

    const tokenRecord = await RefreshToken.findOne({
      where: {
        token: hashedToken,
        isRevoked: false,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    return tokenRecord;
  }

  // Cleanup expired tokens (utility method) not called yet
  async cleanupExpiredTokens() {
    await RefreshToken.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  }

  // Hash token for secure storage
  hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  // Cookie management methods
  setRefreshTokenCookie(res, refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // Can't access via JavaScript
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: "/api/auth", // Only send to auth endpoints
    });
  }

  clearRefreshTokenCookie(res) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });
  }
}
