import express from "express";
import AuthService from "./auth.service.js";
import { asyncHandler } from "../../middleware/errorHandler.js";
import { authenticateToken } from "../../middleware/authenticateToken.js";
import {
  requestReset,
  verifyCode,
  resetPassword,
} from "./passwordReset.service.js";

// ⬇️ change this import
// import { createAndEmailVerificationLink, verifyEmailToken, resendVerification } from "./emailVerification.service.js";
import { verifyEmailToken, resendVerification } from "./emailVerification.service.js";

const router = express.Router();
const authService = new AuthService();

router.post("/login", asyncHandler(authService.handleLogin.bind(authService)));

// Add this new route
router.post(
  "/agency-login",
  asyncHandler(async (req, res) => {
    await authService.handleAgencyLogin(req, res);
  })
);

// Refresh access token endpoint (gets token from cookie)
router.post(
  "/refresh",
  asyncHandler(authService.handleRefreshToken.bind(authService))
);

// Logout endpoint (clears refresh token cookie)
router.post("/logout", asyncHandler(authService.handleLogout.bind(authService)));

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
    const email = String(req.body?.email || "").toLowerCase().trim();
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
    const email = String(req.body?.email || "").toLowerCase().trim();
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
    const email = String(req.body?.email || "").toLowerCase().trim();
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
    const email = String(req.body?.email || "").toLowerCase().trim();
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
    if (req.user.userType === "agency") {
      const agency = await authService.getAgencyById(req.user.userId);
      if (!agency) {
        return res.status(404).json({ message: "Agency not found" });
      }
      return res.json({
        user: {
          id: agency.id,
          email: agency.email,
          name: agency.name,
          phone: agency.phone,
          userType: "agency",
        },
      });
    } else {
      const user = await authService.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          agencyId: user.agencyId,
        },
      });
    }
  })
);

// Verify email link => opened from email
router.get(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const token = String(req.query?.token || "");
    const result = await verifyEmailToken(token);

    const WEB = process.env.WEB_BASE_URL || "http://localhost:5173";
    return res
      .status(result.ok ? 200 : 400)
      .send(renderVerifyHtml({ ok: result.ok, web: WEB }));
  })
);

/** making the html page nicer without making a new page */
function renderVerifyHtml({ ok, web }) {
    const title = ok ? "Email verified" : "Verification failed";
    const headline = ok ? "Email verified" : "Verification failed";
    const message = ok
      ? "Your account is now active. You can close this page and log in."
      : "This link is invalid or expired.";
    const primaryHref = ok ? `${web}/login?verified=1` : `${web}/verify-email-pending`;
    const primaryLabel = ok ? "Go to login" : "Resend link";
    const secondaryHref = `${web}/landing`;
    const autoRedirect = ok ? `setTimeout(()=>{location.href='${primaryHref}'}, 3500);` : "";

    return `<!doctype html>
  <html lang="en">
  <head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <style>
  :root{--indigo:#6366f1;--violet:#7c3aed;--pink:#ec4899;}
  *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:
  linear-gradient(135deg,rgba(99,102,241,.12),rgba(124,58,237,.12));}
  .page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px}
  .card{max-width:560px;width:100%;background:#ffffffee;border:1px solid rgba(0,0,0,.06);border-radius:18px;box-shadow:0 18px 40px rgba(0,0,0,.08);overflow:hidden}
  .bar{height:4px;background:linear-gradient(90deg,var(--indigo),#8b5cf6,var(--pink))}
  .inner{padding:28px}
  .iconWrap{display:grid;place-items:center;margin:8px 0 14px}
  .icon{height:72px;width:72px;border-radius:50%;display:grid;place-items:center;
  background:linear-gradient(135deg,var(--indigo),var(--pink));color:#fff;
  box-shadow:0 10px 24px rgba(99,102,241,.35)}
  .h1{margin:6px 0 8px;font-size:28px;line-height:1.2;font-weight:800;color:#111827}
  .p{margin:0;color:#4b5563}
  .actions{margin-top:20px;display:flex;gap:12px;flex-wrap:wrap}
  .btn{padding:10px 16px;border-radius:10px;border:0;cursor:pointer;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
  .btnPrimary{background:var(--indigo);color:#fff;box-shadow:0 8px 18px rgba(99,102,241,.35)}
  .btnPrimary:hover{filter:brightness(1.05)}
  .btnGhost{background:transparent;color:#374151}
  .btnGhost:hover{text-decoration:underline;color:#111827}
  .note{margin-top:12px;font-size:12px;color:#6b7280}
  </style>
  </head>
  <body>
  <main class="page">
    <div class="card">
      <div class="bar"></div>
      <div class="inner">
        <div class="iconWrap">
          <div class="icon" aria-hidden="true">
            ${
              ok
                ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>`
                : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>`
            }
          </div>
        </div>

        <h1 class="h1">${headline}</h1>
        <p class="p">${message}</p>

        <div class="actions">
          <a class="btn btnPrimary" href="${primaryHref}">
            ${primaryLabel}
          </a>
          <a class="btn btnGhost" href="${secondaryHref}">Back to home</a>
        </div>

        ${
          ok
            ? `<p class="note">Redirecting to login…</p>`
            : `<p class="note">If the link expired, request a new one from the app.</p>`
        }
      </div>
    </div>
  </main>
  <script>${autoRedirect}</script>
  </body>
  </html>`;
  }

// Resend verification -- change to public cause of signup verification –> accepts { email } in body
router.post(
  "/resend-verification",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email || "").toLowerCase().trim();
    // Always respond 200 to avoid email enumeration
    if (!email) {
      return res.json({
        success: true,
        message:
          "If the account exists and is unverified, we've sent a new link.",
      });
    }
    const out = await resendVerification(email);
    return res.json({
      success: true,
      message:
        "If the account exists and is unverified, we've sent a new link.",
      ...out,
    });
  })
);

export default router;
