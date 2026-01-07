// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

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
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status...');
      const storedToken = await AsyncStorage.getItem('userToken');
      const storedUser = await AsyncStorage.getItem('userData');
      
      console.log('📦 Storage data:', {
        hasToken: !!storedToken,
        hasUser: !!storedUser,
        tokenLength: storedToken?.length
      });
      
      if (storedToken && storedUser) {
        try {
          // Valider que le token est bien formaté
          if (storedToken.length < 10) {
            console.error('❌ Token invalide (trop court)');
            await AsyncStorage.clear();
          } else {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            console.log('✅ User restored from storage');
          }
        } catch (parseError) {
          console.error('❌ Error parsing user data:', parseError);
          await AsyncStorage.clear();
        }
      } else {
        console.log('❌ No user data in storage');
        // S'assurer que tout est bien nettoyé
        if (storedToken || storedUser) {
          await AsyncStorage.clear();
        }
      }
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      // En cas d'erreur, nettoyer le stockage
      try {
        await AsyncStorage.clear();
      } catch (clearError) {
        console.error('Error clearing storage:', clearError);
      }
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
      console.log('🏁 Auth initialization complete');
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login...', { email });
      
      // Validation basique
      if (!email || !password) {
        throw new Error('Email et mot de passe sont requis');
      }

      const response = await authAPI.login(email, password);
      console.log('📨 Login response received:', {
        hasToken: !!response.data?.access_token,
        hasUser: !!response.data?.user,
        status: response.status
      });

      const { access_token, user: userData } = response.data;
      
      if (!access_token || !userData) {
        throw new Error('Données de connexion incomplètes');
      }

      console.log('💾 Saving data to storage...');
      
      // Sauvegarder dans AsyncStorage
      await AsyncStorage.setItem('userToken', access_token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      // Mettre à jour l'état
      setToken(access_token);
      setUser(userData);
      
      console.log('✅ Login successful, user data saved');
      
      return response.data;
    } catch (error) {
      console.error('❌ Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Nettoyer en cas d'erreur
      if (error.response?.status === 401 || error.response?.status === 400) {
        try {
          await AsyncStorage.clear();
          setToken(null);
          setUser(null);
        } catch (clearError) {
          console.error('Error clearing storage on login error:', clearError);
        }
      }
      
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      console.log('👤 Attempting registration...');
      
      // Validation des données requises
      if (!userData.email || !userData.password || !userData.first_name || !userData.last_name) {
        throw new Error('Données d\'inscription incomplètes');
      }

      const response = await authAPI.register(userData);
      console.log('✅ Registration successful');
      return response.data;
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  };

  const updateUser = async (userData) => {
    try {
      console.log('🔄 Updating user data...', userData);
      
      // Mettre à jour les données dans AsyncStorage
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      // Mettre à jour l'état
      setUser(userData);
      
      console.log('✅ User data updated successfully');
      
      return userData;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

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

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Nettoyer AsyncStorage
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      
      // Nettoyer l'état
      setUser(null);
      setToken(null);
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Forcer le nettoyage en cas d'erreur
      try {
        await AsyncStorage.clear();
        setUser(null);
        setToken(null);
      } catch (clearError) {
        console.error('Error forcing clear on logout:', clearError);
      }
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isInitialized,
    login,
    register,
    updateUser,
    updatePassword,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};