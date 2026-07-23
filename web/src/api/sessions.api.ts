import client from './axios.client';

export const sessionsApi = {
  getHistory: (skip = 0, limit = 10) => 
    client.get('/sessions/history', { params: { skip, limit } }),
  getStreak: () => 
    client.get('/sessions/streak'),
  getProgress: () => 
    client.get('/sessions/analytics/progress'),
  getWeakAreas: () => 
    client.get('/sessions/analytics/weak-areas'),
  getStrengths: () => 
    client.get('/sessions/analytics/strengths'),
  getSummary: (id: string) => 
    client.get(`/sessions/${id}/summary`),
  getImprovements: (id: string) => 
    client.get(`/sessions/${id}/improvements`),
  getScoreBreakdown: (id: string) => 
    client.get(`/sessions/${id}/score-breakdown`),
  getComparison: (id: string) => 
    client.get(`/sessions/${id}/comparison`),
  shareSession: (id: string, expiresInHours?: number) => 
    client.post(`/sessions/${id}/share`, { expires_in_hours: expiresInHours }),
};