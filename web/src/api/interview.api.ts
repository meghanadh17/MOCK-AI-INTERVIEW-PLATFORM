import client from './axios.client';

export const interviewApi = {
  // Static metadata
  getTypes: () => client.get('/interview/types'),
  getRoles: () => client.get('/interview/roles'),

  // Question bank
  browseQbank: (params?: { role?: string; type?: string; difficulty?: number }) => 
    client.get('/interview/question-bank', { params }),
  generateQbank: (data: { role: string; difficulty: string; type: string; count: number }) => 
    client.post('/interview/question-bank/generate', data),
  rateQuestion: (qId: string, rating: number) => 
    client.post(`/interview/question-bank/${qId}/rate`, { rating }),

  // Session lifecycle
  createSession: (data: {
    resume_id?: string | null;
    role?: string;
    difficulty?: number;
    type?: string;
    num_questions?: number;
    title?: string;
    job_description?: string;
  }) => client.post('/interview/sessions', data),
  
  listSessions: (params?: { skip?: number; limit?: number; role?: string; type?: string; status?: string }) => 
    client.get('/interview/sessions', { params }),
    
  getSession: (id: string) => client.get(`/interview/sessions/${id}`),
  deleteSession: (id: string) => client.delete(`/interview/sessions/${id}`),
  
  startSession: (id: string) => client.post(`/interview/sessions/${id}/start`),
  
  submitAnswer: (id: string, data: { user_transcript: string; audio_path?: string; video_path?: string }) => 
    client.post(`/interview/sessions/${id}/answer`, data),
    
  getNextQuestion: (id: string) => client.get(`/interview/sessions/${id}/next-question`),
  
  requestHint: (id: string, questionId: string) => 
    client.post(`/interview/sessions/${id}/hint`, null, { params: { question_id: questionId } }),
    
  skipQuestion: (id: string, questionId: string) => 
    client.post(`/interview/sessions/${id}/skip`, null, { params: { question_id: questionId } }),
    
  endSession: (id: string) => client.post(`/interview/sessions/${id}/end`),
  
  getReport: (id: string) => client.get(`/interview/sessions/${id}/report`),
  getFeedback: (id: string) => client.get(`/interview/sessions/${id}/feedback`),
  getTranscript: (id: string) => client.get(`/interview/sessions/${id}/transcript`, { responseType: 'blob' }),

  // Backward compatibility alias
  setup: (data: any) => client.post('/interview/sessions', data),
  getQuestions: (id: string) => client.get(`/interview/sessions/${id}`),
};