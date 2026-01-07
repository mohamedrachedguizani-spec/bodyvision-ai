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
import { getThemeColors } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';

const RegisterScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    age: '',
    weight: '',
    height: '',
    sex: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRegister = async () => {
    const { email, password, confirmPassword, firstName, lastName, age, weight, height, sex } = formData;

    if (!email || !password || !firstName || !lastName || !sex) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
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

    if (age && (isNaN(parseInt(age)) || parseInt(age) < 1 || parseInt(age) > 120)) {
      Alert.alert('Erreur', 'Âge invalide (1-120 ans)');
      return;
    }

    if (weight && (isNaN(parseFloat(weight)) || parseFloat(weight) < 1 || parseFloat(weight) > 300)) {
      Alert.alert('Erreur', 'Poids invalide (1-300 kg)');
      return;
    }

    if (height && (isNaN(parseFloat(height)) || parseFloat(height) < 50 || parseFloat(height) > 250)) {
      Alert.alert('Erreur', 'Taille invalide (50-250 cm)');
      return;
    }

    setIsLoading(true);
    
    try {
      const userData = {
        email: email.trim().toLowerCase(),
        password: password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        sex: sex
      };

      console.log('📤 Envoi des données d\'inscription:', JSON.stringify(userData, null, 2));

      await register(userData);
      
      Alert.alert(
        'Succès',
        'Compte créé avec succès! Vous pouvez maintenant vous connecter.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Erreur d\'inscription:', error);
      
      let errorMessage = 'Erreur lors de la création du compte';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
        
        if (errorMessage.includes('already exists')) {
          errorMessage = 'Un compte avec cet email existe déjà';
        } else if (errorMessage.includes('Sex must be')) {
          errorMessage = 'Veuillez sélectionner un sexe valide (homme ou femme)';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Création du compte..." />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: COLORS.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: COLORS.text }]}>Créer un compte</Text>
          <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>Rejoignez BodyVision AI</Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Informations personnelles</Text>
          
          <View style={styles.row}>
            <View style={styles.halfInputContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                placeholder="Prénom *"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.firstName}
                onChangeText={(value) => handleChange('firstName', value)}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            
            <View style={styles.halfInputContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                placeholder="Nom *"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.lastName}
                onChangeText={(value) => handleChange('lastName', value)}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

          <TextInput
            style={[styles.input, { 
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.text 
            }]}
            placeholder="Adresse email *"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />

          <View style={styles.sexSection}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Sexe *</Text>
            <Text style={[styles.sectionSubtitle, { color: COLORS.textSecondary }]}>Sélectionnez votre sexe biologique pour des analyses précises</Text>
            
            <View style={styles.sexButtons}>
              <TouchableOpacity
                style={[
                  styles.sexButton,
                  formData.sex === 'male' && styles.sexButtonActive,
                  formData.sex === 'male' && { borderColor: COLORS.primary },
                  { 
                    backgroundColor: COLORS.card,
                    borderColor: COLORS.border 
                  }
                ]}
                onPress={() => handleChange('sex', 'male')}
                activeOpacity={0.7}
              >
                <View style={styles.sexButtonContent}>
                  <Text style={[
                    styles.sexButtonText,
                    formData.sex === 'male' && styles.sexButtonTextActive,
                    { color: formData.sex === 'male' ? COLORS.primary : COLORS.textSecondary }
                  ]}>
                    Homme
                  </Text>
                  {formData.sex === 'male' && (
                    <View style={[styles.selectedIndicator, { backgroundColor: COLORS.primary }]}>
                      <Text style={styles.selectedIndicatorText}>✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sexButton,
                  formData.sex === 'female' && styles.sexButtonActive,
                  formData.sex === 'female' && { borderColor: COLORS.primary },
                  { 
                    backgroundColor: COLORS.card,
                    borderColor: COLORS.border 
                  }
                ]}
                onPress={() => handleChange('sex', 'female')}
                activeOpacity={0.7}
              >
                <View style={styles.sexButtonContent}>
                  <Text style={[
                    styles.sexButtonText,
                    formData.sex === 'female' && styles.sexButtonTextActive,
                    { color: formData.sex === 'female' ? COLORS.primary : COLORS.textSecondary }
                  ]}>
                    Femme
                  </Text>
                  {formData.sex === 'female' && (
                    <View style={[styles.selectedIndicator, { backgroundColor: COLORS.primary }]}>
                      <Text style={styles.selectedIndicatorText}>✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
            
            {!formData.sex && (
              <Text style={[styles.errorText, { color: '#ff4444' }]}>Veuillez sélectionner votre sexe</Text>
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Sécurité</Text>
          
          <TextInput
            style={[styles.input, { 
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.text 
            }]}
            placeholder="Mot de passe * (min. 6 caractères)"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            secureTextEntry
            returnKeyType="next"
          />
          
          <TextInput
            style={[styles.input, { 
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.text 
            }]}
            placeholder="Confirmer le mot de passe *"
            placeholderTextColor={COLORS.textSecondary}
            value={formData.confirmPassword}
            onChangeText={(value) => handleChange('confirmPassword', value)}
            secureTextEntry
            returnKeyType="next"
          />

          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Informations physiques (optionnel)</Text>
          <Text style={[styles.sectionSubtitle, { color: COLORS.textSecondary }]}>
            Ces données améliorent la précision de vos analyses corporelles
          </Text>
          
          <View style={styles.row}>
            <View style={styles.thirdInputContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                placeholder="Âge"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.age}
                onChangeText={(value) => handleChange('age', value)}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={[styles.inputHint, { color: COLORS.textSecondary }]}>ans</Text>
            </View>
            
            <View style={styles.thirdInputContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                placeholder="Poids"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.weight}
                onChangeText={(value) => handleChange('weight', value)}
                keyboardType="decimal-pad"
                maxLength={5}
              />
              <Text style={[styles.inputHint, { color: COLORS.textSecondary }]}>kg</Text>
            </View>
            
            <View style={styles.thirdInputContainer}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.card,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                placeholder="Taille"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.height}
                onChangeText={(value) => handleChange('height', value)}
                keyboardType="decimal-pad"
                maxLength={6}
              />
              <Text style={[styles.inputHint, { color: COLORS.textSecondary }]}>cm</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.button,
              (!formData.email || !formData.password || !formData.firstName || 
               !formData.lastName || !formData.sex) && styles.buttonDisabled,
              { backgroundColor: COLORS.primary }
            ]} 
            onPress={handleRegister}
            disabled={isLoading || !formData.email || !formData.password || 
                     !formData.firstName || !formData.lastName || !formData.sex}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Création en cours...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>
          
          <Text style={[styles.requiredHint, { color: COLORS.textSecondary }]}>
            * Champs obligatoires
          </Text>
        </View>

        <View style={[styles.footer, { borderTopColor: COLORS.border }]}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>
            Vous avez déjà un compte ?
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            style={styles.footerButton}
          >
            <Text style={[styles.footerLink, { color: COLORS.primary }]}>
              Se connecter
            </Text>
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
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfInputContainer: {
    flex: 0.48,
  },
  thirdInputContainer: {
    flex: 0.31,
    position: 'relative',
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    height: 50,
  },
  inputHint: {
    position: 'absolute',
    right: 12,
    top: 16,
    fontSize: 14,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: ({ COLORS }) => COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: ({ COLORS }) => COLORS.textSecondary,
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  requiredHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 5,
  },
  footerButton: {
    padding: 5,
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  sexSection: {
    marginBottom: 20,
  },
  sexButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  sexButton: {
    flex: 1,
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    minHeight: 60,
    justifyContent: 'center',
  },
  sexButtonActive: {
    backgroundColor: ({ COLORS }) => COLORS.primary + '10',
  },
  sexButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sexButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sexButtonTextActive: {
    fontWeight: '700',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
});

export default RegisterScreen;