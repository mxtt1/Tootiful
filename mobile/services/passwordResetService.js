const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:3000/api";
const API = API_BASE_URL.replace("/api", ""); // Remove /api suffix for this service

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
  return request("POST", "/api/auth/reset-password", {
    email,
    resetToken,
    newPassword,
  });
}
