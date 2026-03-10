// SplashAnimationScreen.js — Professional Splash Screen
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../utils/constants';

export default function SplashAnimationScreen({ onFinish }) {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  // ── Animated values ──────────────────────────────────────────
  const logoOpacity     = useRef(new Animated.Value(0)).current;
  const logoScale       = useRef(new Animated.Value(0.85)).current;
  const titleOpacity    = useRef(new Animated.Value(0)).current;
  const titleY          = useRef(new Animated.Value(16)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const dividerWidth    = useRef(new Animated.Value(0)).current;
  const barProgress     = useRef(new Animated.Value(0)).current;
  const screenOpacity   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // ① Logo fade + subtle scale-up
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      // ② Divider line grows
      Animated.timing(dividerWidth, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),

      // ③ Title slides up
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(titleY, {
          toValue: 0,
          tension: 55,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      // ④ Subtitle
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),

      // ⑤ Progress bar fills
      Animated.timing(barProgress, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),

      // ⑥ Brief pause then fade out
      Animated.delay(200),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => onFinish?.());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity, backgroundColor: COLORS.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={COLORS.background}
      />

      {/* ── Centre ── */}
      <View style={styles.center}>

        {/* Logo — même design que LoginScreen */}
        <Animated.View
          style={[
            styles.logoOuter,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
              backgroundColor: COLORS.primary + '14',
            },
          ]}
        >
          <View style={[styles.logoInner, { backgroundColor: COLORS.primary + '22' }]}>
            <Ionicons name="body-outline" size={42} color={COLORS.primary} />
          </View>
        </Animated.View>

        {/* Divider */}
        <Animated.View
          style={[
            styles.divider,
            {
              backgroundColor: COLORS.primary,
              width: dividerWidth.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 48],
              }),
            },
          ]}
        />

        {/* App name */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleY }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.appName}>
            <Text style={[styles.appNameLight, { color: COLORS.text }]}>BODY</Text>
            <Text style={[styles.appNameBold, { color: COLORS.text }]}>VISION</Text>
            <Text style={[styles.appNameAccent, { color: COLORS.primary }]}> AI</Text>
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity, color: COLORS.textSecondary }]}>
          Analyse corporelle intelligente
        </Animated.Text>

      </View>

      {/* ── Progress bar at bottom ── */}
      <View style={[styles.barTrack, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: COLORS.primary,
              width: barProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* ── Version ── */}
      <Animated.Text style={[styles.version, { opacity: subtitleOpacity, color: COLORS.textTertiary }]}>
        v1.0
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Centre
  center: {
    alignItems: 'center',
    gap: 16,
  },

  // Logo — double cercle identique au LoginScreen
  logoOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  divider: {
    height: 1,
    opacity: 0.6,
    marginBottom: 4,
  },

  // App name
  appName: {
    fontSize: 30,
    letterSpacing: 4,
    textAlign: 'center',
  },
  appNameLight: {
    fontWeight: '300',
  },
  appNameBold: {
    fontWeight: '700',
  },
  appNameAccent: {
    fontWeight: '700',
    fontSize: 26,
    letterSpacing: 2,
  },

  // Subtitle
  subtitle: {
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Progress bar
  barTrack: {
    position: 'absolute',
    bottom: 52,
    width: 120,
    height: 2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Version
  version: {
    position: 'absolute',
    bottom: 28,
    fontSize: 11,
    letterSpacing: 1,
  },
});
