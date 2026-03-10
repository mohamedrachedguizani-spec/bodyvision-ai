import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors, SHADOWS, RADIUS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Adresse email ou mot de passe incorrect. Veuillez vérifier vos informations.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Adresse email ou mot de passe incorrect. Veuillez vérifier vos informations.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
      } else if (!error.response) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
      } else if (error.response?.data?.detail && !error.response.data.detail.toLowerCase().includes('refresh')) {
        errorMessage = error.response.data.detail;
      }
      
      Alert.alert(
        'Échec de connexion',
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Connexion en cours..." />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: COLORS.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Logo / Brand */}
          <View style={[styles.logoContainer, { backgroundColor: COLORS.primary + '12' }]}>  
            <View style={[styles.logoInner, { backgroundColor: COLORS.primary + '20' }]}>  
              <Ionicons name="body-outline" size={40} color={COLORS.primary} />
            </View>
          </View>
          <Text style={[styles.brandName, { color: COLORS.text }]}>BodyVision AI</Text>
          <Text style={[styles.tagline, { color: COLORS.textSecondary }]}>
            Intelligence artificielle au service de votre forme
          </Text>
        </Animated.View>

        <Animated.View style={[styles.formCard, { 
          backgroundColor: COLORS.card, 
          opacity: fadeAnim,
          ...SHADOWS.md
        }]}>
          <Text style={[styles.formTitle, { color: COLORS.text }]}>Connexion</Text>
          <Text style={[styles.formSubtitle, { color: COLORS.textSecondary }]}>
            Accédez à votre espace personnel
          </Text>

          {/* Email */}
          <View style={[
            styles.inputContainer, 
            { 
              backgroundColor: COLORS.inputBackground, 
              borderColor: focusedField === 'email' ? COLORS.primary : COLORS.border,
              borderWidth: focusedField === 'email' ? 1.5 : 1,
            }
          ]}>
            <Ionicons name="mail-outline" size={20} color={focusedField === 'email' ? COLORS.primary : COLORS.textSecondary} />
            <TextInput
              style={[styles.input, { color: COLORS.text }]}
              placeholder="Adresse email"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password */}
          <View style={[
            styles.inputContainer, 
            { 
              backgroundColor: COLORS.inputBackground, 
              borderColor: focusedField === 'password' ? COLORS.primary : COLORS.border,
              borderWidth: focusedField === 'password' ? 1.5 : 1,
            }
          ]}>
            <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'password' ? COLORS.primary : COLORS.textSecondary} />
            <TextInput
              style={[styles.input, { color: COLORS.text }]}
              placeholder="Mot de passe"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{top:10,bottom:10,left:10,right:10}}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: COLORS.primary }, SHADOWS.glow(COLORS.primary)]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>
            Vous n'avez pas de compte ?
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.footerLink}>
            <Text style={[styles.footerLinkText, { color: COLORS.primary }]}>Créer un compte</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  formCard: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  loginButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    marginBottom: 8,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLinkText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LoginScreen;