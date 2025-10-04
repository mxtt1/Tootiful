import crypto from "crypto";
import { Op } from "sequelize";
import { User, EmailVerificationToken } from "../../models/index.js";
import { sendEmail } from "../../util/mailer.js";
import { verifyEmailTemplate } from "../../util/emailTemplates.js";

const TOKEN_TTL_MINUTES = 60;

function hashToken(t) {
  return crypto.createHash("sha256").update(String(t)).digest("hex");
}
function makeRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createAndEmailVerificationLink({ user, email, generatedPassword}) {
  // Invalidate existing unused tokens for this user + target email
  await EmailVerificationToken.update(
    { usedAt: new Date() },
    { where: { userId: user.id, emailForVerification: email, usedAt: null } }
  );

  const token = makeRandomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await EmailVerificationToken.create({
    userId: user.id,
    tokenHash,
    emailForVerification: email,
    expiresAt,
  });

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const verifyLink = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  const { subject, text, html } = verifyEmailTemplate({
    name: user.firstName || "there",
    verifyLink,
    ttlMinutes: TOKEN_TTL_MINUTES,
    generatedPassword: generatedPassword || null,
  });

  await sendEmail({ to: email, subject, text, html });
}

export async function verifyEmailToken(rawToken) {
  const tokenHash = hashToken(rawToken);

  const record = await EmailVerificationToken.findOne({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
  });

  if (!record) return { ok: false, reason: "invalid_or_expired" };

  const user = await User.findByPk(record.userId);
  if (!user) return { ok: false, reason: "user_not_found" };

  // If this token is for a pending new email, swap it in
  if (user.email !== record.emailForVerification) {
    user.email = record.emailForVerification;
  }

  user.isActive = true;
  await user.save();

  record.usedAt = new Date();
  await record.save();

  return { ok: true, userId: user.id, email: user.email };
}

/**
 * Return the latest pending (unexpired, unused) email_for_verification for a user, if any.
 */
export async function getPendingEmailForUser(userId) {
  const latest = await EmailVerificationToken.findOne({
    where: {
      userId,
      usedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["createdAt", "DESC"]],
  });
  return latest?.emailForVerification || null;
}

/**
 * Resend verification to the authenticated user's pending email if exists,
 * otherwise fall back to their current email.
 */
export async function resendVerificationForUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) return { ok: true };          // don't leak existence
  if (user.isActive) return { ok: true };  // already verified

  const target = (await getPendingEmailForUser(user.id)) || user.email;
  await createAndEmailVerificationLink({ user, email: target });
  return { ok: true };
}

/**
 * Backward-compat wrapper for any existing callers that pass an email.
 * Prefer calling resendVerificationForUser(userId).
 */
export async function resendVerification(email) {
  const user = await User.findOne({ where: { email } });
  if (!user) return { ok: true };
  return resendVerificationForUser(user.id);
}
