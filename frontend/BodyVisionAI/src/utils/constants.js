// Design System — BodyVision AI
// Modern, clean, cohesive palette + spacing + shadows

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
};

export const FONT = {
  hero: 34,
  title: 28,
  heading: 22,
  subheading: 18,
  body: 15,
  caption: 13,
  small: 11,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  }),
};

export const COLORS = {
  // Primaires
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  primaryDark: '#3730A3',
  secondary: '#7C3AED',
  secondaryLight: '#A78BFA',
  accent: '#06B6D4',
  accentLight: '#67E8F9',

  // Statuts
  success: '#10B981',
  successLight: '#6EE7B7',
  warning: '#F59E0B',
  warningLight: '#FCD34D',
  error: '#EF4444',
  errorLight: '#FCA5A5',

  // Mode clair
  light: {
    background: '#F5F3FF',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1E1B4B',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    inputBackground: '#F9FAFB',
    modalBackground: '#FFFFFF',
    overlay: 'rgba(17, 12, 46, 0.12)',
    shimmer: '#E8E5FF',
  },

  // Mode sombre
  dark: {
    background: '#0F0D1A',
    surface: '#1A1726',
    card: '#1E1B2E',
    text: '#F1F0FF',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#2D2A3E',
    borderLight: '#252238',
    inputBackground: '#1E1B2E',
    modalBackground: '#1A1726',
    overlay: 'rgba(0, 0, 0, 0.5)',
    shimmer: '#2D2A3E',
  },
};

// Fonction utilitaire pour obtenir les couleurs selon le thème
export const getThemeColors = (isDarkMode) => {
  const theme = isDarkMode ? COLORS.dark : COLORS.light;
  return {
    ...COLORS,
    ...theme,
  };
};

// Fonction utilitaire pour obtenir les ombres adaptées au thème
export const getThemeShadows = (isDarkMode) => ({
  sm: {
    shadowColor: isDarkMode ? '#000' : '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0.3 : 0.06,
    shadowRadius: isDarkMode ? 4 : 3,
    elevation: isDarkMode ? 3 : 2,
  },
  md: {
    shadowColor: isDarkMode ? '#000' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.4 : 0.08,
    shadowRadius: isDarkMode ? 14 : 12,
    elevation: isDarkMode ? 6 : 4,
  },
  lg: {
    shadowColor: isDarkMode ? '#000' : '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.5 : 0.12,
    shadowRadius: isDarkMode ? 28 : 24,
    elevation: isDarkMode ? 10 : 8,
  },
});

export const API_CONFIG = {
  baseURL: 'http://192.168.1.114:8000',
  timeout: 30000,
};