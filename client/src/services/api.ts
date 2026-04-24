import axios from 'axios';
import type { ApiResponse, User, GameConfig, ClientProfilePublic, DailyNews, Crisis, PrivateContent, SatisfactionScore, Minigame, Notification, RoleVotesState } from 'agence-shared';

export interface HistoryDay {
  dayNumber: number;
  score: number | null;
  delta: number | null;
  aiComment: string | null;
  news: string[];
  crises: { id: string; type: string; title: string; winningOption: string | null; aiConsequence: string | null }[];
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur global : redirige vers /login si 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<User>>('/auth/login', { email, password }).then((r) => r.data.data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<ApiResponse<User>>('/auth/me').then((r) => r.data.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
};

// ─── Game ─────────────────────────────────────────────────────────────────────

export const gameApi = {
  getConfig: () => api.get<ApiResponse<GameConfig>>('/game/config').then((r) => r.data.data),

  getClientProfile: () =>
    api.get<ApiResponse<ClientProfilePublic>>('/game/client').then((r) => r.data.data),

  getNews: (day?: number) =>
    api.get<ApiResponse<DailyNews[]>>('/game/news', { params: { day } }).then((r) => r.data.data),

  getCrises: (day?: number) =>
    api.get<ApiResponse<Crisis[]>>('/crises', { params: { day } }).then((r) => r.data.data),

  getScores: () =>
    api.get<ApiResponse<SatisfactionScore[]>>('/game/scores').then((r) => r.data.data),

  getHistory: () =>
    api.get<ApiResponse<HistoryDay[]>>('/game/history').then((r) => r.data.data),

  getPrivateContent: () =>
    api.get<ApiResponse<PrivateContent[]>>('/game/private').then((r) => r.data.data),

  markMissionComplete: (id: string) =>
    api.put(`/game/private/${id}/complete`),

  markRead: (id: string) =>
    api.put(`/game/private/${id}/read`),
};

// ─── Votes ────────────────────────────────────────────────────────────────────

export const voteApi = {
  castCrisisVote: (crisisId: string, optionId: string) =>
    api.post(`/votes/crisis/${crisisId}`, { optionId }),

  getRoleVotes: () =>
    api.get<ApiResponse<RoleVotesState>>('/votes/roles').then((r) => r.data.data),

  castRoleVote: (role: string) =>
    api.post('/votes/roles', { role }),

  cancelRoleVote: () =>
    api.delete('/votes/roles'),
};

// ─── Mini-jeux ────────────────────────────────────────────────────────────────

export const minigameApi = {
  getMyMinigame: (day: number) =>
    api.get<ApiResponse<Minigame>>(`/minigames/${day}`).then((r) => r.data.data),

  submit: (minigameId: string, content: Record<string, unknown>) =>
    api.post(`/minigames/${minigameId}/submit`, { content }),

  getPendingValidations: () =>
    api.get<ApiResponse<Minigame[]>>('/minigames/pending-validations').then((r) => r.data.data),

  validate: (submissionId: string, approved: boolean, comment?: string) =>
    api.put(`/minigames/submissions/${submissionId}/validate`, { approved, comment }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  getUsers: () => api.get<ApiResponse<User[]>>('/admin/users').then((r) => r.data.data),

  createUser: (data: { username: string; email: string; password: string }) =>
    api.post<ApiResponse<User>>('/admin/users', data).then((r) => r.data.data),

  assignRole: (userId: string, role: string) =>
    api.put(`/admin/users/${userId}/role`, { role }),

  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),

  launchGame: () => api.post('/admin/launch'),

  triggerDailyUpdate: () => api.post('/admin/daily-update'),

  createCrisis: (data: {
    type: string;
    title: string;
    content: string;
    options?: { id: string; label: string }[];
    deadlineMinutes?: number;
  }) => api.post('/admin/crisis', data),

  resolveCrisis: (id: string) => api.post(`/admin/crisis/${id}/resolve`),

  calculateScore: () => api.post('/admin/calculate-score'),

  getAiLogs: () => api.get('/admin/logs').then((r) => r.data.data),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationApi = {
  getAll: () =>
    api.get<ApiResponse<Notification[]>>('/notifications').then((r) => r.data.data),

  markRead: (id: string) => api.put(`/notifications/${id}/read`),

  markAllRead: () => api.put('/notifications/read-all'),
};

// ─── Uploads ──────────────────────────────────────────────────────────────────

export const uploadApi = {
  uploadFile: (file: File, minigameId: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('minigameId', minigameId);
    return api.post<ApiResponse<{ url: string }>>('/uploads', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data);
  },
};

export default api;
