// SettingsScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { authAPI } from '../services/api';
import { getThemeColors } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = ({ navigation }) => {
  const { user, updateUser, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [language, setLanguage] = useState('fr');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    age: user?.age?.toString() || '',
    weight: user?.weight?.toString() || '',
    height: user?.height?.toString() || '',
    sex: user?.sex || 'male',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  ];

  const COLORS = getThemeColors(isDarkMode);

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === language) || languages[0];
  };

  const handleToggleDarkMode = () => {
    toggleDarkMode();
  };

  const handleLanguageSelect = () => {
    Alert.alert(
      'Changer la langue',
      'Sélectionnez votre langue préférée',
      [
        ...languages.map(lang => ({
          text: `${lang.flag} ${lang.name}`,
          onPress: () => {
            setLanguage(lang.code);
            Alert.alert('Langue', `${lang.name} sélectionné`);
          },
        })),
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront perdues.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmation',
              'Êtes-vous vraiment sûr ?',
              [
                { text: 'Annuler', style: 'cancel' },
                { 
                  text: 'Oui, supprimer', 
                  style: 'destructive',
                  onPress: () => {
                    Alert.alert('Information', 'Cette fonctionnalité sera disponible prochainement.');
                  }
                },
              ]
            );
          }
        },
      ]
    );
  };

  const showModal = (type) => {
    setModalType(type);
    setModalVisible(true);
  };

  const hideModal = () => {
    setModalVisible(false);
    setModalType('');
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
  };

  const handleProfileUpdate = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      const age = parseInt(profileForm.age);
      const weight = parseFloat(profileForm.weight);
      const height = parseFloat(profileForm.height);

      if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) {
        Alert.alert('Erreur', 'Le prénom et le nom sont obligatoires');
        return;
      }

      if (isNaN(age) || age < 1 || age > 120) {
        Alert.alert('Erreur', 'Veuillez entrer un âge valide (1-120)');
        return;
      }

      if (isNaN(weight) || weight < 20 || weight > 300) {
        Alert.alert('Erreur', 'Veuillez entrer un poids valide (20-300 kg)');
        return;
      }

      if (isNaN(height) || height < 100 || height > 250) {
        Alert.alert('Erreur', 'Veuillez entrer une taille valide (100-250 cm)');
        return;
      }

      const updateData = {
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        age: age,
        weight: weight,
        height: height,
        sex: profileForm.sex,
      };

      const response = await authAPI.updateProfile(updateData);

      if (response.data && response.data.user) {
        updateUser(response.data.user);
        Alert.alert('Succès', 'Profil mis à jour avec succès');
        hideModal();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de mettre à jour le profil'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      if (!passwordForm.current_password) {
        Alert.alert('Erreur', 'Veuillez entrer votre mot de passe actuel');
        return;
      }

      if (!passwordForm.new_password || passwordForm.new_password.length < 6) {
        Alert.alert('Erreur', 'Le nouveau mot de passe doit faire au moins 6 caractères');
        return;
      }

      if (passwordForm.new_password !== passwordForm.confirm_password) {
        Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
        return;
      }

      const response = await authAPI.updatePassword(passwordForm);

      if (response.data) {
        Alert.alert('Succès', 'Mot de passe mis à jour avec succès');
        hideModal();
      }
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.detail || 'Impossible de mettre à jour le mot de passe'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderModalContent = () => {
    switch (modalType) {
      case 'profile':
        return (
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>Modifier le profil</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.text }]}>Prénom</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.inputBackground,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                value={profileForm.first_name}
                onChangeText={(text) => setProfileForm({...profileForm, first_name: text})}
                placeholder="Votre prénom"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.text }]}>Nom</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.inputBackground,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                value={profileForm.last_name}
                onChangeText={(text) => setProfileForm({...profileForm, last_name: text})}
                placeholder="Votre nom"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.text }]}>Âge</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.inputBackground,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                value={profileForm.age}
                onChangeText={(text) => setProfileForm({...profileForm, age: text})}
                placeholder="Votre âge"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.text }]}>Poids (kg)</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.inputBackground,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                value={profileForm.weight}
                onChangeText={(text) => setProfileForm({...profileForm, weight: text})}
                placeholder="Votre poids"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.text }]}>Taille (cm)</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.inputBackground,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                value={profileForm.height}
                onChangeText={(text) => setProfileForm({...profileForm, height: text})}
                placeholder="Votre taille"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.text }]}>Sexe</Text>
              <View style={styles.sexSelector}>
                <TouchableOpacity
                  style={[
                    styles.sexOption,
                    profileForm.sex === 'male' && styles.sexOptionSelected,
                    { 
                      backgroundColor: profileForm.sex === 'male' ? COLORS.primary : COLORS.background,
                      borderColor: profileForm.sex === 'male' ? COLORS.primary : COLORS.border
                    }
                  ]}
                  onPress={() => setProfileForm({...profileForm, sex: 'male'})}
                >
                  <Text style={[
                    styles.sexOptionText,
                    profileForm.sex === 'male' && styles.sexOptionTextSelected,
                    { color: profileForm.sex === 'male' ? 'white' : COLORS.text }
                  ]}>
                    Masculin
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sexOption,
                    profileForm.sex === 'female' && styles.sexOptionSelected,
                    { 
                      backgroundColor: profileForm.sex === 'female' ? COLORS.primary : COLORS.background,
                      borderColor: profileForm.sex === 'female' ? COLORS.primary : COLORS.border
                    }
                  ]}
                  onPress={() => setProfileForm({...profileForm, sex: 'female'})}
                >
                  <Text style={[
                    styles.sexOptionText,
                    profileForm.sex === 'female' && styles.sexOptionTextSelected,
                    { color: profileForm.sex === 'female' ? 'white' : COLORS.text }
                  ]}>
                    Féminin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.cancelButton,
                  { 
                    backgroundColor: COLORS.background,
                    borderColor: COLORS.border 
                  }
                ]}
                onPress={hideModal}
                disabled={isLoading}
              >
                <Text style={[styles.cancelButtonText, { color: COLORS.text }]}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.saveButton,
                  { backgroundColor: COLORS.primary }
                ]}
                onPress={handleProfileUpdate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.saveButtonText}>Enregistrement...</Text>
                ) : (
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'password':
        return (
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>Changer le mot de passe</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.text }]}>Mot de passe actuel</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.inputBackground,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                value={passwordForm.current_password}
                onChangeText={(text) => setPasswordForm({...passwordForm, current_password: text})}
                placeholder="Votre mot de passe actuel"
                secureTextEntry
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.text }]}>Nouveau mot de passe</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.inputBackground,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                value={passwordForm.new_password}
                onChangeText={(text) => setPasswordForm({...passwordForm, new_password: text})}
                placeholder="Nouveau mot de passe"
                secureTextEntry
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={[styles.hint, { color: COLORS.textSecondary }]}>Minimum 6 caractères</Text>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: COLORS.text }]}>Confirmer le mot de passe</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: COLORS.inputBackground,
                  borderColor: COLORS.border,
                  color: COLORS.text 
                }]}
                value={passwordForm.confirm_password}
                onChangeText={(text) => setPasswordForm({...passwordForm, confirm_password: text})}
                placeholder="Confirmer le nouveau mot de passe"
                secureTextEntry
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.cancelButton,
                  { 
                    backgroundColor: COLORS.background,
                    borderColor: COLORS.border 
                  }
                ]}
                onPress={hideModal}
                disabled={isLoading}
              >
                <Text style={[styles.cancelButtonText, { color: COLORS.text }]}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.saveButton,
                  { backgroundColor: COLORS.primary }
                ]}
                onPress={handlePasswordUpdate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Text style={styles.saveButtonText}>Mise à jour...</Text>
                ) : (
                  <Text style={styles.saveButtonText}>Mettre à jour</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { backgroundColor: COLORS.card, borderBottomColor: COLORS.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Paramètres</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.textSecondary }]}>Apparence</Text>
          
          <View style={[styles.settingItem, { borderTopColor: COLORS.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons 
                name={isDarkMode ? "moon" : "moon-outline"} 
                size={22} 
                color={COLORS.primary} 
              />
              <Text style={[styles.settingLabel, { color: COLORS.text }]}>Mode sombre</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="white"
            />
          </View>
          
          <View style={[styles.settingItem, { borderTopColor: COLORS.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="language" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: COLORS.text }]}>Langue</Text>
            </View>
            <TouchableOpacity 
              style={styles.languageSelector}
              onPress={handleLanguageSelect}
            >
              <Text style={styles.languageFlag}>{getCurrentLanguage().flag}</Text>
              <Text style={[styles.languageText, { color: COLORS.textSecondary }]}>{getCurrentLanguage().name}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.textSecondary }]}>Compte</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderTopColor: COLORS.border }]}
            onPress={() => showModal('profile')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="person" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: COLORS.text }]}>Informations personnelles</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderTopColor: COLORS.border }]}
            onPress={() => showModal('password')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="lock-closed" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: COLORS.text }]}>Confidentialité et mot de passe</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderTopColor: COLORS.border }]}
            onPress={() => navigation.navigate('Help')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="help-circle" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: COLORS.text }]}>Centre d'aide</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.textSecondary }]}>Application</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderTopColor: COLORS.border }]}
            onPress={() => Alert.alert('À propos', 'BodyVision AI v1.0.0\n\nApplication d\'analyse corporelle intelligente utilisant l\'IA pour générer des plans fitness personnalisés.')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: COLORS.text }]}>À propos</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderTopColor: COLORS.border }]}
            onPress={() => navigation.navigate('Terms')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="document-text" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: COLORS.text }]}>Conditions d'utilisation</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderTopColor: COLORS.border }]}
            onPress={() => navigation.navigate('Privacy')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
              <Text style={[styles.settingLabel, { color: COLORS.text }]}>Politique de confidentialité</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.logoutButton,
              { 
                backgroundColor: COLORS.error + '15',
                borderColor: COLORS.error 
              }
            ]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={[styles.logoutButtonText, { color: COLORS.error }]}>Déconnexion</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.deleteButton,
              { 
                backgroundColor: COLORS.card,
                borderColor: COLORS.border 
              }
            ]}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.textSecondary} />
            <Text style={[styles.deleteButtonText, { color: COLORS.textSecondary }]}>Supprimer le compte</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.version, { color: COLORS.textSecondary }]}>BodyVision AI v1.0.0</Text>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={hideModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: COLORS.modalBackground }]}>
            {renderModalContent()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageFlag: {
    fontSize: 16,
  },
  languageText: {
    fontSize: 14,
  },
  actionsSection: {
    padding: 16,
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  logoutButton: {},
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {},
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  version: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  sexSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  sexOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  sexOptionSelected: {},
  sexOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sexOptionTextSelected: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {},
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;