import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import client from '../../../api/axios.client';
import { useAuthStore } from '../../../store/auth.store';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: async (profileData: {
      full_name?: string;
      avatar_url?: string;
      preferences?: Record<string, any>;
    }) => {
      const res = await client.patch('/auth/me', profileData);
      return res.data;
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Profile updated successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Failed to update profile. Please try again.';
      toast.error(errMsg);
    },
  });
}