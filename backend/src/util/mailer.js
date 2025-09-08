// backend/src/util/mailer.js
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import path from "path";

// Ensure we load the .env that sits in the backend/ folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

function bool(v, def=false) {
  if (v === undefined || v === null || v === "") return def;
  return String(v).toLowerCase() === "true";
}

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM_EMAIL,
  MAIL_FROM_NAME,
  NODE_ENV,
} = process.env;

// Fallbacks + logging
const EFFECTIVE_SMTP_HOST = SMTP_HOST || "smtp.gmail.com";
const EFFECTIVE_SMTP_PORT = Number(SMTP_PORT || 465);
const EFFECTIVE_SMTP_SECURE = bool(SMTP_SECURE, true);

if (!SMTP_USER || !SMTP_PASS) {
  console.warn("⚠️ SMTP_USER/SMTP_PASS missing. Check your backend/.env (Gmail App Password).");
}
if (!MAIL_FROM_EMAIL) {
  console.warn("⚠️ MAIL_FROM_EMAIL missing. Check backend/.env");
}

console.log(
  `📫 Mailer config → host=${EFFECTIVE_SMTP_HOST}, port=${EFFECTIVE_SMTP_PORT}, secure=${EFFECTIVE_SMTP_SECURE}`
);

const transporter = nodemailer.createTransport({
  host: EFFECTIVE_SMTP_HOST,
  port: EFFECTIVE_SMTP_PORT,
  secure: EFFECTIVE_SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  logger: true,
  debug: true,
});

export async function verifyTransport() {
  try {
    await transporter.verify();
    if (NODE_ENV !== "test") console.log("📮 SMTP ready to send mail");
  } catch (err) {
    console.error("❌ SMTP verify failed:", err?.message || err);
  }
}

export async function sendEmail({ to, subject, html, text }) {
  if (!MAIL_FROM_EMAIL) throw new Error("MAIL_FROM_EMAIL missing in env.");
  const from = MAIL_FROM_NAME
    ? `"${MAIL_FROM_NAME}" <${MAIL_FROM_EMAIL}>`
    : MAIL_FROM_EMAIL;

  console.log(`📧 Sending email → to=${to}, subject="${subject}"`);
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text: text || html?.replace(/<[^>]+>/g, "") || "",
    html,
  });
  console.log("✅ Email accepted by SMTP:", info.messageId);
  return info;
}
