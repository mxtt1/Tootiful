import bcrypt from "bcrypt";
import crypto from "crypto";
import { Op } from "sequelize";
import { User, PasswordResetToken } from "../../models/index.js";
import { sendEmail } from "../../util/mailer.js";
import { otpTemplate } from "../../util/emailTemplates.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const SALT_ROUNDS = 12;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function findUserByEmail(email) {
  const user = await User.findOne({ where: { email } });
  return user;
}

export async function requestReset(email) {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, notFound: true };

  const latest = await PasswordResetToken.findOne({
    where: { userId: user.id },
    order: [["created_at", "DESC"]], // snake_case column in DB
  });

  if (latest) {
    const createdAt = new Date(latest.get("created_at")); // read actual column
    const delta = Date.now() - createdAt.getTime();
    if (delta < RESEND_COOLDOWN_MS) {
      const secs = Math.ceil((RESEND_COOLDOWN_MS - delta) / 1000);
      return { ok: false, message: `Please wait ${secs}s before requesting another code.` };
    }
  }

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);

  await PasswordResetToken.create({
    userId: user.id,
    codeHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
    usedAt: null,
  });

  const displayName =
    (user.firstName || user.lastName
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : "there");

  const { subject, text, html } = otpTemplate({
    name: displayName,
    otp: code,
    ttlMinutes: Math.round(OTP_TTL_MS / 60000),
  });

  await sendEmail({ to: user.email, subject, text, html });
  return { ok: true };
}

export async function verifyCode(email, code) {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, message: "Invalid or expired code." };

  // Find latest valid, unused token
  const token = await PasswordResetToken.findOne({
    where: {
      userId: user.id,
      usedAt: { [Op.is]: null },
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["created_at", "DESC"]], // snake_case
  });
  if (!token) return { ok: false, message: "Invalid or expired code." };
  if (token.attempts >= MAX_ATTEMPTS) return { ok: false, message: "Too many attempts." };

  const match = await bcrypt.compare(code, token.codeHash);
  if (!match) {
    await token.update({ attempts: token.attempts + 1 });
    return { ok: false, message: "Invalid or expired code." };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetHash = await bcrypt.hash(resetToken, SALT_ROUNDS);

  await token.update({
    codeHash: resetHash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    attempts: 0,
  });

  return { ok: true, resetToken };
}

export async function resetPassword(email, resetToken, newPassword) {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, message: "Invalid or expired token." };

  const token = await PasswordResetToken.findOne({
    where: {
      userId: user.id,
      usedAt: { [Op.is]: null },
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["created_at", "DESC"]], // snake_case
  });
  if (!token) return { ok: false, message: "Invalid or expired token." };

  const valid = await bcrypt.compare(resetToken, token.codeHash);
  if (!valid) return { ok: false, message: "Invalid or expired token." };

 await user.update({ password: newPassword });

  await token.update({ usedAt: new Date() });
  return { ok: true };
}
