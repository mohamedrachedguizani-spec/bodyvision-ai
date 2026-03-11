import React, { useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors, SHADOWS, RADIUS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';

const RegisterScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);

  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '',
    age: '', weight: '', height: '', sex: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const { register } = useAuth();

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleRegister = async () => {
    const { email, password, confirmPassword, firstName, lastName, age, weight, height, sex } = formData;

    if (!email || !password || !firstName || !lastName || !sex || !age || !weight || !height) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!acceptedPrivacy) {
      Alert.alert('Politique de confidentialité', 'Vous devez accepter la politique de confidentialité pour créer un compte.');
      return;
    }
    if (sex !== 'male' && sex !== 'female') {
      Alert.alert('Erreur', 'Veuillez sélectionner votre sexe');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }
    if (isNaN(parseInt(age)) || parseInt(age) < 1 || parseInt(age) > 120) {
      Alert.alert('Erreur', 'Âge invalide (1-120 ans)');
      return;
    }
    if (isNaN(parseFloat(weight)) || parseFloat(weight) < 1 || parseFloat(weight) > 300) {
      Alert.alert('Erreur', 'Poids invalide (1-300 kg)');
      return;
    }
    if (isNaN(parseFloat(height)) || parseFloat(height) < 50 || parseFloat(height) > 250) {
      Alert.alert('Erreur', 'Taille invalide (50-250 cm)');
      return;
    }

    setIsLoading(true);
    try {
      const userData = {
        email: email.trim().toLowerCase(), password,
        first_name: firstName.trim(), last_name: lastName.trim(),
        age: parseInt(age), weight: parseFloat(weight), height: parseFloat(height), sex,
      };
      await register(userData);
      Alert.alert('Succès', 'Compte créé avec succès !', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      let errorMessage = 'Erreur lors de la création du compte';
      if (!error.response || error.code === 'ECONNABORTED') {
        errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet et réessayez.';
      } else if (error.response?.status === 502 || error.response?.status === 503) {
        errorMessage = 'Le serveur démarre, veuillez patienter 30 secondes et réessayer.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
        if (errorMessage.includes('already exists') || errorMessage.includes('déjà')) {
          errorMessage = 'Un compte avec cet email existe déjà';
        }
      }
      Alert.alert('Erreur', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingSpinner message="Création du compte..." />;

  const inputStyle = (fieldName) => [
    styles.inputContainer,
    {
      backgroundColor: COLORS.inputBackground,
      borderColor: focusedField === fieldName ? COLORS.primary : COLORS.border,
      borderWidth: focusedField === fieldName ? 1.5 : 1,
    }
  ];

  const allFilled = formData.email && formData.password && formData.firstName && formData.lastName && formData.sex && formData.age && formData.weight && formData.height && acceptedPrivacy;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: COLORS.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{top:10,bottom:10,left:10,right:10}}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={[styles.logoSmall, { backgroundColor: COLORS.primary + '15' }]}>
            <Ionicons name="person-add-outline" size={24} color={COLORS.primary} />
          </View>
          <Text style={[styles.title, { color: COLORS.text }]}>Créer un compte</Text>
          <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>Rejoignez BodyVision AI et transformez-vous</Text>
        </View>

        {/* Section: Identité */}
        <View style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Identité</Text>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <View style={inputStyle('firstName')}>
                <TextInput style={[styles.input, { color: COLORS.text }]} placeholder="Prénom" placeholderTextColor={COLORS.textSecondary}
                  value={formData.firstName} onChangeText={(v) => handleChange('firstName', v)}
                  onFocus={() => setFocusedField('firstName')} onBlur={() => setFocusedField(null)} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={inputStyle('lastName')}>
                <TextInput style={[styles.input, { color: COLORS.text }]} placeholder="Nom" placeholderTextColor={COLORS.textSecondary}
                  value={formData.lastName} onChangeText={(v) => handleChange('lastName', v)}
                  onFocus={() => setFocusedField('lastName')} onBlur={() => setFocusedField(null)} />
              </View>
            </View>
          </View>
          <View style={inputStyle('email')}>
            <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? COLORS.primary : COLORS.textSecondary} />
            <TextInput style={[styles.inputWithIcon, { color: COLORS.text }]} placeholder="Adresse email" placeholderTextColor={COLORS.textSecondary}
              value={formData.email} onChangeText={(v) => handleChange('email', v)} autoCapitalize="none" keyboardType="email-address"
              onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
          </View>
        </View>

        {/* Section: Sexe */}
        <View style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="transgender-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Sexe biologique</Text>
          </View>
          <Text style={[styles.sectionHint, { color: COLORS.textSecondary }]}>Pour des analyses corporelles précises</Text>
          <View style={styles.sexButtons}>
            <TouchableOpacity
              style={[
                styles.sexButton,
                { borderColor: formData.sex === 'male' ? COLORS.primary : COLORS.border,
                  backgroundColor: formData.sex === 'male' ? COLORS.primary + '12' : COLORS.inputBackground }
              ]}
              onPress={() => handleChange('sex', 'male')} activeOpacity={0.7}
            >
              <Ionicons name="male" size={22} color={formData.sex === 'male' ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.sexButtonText, { color: formData.sex === 'male' ? COLORS.primary : COLORS.textSecondary, fontWeight: formData.sex === 'male' ? '700' : '500' }]}>Homme</Text>
              {formData.sex === 'male' && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sexButton,
                { borderColor: formData.sex === 'female' ? COLORS.secondary : COLORS.border,
                  backgroundColor: formData.sex === 'female' ? COLORS.secondary + '12' : COLORS.inputBackground }
              ]}
              onPress={() => handleChange('sex', 'female')} activeOpacity={0.7}
            >
              <Ionicons name="female" size={22} color={formData.sex === 'female' ? COLORS.secondary : COLORS.textSecondary} />
              <Text style={[styles.sexButtonText, { color: formData.sex === 'female' ? COLORS.secondary : COLORS.textSecondary, fontWeight: formData.sex === 'female' ? '700' : '500' }]}>Femme</Text>
              {formData.sex === 'female' && <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Sécurité */}
        <View style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Sécurité</Text>
          </View>
          <View style={inputStyle('password')}>
            <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'password' ? COLORS.primary : COLORS.textSecondary} />
            <TextInput style={[styles.inputWithIcon, { color: COLORS.text }]} placeholder="Mot de passe (min. 6 car.)" placeholderTextColor={COLORS.textSecondary}
              value={formData.password} onChangeText={(v) => handleChange('password', v)} secureTextEntry={!showPassword}
              onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{top:10,bottom:10,left:10,right:10}}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={inputStyle('confirmPassword')}>
            <Ionicons name="lock-open-outline" size={18} color={focusedField === 'confirmPassword' ? COLORS.primary : COLORS.textSecondary} />
            <TextInput style={[styles.inputWithIcon, { color: COLORS.text }]} placeholder="Confirmer le mot de passe" placeholderTextColor={COLORS.textSecondary}
              value={formData.confirmPassword} onChangeText={(v) => handleChange('confirmPassword', v)} secureTextEntry
              onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField(null)} />
          </View>
        </View>

        {/* Section: Mensurations */}
        <View style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="resize-outline" size={18} color={COLORS.primary} />
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Mensurations</Text>
          </View>
          <Text style={[styles.sectionHint, { color: COLORS.textSecondary }]}>Nécessaires pour la précision de vos analyses</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: COLORS.textSecondary }]}>Âge</Text>
              <View style={[styles.metricInput, { backgroundColor: COLORS.inputBackground, borderColor: focusedField === 'age' ? COLORS.primary : COLORS.border }]}>
                <TextInput style={[styles.metricValue, { color: COLORS.text }]} value={formData.age} onChangeText={(v) => handleChange('age', v)}
                  keyboardType="number-pad" maxLength={3} placeholder="--" placeholderTextColor={COLORS.textSecondary}
                  onFocus={() => setFocusedField('age')} onBlur={() => setFocusedField(null)} />
                <Text style={[styles.metricUnit, { color: COLORS.textSecondary }]}>ans</Text>
              </View>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: COLORS.textSecondary }]}>Poids</Text>
              <View style={[styles.metricInput, { backgroundColor: COLORS.inputBackground, borderColor: focusedField === 'weight' ? COLORS.primary : COLORS.border }]}>
                <TextInput style={[styles.metricValue, { color: COLORS.text }]} value={formData.weight} onChangeText={(v) => handleChange('weight', v)}
                  keyboardType="decimal-pad" maxLength={5} placeholder="--" placeholderTextColor={COLORS.textSecondary}
                  onFocus={() => setFocusedField('weight')} onBlur={() => setFocusedField(null)} />
                <Text style={[styles.metricUnit, { color: COLORS.textSecondary }]}>kg</Text>
              </View>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: COLORS.textSecondary }]}>Taille</Text>
              <View style={[styles.metricInput, { backgroundColor: COLORS.inputBackground, borderColor: focusedField === 'height' ? COLORS.primary : COLORS.border }]}>
                <TextInput style={[styles.metricValue, { color: COLORS.text }]} value={formData.height} onChangeText={(v) => handleChange('height', v)}
                  keyboardType="decimal-pad" maxLength={6} placeholder="--" placeholderTextColor={COLORS.textSecondary}
                  onFocus={() => setFocusedField('height')} onBlur={() => setFocusedField(null)} />
                <Text style={[styles.metricUnit, { color: COLORS.textSecondary }]}>cm</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Politique de confidentialité */}
        <View style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <TouchableOpacity
            style={styles.privacyRow}
            onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.checkbox,
              {
                backgroundColor: acceptedPrivacy ? COLORS.primary : 'transparent',
                borderColor: acceptedPrivacy ? COLORS.primary : COLORS.border,
              }
            ]}>
              {acceptedPrivacy && <Ionicons name="checkmark" size={14} color="white" />}
            </View>
            <Text style={[styles.privacyText, { color: COLORS.text }]}>
              J'accepte la{' '}
              <Text
                style={{ color: COLORS.primary, fontWeight: '700', textDecorationLine: 'underline' }}
                onPress={() => navigation.navigate('Privacy')}
              >
                politique de confidentialité
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: allFilled ? COLORS.primary : COLORS.primary + '40' }, allFilled ? SHADOWS.glow(COLORS.primary) : {}]}
          onPress={handleRegister} disabled={isLoading || !allFilled} activeOpacity={0.85}
        >
          <Text style={styles.submitButtonText}>Créer mon compte</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>Vous avez déjà un compte ?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footerLink}>
            <Text style={[styles.footerLinkText, { color: COLORS.primary }]}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backBtn: { marginBottom: 16 },
  logoSmall: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  subtitle: { fontSize: 15, lineHeight: 21 },
  section: { borderRadius: 20, padding: 20, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionHint: { fontSize: 13, marginBottom: 14, marginTop: -6 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, height: 50, marginBottom: 12, gap: 10, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  inputWithIcon: { flex: 1, fontSize: 15, height: '100%' },
  sexButtons: { flexDirection: 'row', gap: 12 },
  sexButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1.5 },
  sexButtonText: { fontSize: 15 },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metricBox: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricInput: { width: '100%', alignItems: 'center', borderRadius: 14, paddingVertical: 12, borderWidth: 1 },
  metricValue: { fontSize: 22, fontWeight: '700', textAlign: 'center', width: '100%', paddingHorizontal: 8 },
  metricUnit: { fontSize: 12, marginTop: 2 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  privacyText: { flex: 1, fontSize: 14, lineHeight: 20 },
  submitButton: { flexDirection: 'row', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, marginBottom: 20 },
  submitButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  footer: { alignItems: 'center', paddingVertical: 10 },
  footerText: { fontSize: 14, marginBottom: 6 },
  footerLink: { padding: 4 },
  footerLinkText: { fontSize: 16, fontWeight: '700' },
});

export default RegisterScreen;