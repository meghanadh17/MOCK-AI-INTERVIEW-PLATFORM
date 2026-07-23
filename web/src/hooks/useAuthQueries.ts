import { useQuery } from '@tanstack/react-query';
import client from '../api/axios.client';

export function useUserProfileQuery() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await client.get('/auth/me');
      return res.data;
    },
  });
}
