import client from './axios.client';

export interface QuizGenerateParams {
  topic: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  count?: number;
}

export interface AnswerSubmitParams {
  attempt_id: string;
  question_id: string;
  selected_answer: string;
}

export const quizApi = {
  // 1. Generate adaptive quiz
  generateQuiz: (params: QuizGenerateParams) => 
    client.post('/quiz/generate', params).then(res => res.data),

  // 2. Browse public quizzes
  listQuizzes: (params?: { skip?: number; limit?: number; topic?: string; difficulty?: string }) => 
    client.get('/quiz/list', { params }).then(res => res.data),

  // 3. Get quiz details (questions without answers)
  getQuizDetails: (id: string) => 
    client.get(`/quiz/${id}`).then(res => res.data),

  // 4. Start quiz attempt
  startAttempt: (id: string) => 
    client.post(`/quiz/${id}/start`).then(res => res.data),

  // 5. Submit single answer
  submitAnswer: (id: string, params: AnswerSubmitParams) => 
    client.post(`/quiz/${id}/submit-answer`, params).then(res => res.data),

  // 6. Finish quiz attempt
  finishAttempt: (id: string, attempt_id: string) => 
    client.post(`/quiz/${id}/finish`, { attempt_id }).then(res => res.data),

  // 7. Get attempt results details
  getAttemptResults: (id: string, attempt_id: string) => 
    client.get(`/quiz/${id}/results/${attempt_id}`).then(res => res.data),

  // 8. Get quiz-specific leaderboard
  getQuizLeaderboard: (id: string) => 
    client.get(`/quiz/${id}/leaderboard`).then(res => res.data),

  // 9. Get global leaderboard
  getLeaderboardGlobal: () => 
    client.get('/quiz/leaderboard/global').then(res => res.data),

  // 10. Get weekly leaderboard
  getLeaderboardWeekly: () => 
    client.get('/quiz/leaderboard/weekly').then(res => res.data),

  // 11. Get user ranks summary
  getLeaderboardUser: () => 
    client.get('/quiz/leaderboard/my-rank').then(res => res.data),

  // 12. Get all quiz topics
  getQuizTopics: () => 
    client.get('/quiz/topics').then(res => res.data),

  // 13. Get user quiz attempts history
  getMyAttempts: () => 
    client.get('/quiz/my-attempts').then(res => res.data),

  // 14. Get aggregate stats summary
  getQuizStats: () => 
    client.get('/quiz/stats').then(res => res.data),
};