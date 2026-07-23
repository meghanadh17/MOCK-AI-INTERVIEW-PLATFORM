import client from './axios.client';

export const authApi = {
  login: (data: any) => client.post('/auth/login', data),
  register: (data: any) => client.post('/auth/register', data),
  verifyEmail: (data: any) => client.post('/auth/verify-email', data),
  resendVerification: (data: any) => client.post('/auth/resend-verification', data),
  forgotPassword: (data: any) => client.post('/auth/forgot-password', data),
  resetPassword: (data: any) => client.post('/auth/reset-password', data),
  logout: () => client.post('/auth/logout'),
};