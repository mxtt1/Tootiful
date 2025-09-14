import apiClient from '../apiClient';

const authService = {
  login: async (email, password) => apiClient.login(email, password),
  logout: async () => apiClient.logout(),
  refreshToken: async () => apiClient.refreshToken(),
  requestOtp: async (email) => apiClient.requestOtp(email),
  resendOtp: async (email) => apiClient.resendOtp(email),
  verifyOtp: async (email, code) => apiClient.verifyOtp(email, code),
  resetPassword: async (email, resetToken, newPassword) => apiClient.resetPassword(email, resetToken, newPassword),
};

export default authService;
