// SettingsScreen.js — Modern redesign
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, SafeAreaView, TextInput, Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { authAPI } from '../services/api';
import { getThemeColors, SHADOWS, RADIUS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = ({ navigation }) => {
  const { user, updateUser, logout, deleteAccount } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [language, setLanguage] = useState('fr');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '', last_name: user?.last_name || '',
    age: user?.age?.toString() || '', weight: user?.weight?.toString() || '',
    height: user?.height?.toString() || '', sex: user?.sex || 'male',
  });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [deletePassword, setDeletePassword] = useState('');

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' }, { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' }, { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  ];
  const COLORS = getThemeColors(isDarkMode);
  const getCurrentLanguage = () => languages.find(l => l.code === language) || languages[0];

  const handleLanguageSelect = () => {
    Alert.alert('Changer la langue', 'Sélectionnez votre langue préférée', [
      ...languages.map(l => ({ text: `${l.flag} ${l.name}`, onPress: () => { setLanguage(l.code); Alert.alert('Langue', `${l.name} sélectionné`); } })),
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleLogout = () => Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [{ text: 'Annuler', style: 'cancel' }, { text: 'Déconnexion', onPress: logout, style: 'destructive' }]);

  const handleDeleteAccount = () => Alert.alert('Supprimer le compte', 'Cette action est irréversible. Toutes vos données seront perdues.', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: () => {
      setDeletePassword('');
      showModal('delete');
    }},
  ]);

  const handleConfirmDeleteAccount = async () => {
    if (isLoading) return;
    if (!deletePassword) { Alert.alert('Erreur', 'Veuillez entrer votre mot de passe pour confirmer'); return; }
    try {
      setIsLoading(true);
      await deleteAccount(deletePassword);
      hideModal();
      Alert.alert('Compte supprimé', 'Votre compte et toutes vos données ont été supprimés.');
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail === 'Mot de passe incorrect') {
        Alert.alert('Erreur', 'Mot de passe incorrect');
      } else {
        Alert.alert('Erreur', detail || 'Impossible de supprimer le compte');
      }
    } finally { setIsLoading(false); }
  };

  const showModal = (type) => { setModalType(type); setModalVisible(true); };
  const hideModal = () => { setModalVisible(false); setModalType(''); setPasswordForm({ current_password: '', new_password: '', confirm_password: '' }); setDeletePassword(''); };

  const handleProfileUpdate = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const age = parseInt(profileForm.age); const weight = parseFloat(profileForm.weight); const height = parseFloat(profileForm.height);
      if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) { Alert.alert('Erreur', 'Le prénom et le nom sont obligatoires'); return; }
      if (isNaN(age) || age < 1 || age > 120) { Alert.alert('Erreur', 'Veuillez entrer un âge valide (1-120)'); return; }
      if (isNaN(weight) || weight < 20 || weight > 300) { Alert.alert('Erreur', 'Veuillez entrer un poids valide (20-300 kg)'); return; }
      if (isNaN(height) || height < 100 || height > 250) { Alert.alert('Erreur', 'Veuillez entrer une taille valide (100-250 cm)'); return; }
      const response = await authAPI.updateProfile({ first_name: profileForm.first_name.trim(), last_name: profileForm.last_name.trim(), age, weight, height, sex: profileForm.sex });
      if (response.data?.user) { updateUser(response.data.user); Alert.alert('Succès', 'Profil mis à jour avec succès'); hideModal(); }
    } catch (error) { Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de mettre à jour le profil'); } finally { setIsLoading(false); }
  };

  const handlePasswordUpdate = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      if (!passwordForm.current_password) { Alert.alert('Erreur', 'Veuillez entrer votre mot de passe actuel'); return; }
      if (!passwordForm.new_password || passwordForm.new_password.length < 6) { Alert.alert('Erreur', 'Le nouveau mot de passe doit faire au moins 6 caractères'); return; }
      if (passwordForm.new_password !== passwordForm.confirm_password) { Alert.alert('Erreur', 'Les mots de passe ne correspondent pas'); return; }
      const response = await authAPI.updatePassword(passwordForm);
      if (response.data) { Alert.alert('Succès', 'Mot de passe mis à jour avec succès'); hideModal(); }
    } catch (error) { Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de mettre à jour le mot de passe'); } finally { setIsLoading(false); }
  };

  const SettingRow = ({ icon, iconColor, label, right, onPress, last }) => (
    <TouchableOpacity style={[styles.settingRow, !last && { borderBottomWidth: 1, borderBottomColor: COLORS.border }]} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.6 : 1}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconWrap, { backgroundColor: (iconColor || COLORS.primary) + '12' }]}>
          <Ionicons name={icon} size={18} color={iconColor || COLORS.primary} />
        </View>
        <Text style={[styles.settingLabel, { color: COLORS.text }]}>{label}</Text>
      </View>
      {right}
    </TouchableOpacity>
  );

  const renderFormInput = (label, value, onChangeText, options = {}) => (
    <View style={styles.formGroup}>
      <Text style={[styles.formLabel, { color: COLORS.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.formInput, { backgroundColor: COLORS.inputBackground, borderColor: COLORS.border, color: COLORS.text }]}
        value={value} onChangeText={onChangeText} placeholderTextColor={COLORS.textSecondary} {...options}
      />
    </View>
  );

  const renderModalContent = () => {
    if (modalType === 'profile') return (
      <View style={styles.modalInner}>
        <Text style={[styles.modalTitle, { color: COLORS.text }]}>Modifier le profil</Text>
        {renderFormInput('Prénom', profileForm.first_name, t => setProfileForm({...profileForm, first_name: t}), { placeholder: 'Votre prénom' })}
        {renderFormInput('Nom', profileForm.last_name, t => setProfileForm({...profileForm, last_name: t}), { placeholder: 'Votre nom' })}
        {renderFormInput('Âge', profileForm.age, t => setProfileForm({...profileForm, age: t}), { placeholder: 'Votre âge', keyboardType: 'numeric' })}
        {renderFormInput('Poids (kg)', profileForm.weight, t => setProfileForm({...profileForm, weight: t}), { placeholder: 'Votre poids', keyboardType: 'numeric' })}
        {renderFormInput('Taille (cm)', profileForm.height, t => setProfileForm({...profileForm, height: t}), { placeholder: 'Votre taille', keyboardType: 'numeric' })}
        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: COLORS.textSecondary }]}>Sexe</Text>
          <View style={styles.sexRow}>
            {['male', 'female'].map(s => (
              <TouchableOpacity key={s} style={[styles.sexBtn, { backgroundColor: profileForm.sex === s ? COLORS.primary : COLORS.inputBackground, borderColor: profileForm.sex === s ? COLORS.primary : COLORS.border }]} onPress={() => setProfileForm({...profileForm, sex: s})}>
                <Ionicons name={s === 'male' ? 'male' : 'female'} size={16} color={profileForm.sex === s ? 'white' : COLORS.text} />
                <Text style={[styles.sexBtnText, { color: profileForm.sex === s ? 'white' : COLORS.text }]}>{s === 'male' ? 'Masculin' : 'Féminin'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.modalBtns}>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border }]} onPress={hideModal} disabled={isLoading}>
            <Text style={[styles.modalBtnText, { color: COLORS.text }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={handleProfileUpdate} disabled={isLoading}>
            <Text style={[styles.modalBtnText, { color: 'white' }]}>{isLoading ? 'Enregistrement...' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
    if (modalType === 'password') return (
      <View style={styles.modalInner}>
        <Text style={[styles.modalTitle, { color: COLORS.text }]}>Changer le mot de passe</Text>
        {renderFormInput('Mot de passe actuel', passwordForm.current_password, t => setPasswordForm({...passwordForm, current_password: t}), { placeholder: 'Mot de passe actuel', secureTextEntry: true })}
        {renderFormInput('Nouveau mot de passe', passwordForm.new_password, t => setPasswordForm({...passwordForm, new_password: t}), { placeholder: 'Minimum 6 caractères', secureTextEntry: true })}
        {renderFormInput('Confirmer', passwordForm.confirm_password, t => setPasswordForm({...passwordForm, confirm_password: t}), { placeholder: 'Confirmer le mot de passe', secureTextEntry: true })}
        <View style={styles.modalBtns}>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border }]} onPress={hideModal} disabled={isLoading}>
            <Text style={[styles.modalBtnText, { color: COLORS.text }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={handlePasswordUpdate} disabled={isLoading}>
            <Text style={[styles.modalBtnText, { color: 'white' }]}>{isLoading ? 'Mise à jour...' : 'Mettre à jour'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
    if (modalType === 'delete') return (
      <View style={styles.modalInner}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.error + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="warning" size={28} color={COLORS.error} />
          </View>
          <Text style={[styles.modalTitle, { color: COLORS.error, marginBottom: 4 }]}>Supprimer le compte</Text>
          <Text style={{ color: COLORS.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 18 }}>
            Cette action est irréversible. Toutes vos analyses, plans fitness, conversations et données personnelles seront définitivement supprimées.
          </Text>
        </View>
        {renderFormInput('Mot de passe', deletePassword, setDeletePassword, { placeholder: 'Entrez votre mot de passe pour confirmer', secureTextEntry: true, autoFocus: true })}
        <View style={styles.modalBtns}>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border }]} onPress={hideModal} disabled={isLoading}>
            <Text style={[styles.modalBtnText, { color: COLORS.text }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.error }]} onPress={handleConfirmDeleteAccount} disabled={isLoading}>
            <Text style={[styles.modalBtnText, { color: 'white' }]}>{isLoading ? 'Suppression...' : 'Supprimer'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: COLORS.background }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Paramètres</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Apparence */}
        <Text style={[styles.sectionLabel, { color: COLORS.textSecondary }]}>APPARENCE</Text>
        <View style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <SettingRow icon={isDarkMode ? "moon" : "moon-outline"} iconColor={COLORS.secondary} label="Mode sombre"
            right={<Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ false: COLORS.border, true: COLORS.primary }} thumbColor="white" />} />
          <SettingRow icon="language" iconColor={COLORS.accent} label="Langue" last onPress={handleLanguageSelect}
            right={<View style={styles.langRow}><Text style={styles.langFlag}>{getCurrentLanguage().flag}</Text><Text style={[styles.langName, { color: COLORS.textSecondary }]}>{getCurrentLanguage().name}</Text><Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} /></View>} />
        </View>

        {/* Compte */}
        <Text style={[styles.sectionLabel, { color: COLORS.textSecondary }]}>COMPTE</Text>
        <View style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <SettingRow icon="person" label="Informations personnelles" onPress={() => showModal('profile')} right={<Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />} />
          <SettingRow icon="lock-closed" iconColor={COLORS.warning} label="Mot de passe" onPress={() => showModal('password')} right={<Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />} />
          <SettingRow icon="help-circle" iconColor={COLORS.success} label="Centre d'aide" last onPress={() => navigation.navigate('Help')} right={<Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />} />
        </View>

        {/* Application */}
        <Text style={[styles.sectionLabel, { color: COLORS.textSecondary }]}>APPLICATION</Text>
        <View style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <SettingRow icon="information-circle" label="À propos" onPress={() => Alert.alert('À propos', 'BodyVision AI v1.0.0\n\nApplication d\'analyse corporelle intelligente.')} right={<Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />} />
          <SettingRow icon="document-text" iconColor={COLORS.accent} label="Conditions d'utilisation" onPress={() => navigation.navigate('Terms')} right={<Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />} />
          <SettingRow icon="shield-checkmark" iconColor={COLORS.success} label="Politique de confidentialité" last onPress={() => navigation.navigate('Privacy')} right={<Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />} />
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error + '10', borderColor: COLORS.error + '30' }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
            <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Déconnexion</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.card, borderColor: COLORS.border }]} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={18} color={COLORS.textSecondary} />
            <Text style={[styles.actionBtnText, { color: COLORS.textSecondary }]}>Supprimer le compte</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.version, { color: COLORS.textSecondary }]}>BodyVision AI v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={hideModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: COLORS.card }, SHADOWS.lg]}>
            {renderModalContent()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  content: { flex: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 24, marginTop: 24, marginBottom: 8 },
  section: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  langFlag: { fontSize: 16 },
  langName: { fontSize: 14 },
  actionsSection: { paddingHorizontal: 16, marginTop: 32, gap: 10 },
  actionBtn: { flexDirection: 'row', padding: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 15, fontWeight: '600' },
  footer: { alignItems: 'center', padding: 20, paddingBottom: 40 },
  version: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  modalInner: { padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  sexRow: { flexDirection: 'row', gap: 10 },
  sexBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  sexBtnText: { fontSize: 14, fontWeight: '600' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '700' },
});

export default SettingsScreen;