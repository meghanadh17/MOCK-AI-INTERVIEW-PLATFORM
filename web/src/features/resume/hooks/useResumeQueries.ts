import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resumeApi } from '@/api/resume.api';

export function useResumeListQuery(status?: string) {
  return useQuery({
    queryKey: ['resumes', 'list', status],
    queryFn: async () => {
      const res = await resumeApi.getList(status);
      return res.data;
    },
  });
}

export function useResumeDetailQuery(id: string) {
  return useQuery({
    queryKey: ['resumes', 'detail', id],
    queryFn: async () => {
      const res = await resumeApi.getDetail(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useResumeAnalysisQuery(id: string) {
  return useQuery({
    queryKey: ['resumes', 'analysis', id],
    queryFn: async () => {
      const res = await resumeApi.getAnalysis(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useResumeAtsScoreQuery(id: string) {
  return useQuery({
    queryKey: ['resumes', 'ats-score', id],
    queryFn: async () => {
      const res = await resumeApi.getAtsScore(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useResumeSkillsQuery(id: string) {
  return useQuery({
    queryKey: ['resumes', 'skills', id],
    queryFn: async () => {
      const res = await resumeApi.getSkills(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useUploadResumeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const res = await resumeApi.upload(file);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
}

export function useDeleteResumeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await resumeApi.delete(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
}

export function useEnhanceSectionMutation() {
  return useMutation({
    mutationFn: async ({ id, sectionType }: { id: string; sectionType: string }) => {
      const res = await resumeApi.enhanceSection(id, sectionType);
      return res.data;
    },
  });
}

export function useReparseResumeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await resumeApi.reparse(id);
      return res.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['resumes', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['resumes', 'list'] });
    },
  });
}

export function useAtsCheckJdMutation() {
  return useMutation({
    mutationFn: async ({ id, jobDescription }: { id: string; jobDescription: string }) => {
      const res = await resumeApi.atsCheckJd(id, jobDescription);
      return res.data;
    },
  });
}