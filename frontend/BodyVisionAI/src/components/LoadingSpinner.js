import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const LoadingSpinner = ({ message = 'Chargement...', size = 'large' }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>  
      <Animated.View style={[
        styles.iconWrap,
        { backgroundColor: COLORS.primary + '12', transform: [{ scale: pulseAnim }] }
      ]}>
        <View style={[styles.iconInner, { backgroundColor: COLORS.primary + '18' }]}>
          <ActivityIndicator size={size} color={COLORS.primary} />
        </View>
      </Animated.View>
      <Text style={[styles.message, { color: COLORS.text }]}>{message}</Text>
      <Text style={[styles.hint, { color: COLORS.textSecondary }]}>Veuillez patienter…</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
  },
});

export default LoadingSpinner;