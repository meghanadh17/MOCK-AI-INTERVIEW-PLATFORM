import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interviewApi } from '@/api/interview.api';
import { useInterviewStore } from '@/store/interview.store';

export function useInterviewSessionsQuery(params?: any) {
  return useQuery({
    queryKey: ['interview', 'sessions', params],
    queryFn: async () => {
      const res = await interviewApi.listSessions(params);
      return res.data;
    }
  });
}

export function useInterviewSetupMutation() {
  const startSession = useInterviewStore((state) => state.startSession);
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await interviewApi.createSession(payload);
      return res.data;
    },
    onSuccess: (data) => {
      // Initialize Zustand store session state
      startSession(data.id, data.questions || []);
    }
  });
}

export function useInterviewStartMutation() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await interviewApi.startSession(id);
      return res.data;
    }
  });
}

export function useSubmitAnswerMutation() {
  const setLastFeedback = useInterviewStore((state) => state.setLastFeedback);
  return useMutation({
    mutationFn: async ({ id, userTranscript, audioPath, videoPath }: { 
      id: string; 
      userTranscript: string; 
      audioPath?: string; 
      videoPath?: string; 
    }) => {
      const res = await interviewApi.submitAnswer(id, {
        user_transcript: userTranscript,
        audio_path: audioPath,
        video_path: videoPath
      });
      return res.data;
    },
    onSuccess: (data) => {
      // Store evaluation feedback response
      setLastFeedback(data);
    }
  });
}

export function useRequestHintMutation() {
  return useMutation({
    mutationFn: async ({ id, questionId }: { id: string; questionId: string }) => {
      const res = await interviewApi.requestHint(id, questionId);
      return res.data;
    }
  });
}

export function useSkipQuestionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, questionId }: { id: string; questionId: string }) => {
      const res = await interviewApi.skipQuestion(id, questionId);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interview', 'session', variables.id] });
    }
  });
}

export function useEndInterviewMutation() {
  const endSession = useInterviewStore((state) => state.endSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await interviewApi.endSession(id);
      return res.data;
    },
    onSuccess: (_, id) => {
      endSession();
      queryClient.invalidateQueries({ queryKey: ['interview', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['interview', 'report', id] });
      queryClient.invalidateQueries({ queryKey: ['interview', 'feedback', id] });
    }
  });
}

export function useInterviewReportQuery(id: string) {
  return useQuery({
    queryKey: ['interview', 'report', id],
    queryFn: async () => {
      const res = await interviewApi.getReport(id);
      return res.data;
    },
    enabled: !!id
  });
}

export function useInterviewFeedbackQuery(id: string) {
  return useQuery({
    queryKey: ['interview', 'feedback', id],
    queryFn: async () => {
      const res = await interviewApi.getFeedback(id);
      return res.data;
    },
    enabled: !!id
  });
}

export function useQuestionBankQuery(params?: any) {
  return useQuery({
    queryKey: ['interview', 'qbank', params],
    queryFn: async () => {
      const res = await interviewApi.browseQbank(params);
      return res.data;
    }
  });
}

export function useGenerateQuestionBankMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await interviewApi.generateQbank(payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', 'qbank'] });
    }
  });
}

export function useRateQuestionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ qId, rating }: { qId: string; rating: number }) => {
      const res = await interviewApi.rateQuestion(qId, rating);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview', 'qbank'] });
    }
  });
}
