/**
 * api.js — Configuration Axios avec gestion du refresh token.
 *
 * Stratégie de sécurité :
 *  • access_token  → stocké en mémoire uniquement (variable JS).
 *  • refresh_token → cookie httpOnly géré automatiquement par le réseau.
 *  • Aucun token dans AsyncStorage / localStorage.
 *
 * Un intercepteur de réponse tente automatiquement un /refresh
 * lorsqu'une requête reçoit un 401, puis re-joue la requête originale.
 */
import axios from 'axios';

// ─── Configuration ───────────────────────────────────────────
const YOUR_LOCAL_IP = '192.168.1.114'; // ← CHANGEZ CETTE IP
const API_BASE_URL = `http://${YOUR_LOCAL_IP}:8000`;
const API_TIMEOUT = 60000;

console.log('📍 API URL:', API_BASE_URL);

// ─── Token en mémoire ────────────────────────────────────────
let _accessToken = null;

export const setAccessToken = (token) => {
  _accessToken = token;
};
export const getAccessToken = () => _accessToken;

// ─── Callback de session expirée (défini par AuthContext) ────
let _onSessionExpired = null;

export const setOnSessionExpired = (callback) => {
  _onSessionExpired = callback;
};

// ─── Instance Axios ──────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: API_TIMEOUT,
  withCredentials: true, // Indispensable pour envoyer/recevoir les cookies httpOnly
});

// ─── Retry logic : réessaie automatiquement les erreurs réseau/429/503 ──
const MAX_RETRIES = 2;
const RETRY_DELAY = 1500; // ms

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error) => {
  if (!error.response) return true; // erreur réseau / timeout
  const status = error.response.status;
  return status === 429 || status === 503 || status === 502;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    config._retryCount = config._retryCount || 0;

    if (isRetryable(error) && config._retryCount < MAX_RETRIES && !config._isRefresh) {
      config._retryCount += 1;
      const delay = RETRY_DELAY * config._retryCount;
      console.log(`🔄 Retry ${config._retryCount}/${MAX_RETRIES} for ${config.url} in ${delay}ms`);
      await sleep(delay);
      return api(config);
    }

    return Promise.reject(error);
  },
);

// ─── Request interceptor : injecte l'access_token ────────────
api.interceptors.request.use(
  (config) => {
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor : refresh automatique sur 401 ──────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ne pas intercepter les erreurs des endpoints d'auth eux-mêmes
    const isAuthEndpoint =
      originalRequest.url?.includes('/refresh') ||
      originalRequest.url?.includes('/login') ||
      originalRequest.url?.includes('/register');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      // Si un refresh est déjà en cours, mettre la requête en file d'attente
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      originalRequest._isRefresh = true;
      isRefreshing = true;

      try {
        // Appel /refresh — le cookie httpOnly est envoyé automatiquement
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = refreshResponse.data.access_token;
        setAccessToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);

        // Notifier l'AuthContext que la session a expiré
        if (_onSessionExpired) {
          _onSessionExpired();
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Services API ────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/login', { email, password }),
  register: (userData) => api.post('/register', userData),
  refresh: () => api.post('/refresh'),
  logout: () => api.post('/logout'),
  updateProfile: (userData) => api.put('/update-profile', userData),
  updatePassword: (passwordData) => api.put('/update-password', passwordData),
  deleteAccount: (password) => api.delete('/delete-account', { data: { password } }),
};

export const analysisAPI = {
  analyzeBodyEnhanced: (formData) =>
    api.post('/analyze-body-comprehensive-enhanced', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    }),

  generateIntelligentFitnessPlan: (analysisData) =>
    api.post('/generate-intelligent-fitness-plan', analysisData, {
      timeout: 120000,
    }),

  getUserStats: () => api.get('/user-stats'),
  getUserAnalyses: () => api.get('/user-analyses'),
  getAnalysisDetails: (analysisId) => api.get(`/analysis/${analysisId}`),
  deleteAnalysis: (analysisId) => api.delete(`/analysis/${analysisId}`),

  healthCheck: () => api.get('/health'),
};

export const coachAPI = {
  transcribe: (formData) =>
    api.post('/coach/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }),

  interact: (data) => api.post('/coach/interact', data, { timeout: 30000 }),

  textInteract: (text, sessionId = null) => {
    const payload = { query: text };
    if (sessionId) payload.session_id = sessionId;
    return api.post('/coach/text-interact', payload, { timeout: 30000 });
  },

  getConversationHistory: (days = 30) =>
    api.get('/coach/conversation-history', { params: { days } }),

  getSessionDetails: (sessionId) => api.get(`/coach/session/${sessionId}`),

  deleteSession: (sessionId) => api.delete(`/coach/session/${sessionId}`),

  // Objectifs
  getGoals: (status = null) => {
    const params = status ? { status } : {};
    return api.get('/coach/goals', { params });
  },
  createGoal: (goalData) => api.post('/coach/goals', goalData),
  updateGoal: (goalId, updates) => api.put(`/coach/goals/${goalId}`, updates),
  deleteGoal: (goalId) => api.delete(`/coach/goals/${goalId}`),

  // Résumé
  getUserSummary: () => api.get('/coach/user-summary'),
};

export default api;
