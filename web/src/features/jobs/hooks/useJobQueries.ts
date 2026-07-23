import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/api/jobs.api';

export function useJobRecommendations(resumeId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'recommendations', resumeId],
    queryFn: async () => {
      if (!resumeId) return [];
      const res = await jobsApi.getRecommendations(resumeId);
      return res.data;
    },
    enabled: !!resumeId,
  });
}

export function useJobSearch(params: { q?: string; location?: string; experience_level?: string }) {
  return useQuery({
    queryKey: ['jobs', 'search', params],
    queryFn: async () => {
      const res = await jobsApi.search(params);
      return res.data;
    },
  });
}

export function useLiveJobSearch(params: { q?: string }) {
  return useQuery({
    queryKey: ['jobs', 'search-live', params],
    queryFn: async () => {
      const res = await jobsApi.searchLive(params);
      return res.data;
    },
  });
}

export function useJobDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await jobsApi.getDetail(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useJobMatchScore(resumeId: string | undefined, jobId: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'match-score', resumeId, jobId],
    queryFn: async () => {
      if (!resumeId || !jobId) return null;
      const res = await jobsApi.getMatchScore(resumeId, jobId);
      return res.data;
    },
    enabled: !!resumeId && !!jobId,
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: ['jobs', 'saved'],
    queryFn: async () => {
      const res = await jobsApi.getSaved();
      return res.data;
    },
  });
}

// Keep old naming for compatibility if any other components import it
export const useSavedJobsQuery = useSavedJobs;

export function useSaveJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await jobsApi.saveJob(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'recommendations'] });
    },
  });
}

export function useUnsaveJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await jobsApi.unsaveJob(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'recommendations'] });
    },
  });
}