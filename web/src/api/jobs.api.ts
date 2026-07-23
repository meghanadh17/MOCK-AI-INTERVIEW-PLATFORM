import client from './axios.client';

export const jobsApi = {
  getDetail: (id: string) => client.get(`/jobs/${id}`),
  getRecommendations: (resumeId: string) => client.get(`/jobs/recommendations/${resumeId}`),
  getMatchScore: (resumeId: string, jobId: string) => client.get(`/jobs/match-score/${resumeId}/${jobId}`),
  search: (params?: { q?: string; location?: string; experience_level?: string; limit?: number }) => 
    client.get('/jobs/search', { params }),
  searchLive: (params?: { q?: string }) => 
    client.get('/jobs/search-live', { params }),
  getSaved: () => client.get('/jobs/saved'),
  saveJob: (id: string) => client.post(`/jobs/${id}/save`),
  unsaveJob: (id: string) => client.delete(`/jobs/${id}/unsave`),
};