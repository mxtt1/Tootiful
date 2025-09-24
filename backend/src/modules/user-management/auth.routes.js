import express from "express";
import AuthService from "./auth.service.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";
import {
  requestReset,
  verifyCode,
  resetPassword,
} from "./passwordReset.service.js";

const router = express.Router();
const authService = new AuthService();

router.post("/login", asyncHandler(authService.handleLogin.bind(authService)));
// Add this new route
router.post('/agency-login', asyncHandler(async (req, res) => {
  await authService.handleAgencyLogin(req, res);
}));

// Refresh access token endpoint (gets token from cookie)
router.post(
  "/refresh",
  asyncHandler(authService.handleRefreshToken.bind(authService))
);

// Logout endpoint (clears refresh token cookie)
router.post(
  "/logout",
  asyncHandler(authService.handleLogout.bind(authService))
);

// Logout from all devices
router.post(
  "/logout-all",
  authenticateToken,
  asyncHandler(authService.handleLogoutAll.bind(authService))
);

// Forgot password — request OTP
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "")
      .toLowerCase()
      .trim();
    const out = await requestReset(email);
    if (!out.ok && out.notFound) {
      return res
        .status(400)
        .json({ message: out.message || "No account found with that email." });
    }
    return res.json({ message: "OTP sent to your email." });
  })
);

// Resend OTP (same handler; service throttles)
router.post(
  "/resend-otp",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "")
      .toLowerCase()
      .trim();
    const out = await requestReset(email);
    return res.json({
      message: "If the account exists, we've sent a code.",
      throttled: !!out?.throttled,
      retryInMs: out?.retryInMs ?? 0,
    });
  })
);

// Verify OTP → return resetToken
router.post(
  "/verify-otp",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "")
      .toLowerCase()
      .trim();
    const code = String(req.body?.code || "").trim();
    const out = await verifyCode(email, code);
    if (!out.ok)
      return res
        .status(400)
        .json({ message: out.message || "Invalid or expired code." });
    return res.json({ resetToken: out.resetToken });
  })
);

// Reset password using resetToken
router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "")
      .toLowerCase()
      .trim();
    const resetToken = String(req.body?.resetToken || "");
    const newPassword = String(req.body?.newPassword || "");
    const out = await resetPassword(email, resetToken, newPassword);
    if (!out.ok)
      return res
        .status(400)
        .json({ message: out.message || "Invalid or expired reset token." });
    return res.json({ message: "Password updated." });
  })
);

// Get current user info
router.get(
  "/me",
  authenticateToken,
  asyncHandler(async (req, res) => {
    // req.user is set by authenticateToken middleware
    // Fetch user from DB to get latest info
    const user = await authService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Return user info (omit sensitive fields)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  })
);

export default router;
