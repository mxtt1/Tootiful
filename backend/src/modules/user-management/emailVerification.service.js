import crypto from "crypto";
import bcrypt from "bcrypt";
import { Op, fn, col, where as sqWhere } from "sequelize";
import { User, Agency, EmailVerificationToken } from "../../models/index.js";
import { sendEmail } from "../../util/mailer.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h link
const RESEND_COOLDOWN_MS = 60 * 1000;     // 60s cooldown
const SALT_ROUNDS = 12;

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const WEB_BASE_URL = process.env.WEB_BASE_URL || "http://localhost:5173";

/* ------------------------- helpers ------------------------- */

function makeRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function buildVerifyLink(token) {
  return `${API_BASE_URL}/api/auth/verify-email?token=${token}`;
}

async function findAccountByEmail(rawEmail) {
  const email = (rawEmail ?? "").trim().toLowerCase();
  const user = await User.findOne({ where: sqWhere(fn("lower", col("email")), email) });
  if (user) return { type: "user", account: user };
  const agency = await Agency.findOne({ where: sqWhere(fn("lower", col("email")), email) });
  if (agency) return { type: "agency", account: agency };
  return null;
}

/* --------------- create + email verification link --------------- */

async function sendVerificationEmailForAccount(type, account, targetEmail, generatedPassword) {
  const accountId = account.id;
  const accountType = type; // 'user' | 'agency'

  // Invalidate previous pending tokens for the *same* target email
  await EmailVerificationToken.update(
    { usedAt: new Date() },
    {
      where: {
        userId: accountId,
        accountType,
        emailForVerification: targetEmail,
        usedAt: null,
      },
    }
  );

  // Cooldown by (user_id, account_type)
  const latest = await EmailVerificationToken.findOne({
    where: { userId: accountId, accountType },
    order: [["created_at", "DESC"]],
  });
  if (latest) {
    const delta = Date.now() - new Date(latest.get("created_at")).getTime();
    if (delta < RESEND_COOLDOWN_MS) {
      const secs = Math.ceil((RESEND_COOLDOWN_MS - delta) / 1000);
      return { ok: false, message: `Please wait ${secs}s before resending.` };
    }
  }

  const token = makeRandomToken();
  const tokenHash = await bcrypt.hash(token, SALT_ROUNDS);

  await EmailVerificationToken.create({
    userId: accountId,
    accountType,
    tokenHash,
    emailForVerification: targetEmail,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    resentCount: (latest?.resentCount ?? 0) + 1,
  });

  const link = buildVerifyLink(token);
  const displayName =
    (account.firstName || account.lastName || account.name)
      ? `${account.firstName ?? ""} ${account.lastName ?? account.name ?? ""}`.trim()
      : "there";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <p>Hi ${displayName},</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${link}" target="_blank" rel="noreferrer">Verify my email</a></p>
      ${generatedPassword ? `<p>Your temporary password: <b>${generatedPassword}</b></p>` : ""}
      <p>This link expires in 24 hours.</p>
      <p>— Tutiful</p>
    </div>
  `;

  await sendEmail({
    to: targetEmail,
    subject: "Verify your email",
    text: `Open this link to verify your email: ${link}`,
    html,
  });

  return { ok: true };
}

/* ------------------------------ exports ------------------------------ */

/** Call this right after successful *user* registration (if you use it). */
export async function createAndEmailVerificationLink({ user, email, generatedPassword }) {
  return sendVerificationEmailForAccount("user", user, email, generatedPassword);
}

/** Call this right after successful *agency* registration. */
export async function createAndEmailVerificationLinkForAgency(agency) {
  return sendVerificationEmailForAccount("agency", agency, agency.email);
}

/** Public endpoint: resend by email (works for users and agencies). */
export async function resendVerification(email) {
  const found = await findAccountByEmail(email);
  // always respond 200 to avoid email enumeration, but still throttle if we can
  if (!found) return { ok: true };

  // if already verified, just succeed
  if (found.type === "user" && found.account.isActive) return { ok: true };
  if (found.type === "agency" && found.account.isActive) return { ok: true };

  return sendVerificationEmailForAccount(found.type, found.account, found.account.email);
}

/** Verify link handler (token-only is fine, we read type from the DB row). */
export async function verifyEmailToken(rawToken) {
  // Find latest unused, unexpired row by tokenHash
  // (bcrypt compare requires scanning; to avoid that, we stored the bcrypt hash
  // and must try rows ordered by created_at DESC, but we expect only ~1 live row.)
  const latest = await EmailVerificationToken.findOne({
    where: {
      usedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["created_at", "DESC"]],
  });
  if (!latest) return { ok: false, reason: "invalid_or_expired" };

  // Validate against the most recent first; if mismatched, you could broaden the search.
  const ok = await bcrypt.compare(rawToken, latest.tokenHash);
  if (!ok) return { ok: false, reason: "invalid_or_expired" };

  // Activate the right account type
  if (latest.accountType === "agency") {
    const agency = await Agency.findByPk(latest.userId);
    if (!agency) return { ok: false, reason: "not_found" };
    if (agency.email !== latest.emailForVerification) {
      agency.email = latest.emailForVerification;
    }
    agency.isActive = true;
    await agency.save();
  } else {
    const user = await User.findByPk(latest.userId);
    if (!user) return { ok: false, reason: "not_found" };
    if (user.email !== latest.emailForVerification) {
      user.email = latest.emailForVerification;
    }
    user.isActive = true;
    await user.save();
  }

  latest.usedAt = new Date();
  await latest.save();

  return { ok: true };
}

// Return the latest pending (un-used, un-expired) verification target email for a USER,
// falling back to the user's current email if no pending token exists.
export async function getPendingEmailForUser(userId) {
  const row = await EmailVerificationToken.findOne({
    where: {
      userId,
      accountType: "user",
      usedAt: { [Op.is]: null },
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["created_at", "DESC"]],
  });

  if (row?.emailForVerification) return row.emailForVerification;

  const user = await User.findByPk(userId);
  return user?.email ?? null;
}
