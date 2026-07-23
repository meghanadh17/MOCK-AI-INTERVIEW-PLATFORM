import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { authApi } from '../api/auth.api';
import client from '../api/axios.client';
import { useAuthStore } from '../store/auth.store';

/**
 * Mutation hook for logging in.
 * Sets the authentication session, fetches the full user profile,
 * greets the user, and navigates to the dashboard.
 * If the user is unverified, redirects them automatically to the OTP verification screen.
 */
export function useLogin() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (credentials: any) => {
      const response = await authApi.login(credentials);
      const { access_token, user_id } = response.data;

      // Set temporary session to authorize the profile fetch interceptor
      setSession(access_token, { id: user_id, email: credentials.email });

      // Fetch the full profile details
      const userProfileRes = await client.get('/auth/me');
      const userProfile = userProfileRes.data;

      // Save complete session
      setSession(access_token, userProfile);
      return userProfile;
    },
    onSuccess: (userProfile) => {
      toast.success(`Welcome, ${userProfile.full_name || 'User'}!`);
      navigate('/app/dashboard');
    },
    onError: (err: any, variables: any) => {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Invalid email or password.';
      toast.error(errMsg);

      // Redirect if account is unverified
      if (err.response?.status === 403 || errMsg.toLowerCase().includes('verify')) {
        const email = variables?.email;
        if (email) {
          setTimeout(() => {
            navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
          }, 1500);
        }
      }
    },
  });
}

/**
 * Mutation hook for user registration.
 * Saves selected metadata (role preference) and navigates to the verification screen.
 */
export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await authApi.register({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      });
      
      // Store preferred signup role temporarily for preference synchronization
      if (data.role) {
        sessionStorage.setItem('mocrai_signup_role', data.role);
      }
      return { response, email: data.email };
    },
    onSuccess: (data) => {
      toast.success('Registration successful. Verification code sent to email.');
      navigate(`/verify-otp?email=${encodeURIComponent(data.email)}`);
    },
    onError: (err: any) => {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Registration failed. Try again.';
      toast.error(errMsg);
    },
  });
}

/**
 * Mutation hook for email OTP verification.
 * Verifies code, clears states, and navigates to the login screen.
 */
export function useVerifyOtp() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: any) => {
      return await authApi.verifyEmail(data);
    },
    onSuccess: () => {
      toast.success('Verification successful! Redirecting to login page...');
      navigate('/login');
    },
    onError: (err: any) => {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Verification failed. Please check the code.';
      toast.error(errMsg);
    },
  });
}

/**
 * Mutation hook for triggering forgot password requests.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (data: any) => {
      return await authApi.forgotPassword(data);
    },
    onSuccess: () => {
      toast.success('If the account exists, a password reset code has been sent.');
    },
    onError: (err: any) => {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'An error occurred. Please try again.';
      toast.error(errMsg);
    },
  });
}

/**
 * Mutation hook for resetting password using an OTP verification code.
 */
export function useResetPassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: any) => {
      return await authApi.resetPassword(data);
    },
    onSuccess: () => {
      toast.success('Password reset successfully. You can now sign in.');
      navigate('/login');
    },
    onError: (err: any) => {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Password reset failed. Check your code.';
      toast.error(errMsg);
    },
  });
}

/**
 * Mutation hook for user logout.
 * Destroys backend refresh tokens and clears local session state.
 */
export function useLogout() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: async () => {
      return await authApi.logout();
    },
    onSuccess: () => {
      clearSession();
      toast.success('Logged out successfully.');
      navigate('/login');
    },
    onError: (err: any) => {
      console.error('Logout request failed:', err);
      // Clean up session locally regardless of server sync status for safety
      clearSession();
      toast.success('Logged out successfully.');
      navigate('/login');
    },
  });
}
