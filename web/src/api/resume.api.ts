import client from './axios.client';

export const resumeApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return client.post('/resume/upload', fd);
  },
  getList: (status?: string) => {
    const params = status ? { status } : {};
    return client.get('/resume/list', { params });
  },
  getDetail: (id: string) => client.get(`/resume/${id}`),
  delete: (id: string) => client.delete(`/resume/${id}`),
  getParseStatus: (id: string) => client.get(`/resume/${id}/parse-status`),
  getAnalysis: (id: string) => client.get(`/resume/${id}/analyze`),
  getAtsScore: (id: string) => client.get(`/resume/${id}/ats-score`),
  getSkills: (id: string) => client.get(`/resume/${id}/skills`),
  enhanceSection: (id: string, sectionType: string) => 
    client.post(`/resume/${id}/enhance`, { section_type: sectionType }),
  atsCheckJd: (id: string, jobDescription: string) => 
    client.post(`/resume/${id}/ats-check`, { job_description: jobDescription }),
  reparse: (id: string) => client.post(`/resume/${id}/reparse`),
};