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
