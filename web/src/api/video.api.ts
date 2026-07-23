import client from './axios.client';

export interface VideoSessionCreatePayload {
  resume_id?: string | null;
  role?: string;
  difficulty?: number;
  type?: string;
  num_questions?: number;
  title?: string;
  job_description?: string;
}

export const videoApi = {
  createSession: (payload: VideoSessionCreatePayload) => 
    client.post('/video-interview/sessions', payload),
  
  listSessions: (params?: { skip?: number; limit?: number; status?: string }) => 
    client.get('/video-interview/sessions', { params }),
  
  getSessionDetail: (id: string) => 
    client.get(`/video-interview/sessions/${id}`),
  
  startSession: (id: string) => 
    client.post(`/video-interview/sessions/${id}/start`),
  
  endSession: (id: string) => 
    client.post(`/video-interview/sessions/${id}/end`),
  
  getPostureReport: (id: string) => 
    client.get(`/video-interview/sessions/${id}/posture-report`),
  
  getGazeReport: (id: string) => 
    client.get(`/video-interview/sessions/${id}/gaze-report`),
  
  getEmotionReport: (id: string) => 
    client.get(`/video-interview/sessions/${id}/emotion-report`),
  
  getSpeechReport: (id: string) => 
    client.get(`/video-interview/sessions/${id}/speech-report`),
  
  getRecordingUrl: (id: string) => 
    client.get(`/video-interview/sessions/${id}/recording`),
  
  getTranscript: (id: string) => 
    client.get(`/video-interview/sessions/${id}/transcript`),
  
  getSummary: (id: string) => 
    client.get(`/video-interview/sessions/${id}/summary`),
    
  saveMetrics: (id: string, metrics: any) => 
    client.post(`/video-interview/${id}/metrics`, metrics),

  uploadRecording: (id: string, formData: FormData) => 
    client.post(`/video-interview/sessions/${id}/recording`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};