// backend/src/modules/user-management/passwordReset.service.js
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Op } from "sequelize";
import { Student, Tutor, PasswordResetToken } from "./user.model.js";
import { sendEmail } from "../../util/mailer.js";
import { otpTemplate /*, passwordResetTemplate */ } from "../../util/emailTemplates.js";

const OTP_TTL_MS = 10 * 60 * 1000;     // 10 minutes
const TOKEN_TTL_MS = 15 * 60 * 1000;   // 15 minutes after verify
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;  // 60s throttle
const SALT_ROUNDS = 12;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

async function findUserByEmail(email) {
  const student = await Student.findOne({ where: { email } });
  if (student) return { user: student, userType: "student" };
  const tutor = await Tutor.findOne({ where: { email } });
  if (tutor) return { user: tutor, userType: "tutor" };
  return { user: null, userType: null };
}

/**
 * Step 1: Request reset — generates OTP, stores hash, emails the code.
 * Return shape used by routes:
 *   - { ok: true } on success
 *   - { ok: false, notFound: true } if no user
 *   - { ok: false, message: "cooldown..." } if throttled
 */
export async function requestReset(email) {
  const { user, userType } = await findUserByEmail(email);
  if (!user) return { ok: false, notFound: true };

  // Throttle: prevent spamming within RESEND_COOLDOWN_MS
  const latest = await PasswordResetToken.findOne({
    where: { userId: user.id, userType },
    order: [["createdAt", "DESC"]],
  });
  if (latest && Date.now() - new Date(latest.createdAt).getTime() < RESEND_COOLDOWN_MS) {
    const waitMs = RESEND_COOLDOWN_MS - (Date.now() - new Date(latest.createdAt).getTime());
    const secs = Math.ceil(waitMs / 1000);
    return { ok: false, message: `Please wait ${secs}s before requesting another code.` };
  }

  // Create OTP + hash
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);

  await PasswordResetToken.create({
    userId: user.id,
    userType,
    codeHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
    usedAt: null,
  });

  // Send email with OTP
  const displayName = user.firstName || user.lastName
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
    : "there";
  const { subject, text, html } = otpTemplate({
    name: displayName,
    otp: code,
    ttlMinutes: Math.round(OTP_TTL_MS / 60000),
  });

  await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });

  return { ok: true };
}

/**
 * Step 2: Verify OTP — if valid, mint a short-lived resetToken.
 * Returns:
 *   - { ok: true, resetToken }
 *   - { ok: false, message: "..." }
 */
export async function verifyCode(email, code) {
  const { user, userType } = await findUserByEmail(email);
  if (!user) return { ok: false, message: "Invalid or expired code." };

  const token = await PasswordResetToken.findOne({
    where: {
      userId: user.id,
      userType,
      usedAt: { [Op.is]: null },
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["createdAt", "DESC"]],
  });
  if (!token) return { ok: false, message: "Invalid or expired code." };
  if (token.attempts >= MAX_ATTEMPTS) return { ok: false, message: "Too many attempts." };

  const match = await bcrypt.compare(code, token.codeHash);
  if (!match) {
    await token.update({ attempts: token.attempts + 1 });
    return { ok: false, message: "Invalid or expired code." };
  }

  // OTP ok → issue resetToken and rotate the hash to the resetToken
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetHash = await bcrypt.hash(resetToken, SALT_ROUNDS);

  await token.update({
    codeHash: resetHash,                       // now holds resetToken's hash
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    attempts: 0,                               // reset attempts
  });

  return { ok: true, resetToken };
}

/**
 * Step 3: Reset password using the resetToken.
 * Returns:
 *   - { ok: true } on success
 *   - { ok: false, message: "..." } on failure
 */
export async function resetPassword(email, resetToken, newPassword) {
  const { user, userType } = await findUserByEmail(email);
  if (!user) return { ok: false, message: "Invalid or expired token." };

  const token = await PasswordResetToken.findOne({
    where: {
      userId: user.id,
      userType,
      usedAt: { [Op.is]: null },
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["createdAt", "DESC"]],
  });
  if (!token) return { ok: false, message: "Invalid or expired token." };

  const valid = await bcrypt.compare(resetToken, token.codeHash);
  if (!valid) return { ok: false, message: "Invalid or expired token." };

  // Update password; (your model hook should hash password before save)
  user.password = newPassword;
  await user.save();

  await token.update({ usedAt: new Date() });
  return { ok: true };
}
