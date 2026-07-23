import { useQuery } from '@tanstack/react-query';
import { videoApi } from '@/api/video.api';

export function useVideoSessionsQuery(params?: { skip?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['video', 'sessions', params],
    queryFn: async () => {
      const res = await videoApi.listSessions(params);
      return res.data;
    }
  });
}