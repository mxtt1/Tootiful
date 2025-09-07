const API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

// mobile/services/passwordResetService.js
async function request(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Something went wrong.");
  return data; // <-- we now use fields like throttled/retryInMs
}

export function requestPasswordReset(email) {
  return request("POST", "/api/auth/forgot-password", { email });
}

export function resendOtp(email) {
  return request("POST", "/api/auth/resend-otp", { email });
}

export async function verifyOtp(email, code) {
  const data = await request("POST", "/api/auth/verify-otp", { email, code });
  return data.resetToken;
}

export function resetPassword(email, resetToken, newPassword) {
  return request("POST", "/api/auth/reset-password", { email, resetToken, newPassword });
}
