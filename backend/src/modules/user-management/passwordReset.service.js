import bcrypt from "bcrypt";
import crypto from "crypto";
import { Op, fn, col, where as sqWhere } from "sequelize";
import { User, PasswordResetToken, Agency } from "../../models/index.js";
import { sendEmail } from "../../util/mailer.js";
import { otpTemplate } from "../../util/emailTemplates.js";

const OTP_TTL_MS = 10 * 60 * 1000;      // 10 minutes for OTP
const TOKEN_TTL_MS = 15 * 60 * 1000;    // 15 minutes for reset token
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;   // 60 seconds
const SALT_ROUNDS = 12;

/** Generate a 6-digit numeric OTP */
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Case-insensitive account lookup in both tables */
async function findAccountByEmail(rawEmail) {
  const email = (rawEmail ?? "").trim().toLowerCase();

  // users.email ILIKE email (implemented via lower(email) = email)
  const user = await User.findOne({
    where: sqWhere(fn("lower", col("email")), email),
  });
  if (user) return { type: "user", account: user };

  const agency = await Agency.findOne({
    where: sqWhere(fn("lower", col("email")), email),
  });
  if (agency) return { type: "agency", account: agency };

  return null;
}

/** add comments -->
 * Step 1: Request a reset code (OTP).
 * - If email not found, return { ok:false, notFound:true } so the route sends 400 and UI shows error.
 * - If found, create a token row and send OTP email.
 */
export async function requestReset(email) {
  const found = await findAccountByEmail(email);

  // IMPORTANT: if not found, signal back so UI doesn't advance
  if (!found) {
    return { ok: false, notFound: true, message: "No account found with that email." };
  }

  const accountId = found.account.id;
  const accountType = found.type;

  // Enforce resend cooldown by (userId, accountType)
  const latest = await PasswordResetToken.findOne({
    where: { userId: accountId, accountType },
    order: [["created_at", "DESC"]],
  });

  if (latest) {
    const createdAt = new Date(latest.get("created_at"));
    const delta = Date.now() - createdAt.getTime();
    if (delta < RESEND_COOLDOWN_MS) {
      const secs = Math.ceil((RESEND_COOLDOWN_MS - delta) / 1000);
      return { ok: false, message: `Please wait ${secs}s before requesting another code.` };
    }
  }

  // Generate and store OTP (hash)
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);

  await PasswordResetToken.create({
    userId: accountId,
    accountType,                        // critical for polymorphic support
    codeHash,                           // stores the OTP hash initially
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
    usedAt: null,
  });

  const displayName =
    (found.account.firstName || found.account.lastName)
      ? `${found.account.firstName ?? ""} ${found.account.lastName ?? ""}`.trim()
      : "there";

  const { subject, text, html } = otpTemplate({
    name: displayName,
    otp: code,
    ttlMinutes: Math.round(OTP_TTL_MS / 60000),
  });

  console.log(`📧 Preparing to send reset OTP to ${email}`);
  await sendEmail({ to: email, subject, text, html });
  console.log(`✅ Sent reset OTP to ${email}`);

  return { ok: true };
}

/**
 * Step 2: Verify the OTP.
 * - Checks latest valid token by (userId, accountType)
 * - On success, rotates to a one-time resetToken by overwriting codeHash with its hash
 * - Extends expiry to TOKEN_TTL_MS for the reset step
 */
export async function verifyCode(email, code) {
  const found = await findAccountByEmail(email);
  if (!found) return { ok: false, message: "Invalid or expired code." };

  const token = await PasswordResetToken.findOne({
    where: {
      userId: found.account.id,
      accountType: found.type,
      usedAt: { [Op.is]: null },
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["created_at", "DESC"]],
  });
  if (!token) return { ok: false, message: "Invalid or expired code." };
  if (token.attempts >= MAX_ATTEMPTS) return { ok: false, message: "Too many attempts." };

  const match = await bcrypt.compare(code, token.codeHash);
  if (!match) {
    await token.update({ attempts: token.attempts + 1 });
    return { ok: false, message: "Invalid or expired code." };
  }

  // Rotate to a client reset token (store its hash in the same column for simplicity)
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetHash = await bcrypt.hash(resetToken, SALT_ROUNDS);

  await token.update({
    codeHash: resetHash,                                  // reuse the same column
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),       // extend validity for the reset step
    attempts: 0,
  });

  return { ok: true, resetToken };
}

/**
 * Step 3: Complete the reset with the resetToken.
 * - Validates the provided resetToken against the stored hash in latest token
 * - Updates password on the right model based on accountType
 * - Marks token as used
 */
export async function resetPassword(email, resetToken, newPassword) {
  const found = await findAccountByEmail(email);
  if (!found) return { ok: false, message: "Invalid or expired token." };

  const token = await PasswordResetToken.findOne({
    where: {
      userId: found.account.id,
      accountType: found.type,
      usedAt: { [Op.is]: null },
      expiresAt: { [Op.gt]: new Date() },
    },
    order: [["created_at", "DESC"]],
  });
  if (!token) return { ok: false, message: "Invalid or expired token." };

  const valid = await bcrypt.compare(resetToken, token.codeHash);
  if (!valid) return { ok: false, message: "Invalid or expired token." };

  // Update password on the correct table (hooks should hash)
  await found.account.update({ password: newPassword });

  await token.update({ usedAt: new Date() });
  return { ok: true };
}
