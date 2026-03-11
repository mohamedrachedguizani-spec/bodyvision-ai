/**
 * AuthContext.js — Gestion d'authentification sécurisée.
 *
 * • access_token  : stocké en mémoire uniquement (state React).
 * • refresh_token : cookie httpOnly géré par le navigateur / réseau natif.
 * • userData      : stocké dans AsyncStorage (données non sensibles).
 *
 * Au démarrage de l'app, on tente un /refresh pour récupérer
 * un nouvel access_token à partir du cookie.
 */
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { setAccessToken, setOnSessionExpired } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // ── Logout ──────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      console.log('🚪 Logging out...');
      // Appeler le backend pour supprimer le cookie httpOnly
      try {
        await authAPI.logout();
      } catch (_) {
        // Même si l'appel échoue, on nettoie côté client
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setAccessToken(null);
      setUser(null);
      await AsyncStorage.removeItem('userData');
      console.log('✅ Logout complete');
    }
  }, []);

  // ── Enregistrer le callback de session expirée ─────────────
  useEffect(() => {
    setOnSessionExpired(() => {
      console.log('⏰ Session expired — forced logout');
      logout();
    });
  }, [logout]);

  // ── Vérification de session au démarrage ───────────────────
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status via /refresh...');

      // Charger les données utilisateur en cache (UX : éviter écran blanc)
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (_) {
          await AsyncStorage.removeItem('userData');
        }
      }

      // Tenter un refresh pour obtenir un access_token
      // Timeout court (8s) + pas de retry : si le backend est down, on va direct au login
      const response = await authAPI.refreshStartup();
      const { access_token, user: userData } = response.data;

      setAccessToken(access_token);
      setUser(userData);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));

      console.log('✅ Session restored via refresh');
    } catch (error) {
      console.log('❌ No valid session — user needs to login');
      setAccessToken(null);
      setUser(null);
      await AsyncStorage.removeItem('userData');
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
      console.log('🏁 Auth initialization complete');
    }
  };

  // ── Login ──────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login...', { email });

      if (!email || !password) {
        throw new Error('Email et mot de passe sont requis');
      }

      const response = await authAPI.login(email, password);
      const { access_token, user: userData } = response.data;
      // Le refresh_token est automatiquement stocké dans le cookie httpOnly

      if (!access_token || !userData) {
        throw new Error('Données de connexion incomplètes');
      }

      // Stocker l'access_token en mémoire uniquement
      setAccessToken(access_token);

      // Stocker les données utilisateur dans AsyncStorage (non sensible)
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);

      console.log('✅ Login successful');
      return response.data;
    } catch (error) {
      console.error('❌ Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Nettoyer en cas d'erreur
      setAccessToken(null);
      setUser(null);
      await AsyncStorage.removeItem('userData');

      throw error;
    }
  };

  // ── Register ───────────────────────────────────────────────
  const register = async (userData) => {
    try {
      console.log('👤 Attempting registration...');

      if (
        !userData.email ||
        !userData.password ||
        !userData.first_name ||
        !userData.last_name ||
        !userData.age ||
        !userData.weight ||
        !userData.height ||
        !userData.sex
      ) {
        throw new Error("Données d'inscription incomplètes");
      }

      const response = await authAPI.register(userData);
      console.log('✅ Registration successful');
      return response.data;
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  };

  // ── Update user data ──────────────────────────────────────
  const updateUser = async (userData) => {
    try {
      console.log('🔄 Updating user data...', userData);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      console.log('✅ User data updated');
      return userData;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // ── Update password ────────────────────────────────────────
  const updatePassword = async (passwordData) => {
    try {
      console.log('🔒 Updating password...');
      const response = await authAPI.updatePassword(passwordData);
      console.log('✅ Password updated');
      return response.data;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  };
  // ── Delete account ───────────────────────────────────────────
  const deleteAccount = async (password) => {
    try {
      console.log('🗑️ Deleting account...');
      const response = await authAPI.deleteAccount(password);
      // Nettoyage local après suppression réussie
      setAccessToken(null);
      setUser(null);
      await AsyncStorage.removeItem('userData');
      console.log('✅ Account deleted');
      return response.data;
    } catch (error) {
      console.error('❌ Delete account error:', error);
      throw error;
    }
  };
  // ── Context value ──────────────────────────────────────────
  const value = {
    user,
    isLoading,
    isInitialized,
    login,
    register,
    updateUser,
    updatePassword,
    deleteAccount,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
