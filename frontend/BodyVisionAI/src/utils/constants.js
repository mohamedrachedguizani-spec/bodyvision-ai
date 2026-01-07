export const COLORS = {
  // Couleurs primaires (restent les mêmes)
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  // Couleurs claires (mode clair)
  light: {
    background: '#F2F2F7',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    inputBackground: '#FFFFFF',
    modalBackground: '#FFFFFF',
  },
  
  // Couleurs sombres (mode sombre)
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#98989F',
    border: '#38383A',
    inputBackground: '#2C2C2E',
    modalBackground: '#1C1C1E',
  },
};

// Fonction utilitaire pour obtenir les couleurs selon le thème
export const getThemeColors = (isDarkMode) => {
  const theme = isDarkMode ? COLORS.dark : COLORS.light;
  return {
    ...COLORS, // Garde les couleurs primaires
    ...theme, // Ajoute les couleurs du thème
  };
};

export const API_CONFIG = {
  baseURL: 'http://192.168.1.114:8000',
  timeout: 30000,
};