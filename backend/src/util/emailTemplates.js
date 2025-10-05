export function otpTemplate({ name = "there", otp, ttlMinutes = 10 }) {
  const subject = "Your Tutiful verification code";
  const text =
`Hi ${name},

Your verification code is: ${otp}

This code expires in ${ttlMinutes} minutes.
If you didn’t request this, you can ignore this email.

— Tutiful`;
  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6">
    <p>Hi ${name},</p>
    <p>Your verification code is:</p>
    <p style="font-size:22px;font-weight:700;letter-spacing:2px">${otp}</p>
    <p>This code expires in <b>${ttlMinutes} minutes</b>.</p>
    <p>If you didn’t request this, you can ignore this email.</p>
    <p>— Tutiful</p>
  </div>`;
  return { subject, text, html };
}

export function passwordResetTemplate({ name = "there", resetLink, ttlMinutes = 15 }) {
  const subject = "Reset your Tutiful password";
  const text =
`Hi ${name},

We received a request to reset your password.
Reset link (expires in ${ttlMinutes} minutes):
${resetLink}

If you didn’t request this, you can ignore this email.

— Tutiful`;
  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6">
    <p>Hi ${name},</p>
    <p>We received a request to reset your password.</p>
    <p>
      <a href="${resetLink}" style="display:inline-block;padding:10px 16px;
         background:#111;color:#fff;text-decoration:none;border-radius:6px">
        Reset Password
      </a>
    </p>
    <p>This link expires in <b>${ttlMinutes} minutes</b>.</p>
    <p>If you didn’t request this, you can ignore this email.</p>
    <p>— Tutiful</p>
  </div>`;
  return { subject, text, html };
}

export function verifyEmailTemplate({
  name = "there",
  verifyLink,
  ttlMinutes = 60,
  generatedPassword = null, // <-- optional
}) {
  const subject = generatedPassword
    ? "Your Tutiful account — verify & temporary password"
    : "Verify your email";

  const text = generatedPassword
    ? [
        `Hi ${name},`,
        ``,
        `Please verify your account: ${verifyLink}`,
        ``,
        `Your temporary password: ${generatedPassword}`,
        ``,
        `This link expires in ${ttlMinutes} minutes.`,
        `— Tutiful`,
      ].join("\n")
    : [
        `Hi ${name},`,
        ``,
        `Open this link to verify your email: ${verifyLink}`,
        ``,
        `This link expires in ${ttlMinutes} minutes.`,
        `— Tutiful`,
      ].join("\n");

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6">
    <p>Hi ${escapeHtml(name)},</p>
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="${verifyLink}" target="_blank" rel="noreferrer">Verify my email</a></p>
    ${
      generatedPassword
        ? `<p>Your temporary password: <b>${escapeHtml(generatedPassword)}</b></p>`
        : ``
    }
    <p>This link expires in <b>${ttlMinutes} minutes</b>.</p>
    <p>— Tutiful</p>
  </div>`;

  return { subject, text, html };
}

// simple small helper
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

