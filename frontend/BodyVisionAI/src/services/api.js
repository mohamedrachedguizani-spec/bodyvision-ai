import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const YOUR_LOCAL_IP = '192.168.1.114'; // ← CHANGEZ CETTE IP
const API_BASE_URL = `http://${YOUR_LOCAL_IP}:8000`;
const API_TIMEOUT = 60000;

console.log('📍 API URL:', API_BASE_URL);

// Création de l'instance axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: API_TIMEOUT,
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Token error:', error);
  }
  return config;
});

// Services API
export const authAPI = {
  login: (email, password) => api.post('/login', { email, password }),
  register: (userData) => api.post('/register', userData),
  updateProfile: (userData) => api.put('/update-profile', userData),
  updatePassword: (passwordData) => api.put('/update-password', passwordData),
};

export const analysisAPI = {
  // Analyse corporelle améliorée
  analyzeBodyEnhanced: (formData) => {
    return api.post('/analyze-body-comprehensive-enhanced', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    });
  },

  // Plan fitness intelligent
  generateIntelligentFitnessPlan: (analysisData) => {
    return api.post('/generate-intelligent-fitness-plan', analysisData, {
      timeout: 120000,
    });
  },

  // Analyses utilisateur
  getUserAnalyses: () => api.get('/user-analyses'),
  getAnalysisDetails: (analysisId) => api.get(`/analysis/${analysisId}`),
  deleteAnalysis: (analysisId) => api.delete(`/analysis/${analysisId}`),

  // Santé
  healthCheck: () => api.get('/health'),
};

export default api;