import { useQuery } from '@tanstack/react-query';
import { resumeApi } from '@/api/resume.api';

export function useParseStatusPolling(id: string, enabled: boolean = false) {
  return useQuery({
    queryKey: ['resumes', 'parse-status', id],
    queryFn: async () => {
      const res = await resumeApi.getParseStatus(id);
      return res.data;
    },
    enabled: enabled && !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.parse_status;
      if (status === 'success' || status === 'failed') {
        return false;
      }
      return 2000;
    },
    refetchIntervalInBackground: true,
  });
}