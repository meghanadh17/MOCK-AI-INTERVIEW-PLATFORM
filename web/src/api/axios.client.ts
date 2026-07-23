import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { toast } from 'sonner';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 60000,
});

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const authState = useAuthStore.getState();
      if (authState.token) {
        authState.clearSession();
        toast.error('Your session has expired. Please log in again.');
      }
    }
    return Promise.reject(error);
  }
);

export default client;