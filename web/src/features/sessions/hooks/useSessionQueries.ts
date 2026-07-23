import { useQuery, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { sessionsApi } from '@/api/sessions.api';

export function useSessionHistoryQuery(limit?: number) {
  return useQuery({
    queryKey: ['sessions', 'history', limit],
    queryFn: async () => {
      const res = await sessionsApi.getHistory(0, limit || 10);
      return res.data;
    },
  });
}

export function useInfiniteSessionHistory(limit = 10) {
  return useInfiniteQuery({
    queryKey: ['sessions', 'history', limit],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await sessionsApi.getHistory(pageParam, limit);
      return res.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If we got a full page of items, there is likely a next page.
      return lastPage.length === limit ? allPages.length * limit : undefined;
    },
  });
}

export function useSessionSummaryQuery(id: string) {
  return useQuery({
    queryKey: ['sessions', id, 'summary'],
    queryFn: async () => {
      const res = await sessionsApi.getSummary(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useSessionImprovementsQuery(id: string) {
  return useQuery({
    queryKey: ['sessions', id, 'improvements'],
    queryFn: async () => {
      const res = await sessionsApi.getImprovements(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useSessionScoreBreakdownQuery(id: string) {
  return useQuery({
    queryKey: ['sessions', id, 'score-breakdown'],
    queryFn: async () => {
      const res = await sessionsApi.getScoreBreakdown(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useSessionComparisonQuery(id: string) {
  return useQuery({
    queryKey: ['sessions', id, 'comparison'],
    queryFn: async () => {
      const res = await sessionsApi.getComparison(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useSessionStreakQuery() {
  return useQuery({
    queryKey: ['sessions', 'streak'],
    queryFn: async () => {
      const res = await sessionsApi.getStreak();
      return res.data;
    },
  });
}

export function useSessionProgressQuery() {
  return useQuery({
    queryKey: ['sessions', 'progress'],
    queryFn: async () => {
      const res = await sessionsApi.getProgress();
      return res.data;
    },
  });
}

export function useSessionWeakAreasQuery() {
  return useQuery({
    queryKey: ['sessions', 'weak-areas'],
    queryFn: async () => {
      const res = await sessionsApi.getWeakAreas();
      return res.data;
    },
  });
}

export function useSessionStrengthsQuery() {
  return useQuery({
    queryKey: ['sessions', 'strengths'],
    queryFn: async () => {
      const res = await sessionsApi.getStrengths();
      return res.data;
    },
  });
}

export function useShareSessionMutation() {
  return useMutation({
    mutationFn: async ({ id, expiresInHours }: { id: string; expiresInHours?: number }) => {
      const res = await sessionsApi.shareSession(id, expiresInHours);
      return res.data;
    },
  });
}