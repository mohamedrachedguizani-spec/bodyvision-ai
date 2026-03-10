// HomeScreen.js — Modern redesign
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  SafeAreaView,
  Animated,
  PanResponder,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { analysisAPI } from '../services/api';
import { getThemeColors, SHADOWS, RADIUS } from '../utils/constants';
import AnalysisCard from '../components/AnalysisCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';

const SwipeableAnalysisCard = ({ analysis, onPress, onDelete }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  const translateX = useRef(new Animated.Value(0)).current;
  const [isSwiped, setIsSwiped] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy * 2),
      onPanResponderMove: (_, gs) => { if (gs.dx < 0) translateX.setValue(Math.max(gs.dx, -80)); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -60 || gs.vx < -0.5) {
          Animated.spring(translateX, { toValue: -80, useNativeDriver: true, tension: 60, friction: 8 }).start();
          setIsSwiped(true);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }).start();
          setIsSwiped(false);
        }
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 60, friction: 8 }).start();
    setIsSwiped(false);
  };

  return (
    <View style={[styles.swipeableContainer, { backgroundColor: COLORS.background }]}>
      <View style={styles.deleteAction}>
        <TouchableOpacity style={styles.deleteButton} onPress={() => { resetPosition(); onDelete(); }} activeOpacity={0.8}>
          <Ionicons name="trash" size={20} color="white" />
          <Text style={styles.deleteText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.swipeableCard, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity onPress={() => isSwiped ? resetPosition() : onPress()} activeOpacity={0.7} style={styles.cardTouchable}>
          <AnalysisCard analysis={analysis} onPress={onPress} compact={true} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  const [analyses, setAnalyses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, logout } = useAuth();
  const [showDataAlert, setShowDataAlert] = useState(true);

  const loadAnalyses = async () => {
    try {
      const response = await analysisAPI.getUserAnalyses();
      const formattedAnalyses = response.data.map(analysis => {
        const createImageUrl = (pathOrFilename) => {
          if (!pathOrFilename) return null;
          if (pathOrFilename.startsWith('http')) return pathOrFilename;
          if (pathOrFilename.includes('/')) {
            return `http://192.168.1.114:8000/uploads/${pathOrFilename.split('/').pop()}`;
          }
          return `http://192.168.1.114:8000/uploads/${pathOrFilename}`;
        };
        const imageUrl = createImageUrl(analysis.image_path);
        let multiViewImages = {};
        if (analysis.multi_view_images) {
          Object.entries(analysis.multi_view_images).forEach(([type, path]) => {
            if (path) multiViewImages[type] = createImageUrl(path);
          });
        }
        return { id: analysis.id, analysis_id: analysis.id, image_url: imageUrl, image_path: analysis.image_path, multi_view_images: multiViewImages, analysis_data: analysis.analysis_data, fitness_plan: analysis.fitness_plan, created_at: analysis.created_at, has_fitness_plan: analysis.has_fitness_plan || false, plan_type: analysis.plan_type || 'basic' };
      });
      setAnalyses(formattedAnalyses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      Alert.alert('Erreur', error.response?.status === 401 ? 'Session expirée.' : 'Impossible de charger vos analyses.',
        error.response?.status === 401 ? [{ text: 'OK', onPress: () => logout() }] : [{ text: 'Réessayer' }]);
    } finally { setIsLoading(false); setRefreshing(false); }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadAnalyses());
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => { setRefreshing(true); loadAnalyses(); };

  const handleNewAnalysis = () => navigation.navigate('Camera');

  const handleAnalysisPress = async (analysis) => {
    try {
      if (analysis.analysis_data && analysis.fitness_plan !== undefined) {
        navigation.navigate('Analysis', { analysis: { id: analysis.id, analysis_id: analysis.id, image_url: analysis.image_url, image_path: analysis.image_path, multi_view_images: analysis.multi_view_images, analysis: analysis.analysis_data, fitness_plan: analysis.fitness_plan, plan_type: analysis.plan_type, created_at: analysis.created_at } });
      } else {
        const response = await analysisAPI.getAnalysisDetails(analysis.id);
        const d = response.data;
        navigation.navigate('Analysis', { analysis: { id: d.id, analysis_id: d.id, image_url: d.image_path ? (d.image_path.startsWith('/') ? `http://192.168.1.114:8000${d.image_path}` : d.image_path) : null, multi_view_images: d.multi_view_images, analysis: d.analysis_data, fitness_plan: d.fitness_plan, plan_type: d.plan_type, created_at: d.created_at } });
      }
    } catch (error) { Alert.alert('Erreur', 'Impossible de charger les détails'); }
  };

  const handleDeleteAnalysis = async (analysisId) => {
    Alert.alert('Supprimer l\'analyse', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await analysisAPI.deleteAnalysis(analysisId); setAnalyses(analyses.filter(a => a.id !== analysisId)); } catch (error) { Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de supprimer'); }
      }},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', onPress: logout, style: 'destructive' },
    ]);
  };

  if (isLoading) return <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}><LoadingSpinner message="Chargement de vos analyses..." /></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
        <TouchableOpacity style={[styles.avatarWrap, { backgroundColor: COLORS.primary + '15' }]} onPress={() => navigation.navigate('Profile')}>
          <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.avatarText}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.greeting, { color: COLORS.textSecondary }]}>Bonjour,</Text>
          <Text style={[styles.userName, { color: COLORS.text }]}>{user?.first_name} {user?.last_name}</Text>
        </View>
        <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: COLORS.background }]} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* CTA Banner */}
      <View style={[styles.ctaBanner, { backgroundColor: COLORS.primary }, SHADOWS.lg]}>
        <View style={styles.ctaContent}>
          <View style={styles.ctaIcon}>
            <Ionicons name="body" size={28} color="white" />
          </View>
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>Analyse Corporelle IA</Text>
            <Text style={styles.ctaSubtitle}>Composition corporelle, posture & plan fitness personnalisé</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.ctaButton} onPress={handleNewAnalysis} activeOpacity={0.9}>
          <Ionicons name="camera" size={18} color={COLORS.primary} />
          <Text style={[styles.ctaButtonText, { color: COLORS.primary }]}>Nouvelle Analyse</Text>
        </TouchableOpacity>
      </View>

      {/* Alerte données à jour */}
      {analyses.length > 0 && showDataAlert && (
        <View style={[styles.dataAlertBanner, { backgroundColor: COLORS.warning + '15', borderColor: COLORS.warning + '30' }]}>
          <View style={styles.dataAlertContent}>
            <Ionicons name="alert-circle" size={22} color={COLORS.warning} />
            <View style={styles.dataAlertTextWrap}>
              <Text style={[styles.dataAlertTitle, { color: COLORS.text }]}>Données à jour ?</Text>
              <Text style={[styles.dataAlertDesc, { color: COLORS.textSecondary }]}>
                Vérifiez que votre poids ({user?.weight} kg), taille ({user?.height} cm) et âge ({user?.age} ans) sont actuels pour des analyses précises.
              </Text>
            </View>
          </View>
          <View style={styles.dataAlertActions}>
            <TouchableOpacity style={[styles.dataAlertBtn, { backgroundColor: COLORS.primary }]} onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="create-outline" size={14} color="white" />
              <Text style={styles.dataAlertBtnText}>Mettre à jour</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dataAlertDismiss, { backgroundColor: COLORS.textSecondary + '15' }]} onPress={() => setShowDataAlert(false)}>
              <Text style={[styles.dataAlertDismissText, { color: COLORS.textSecondary }]}>C'est bon</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Historique */}
      <View style={styles.historySection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Historique</Text>
          <View style={[styles.countBadge, { backgroundColor: COLORS.primary + '15' }]}>
            <Text style={[styles.countText, { color: COLORS.primary }]}>{analyses.length}</Text>
          </View>
        </View>
        {analyses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: COLORS.primary + '10' }]}>
              <Ionicons name="analytics-outline" size={48} color={COLORS.primary + '40'} />
            </View>
            <Text style={[styles.emptyTitle, { color: COLORS.text }]}>Aucune analyse</Text>
            <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>Commencez votre première analyse corporelle</Text>
          </View>
        ) : (
          <ScrollView style={styles.analysesList} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
            {analyses.map((analysis) => (
              <SwipeableAnalysisCard key={analysis.id} analysis={analysis} onPress={() => handleAnalysisPress(analysis)} onDelete={() => handleDeleteAnalysis(analysis.id)} />
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: COLORS.card }, SHADOWS.md]}>
        <TouchableOpacity style={styles.bottomAction} onPress={() => navigation.navigate('Profile')}>
          <View style={[styles.bottomIconWrap, { backgroundColor: COLORS.primary + '10' }]}>
            <Ionicons name="person" size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.bottomLabel, { color: COLORS.primary }]}>Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomAction} onPress={() => navigation.navigate('CoachVirtuel')}>
          <View style={[styles.bottomIconWrap, { backgroundColor: COLORS.secondary + '10' }]}>
            <Ionicons name="chatbubbles" size={20} color={COLORS.secondary} />
          </View>
          <Text style={[styles.bottomLabel, { color: COLORS.secondary }]}>Coach</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomAction} onPress={handleLogout}>
          <View style={[styles.bottomIconWrap, { backgroundColor: COLORS.error + '10' }]}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          </View>
          <Text style={[styles.bottomLabel, { color: COLORS.error }]}>Quitter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  avatarWrap: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 16, fontWeight: '700' },
  headerInfo: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 13 },
  userName: { fontSize: 18, fontWeight: '700' },
  settingsBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  ctaBanner: { marginHorizontal: 20, marginTop: 16, borderRadius: 22, padding: 22, overflow: 'hidden' },
  ctaContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 14 },
  ctaIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 18, fontWeight: '800', color: 'white', marginBottom: 4 },
  ctaSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  ctaButton: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 13, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 8 },
  ctaButtonText: { fontSize: 15, fontWeight: '700' },
  dataAlertBanner: { marginHorizontal: 20, marginTop: 14, borderRadius: 16, padding: 16, borderWidth: 1 },
  dataAlertContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  dataAlertTextWrap: { flex: 1 },
  dataAlertTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  dataAlertDesc: { fontSize: 13, lineHeight: 19 },
  dataAlertActions: { flexDirection: 'row', gap: 10 },
  dataAlertBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  dataAlertBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  dataAlertDismiss: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  dataAlertDismissText: { fontSize: 13, fontWeight: '600' },
  historySection: { flex: 1, paddingHorizontal: 20, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  countText: { fontSize: 13, fontWeight: '700' },
  analysesList: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bottomAction: { alignItems: 'center', gap: 4 },
  bottomIconWrap: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  bottomLabel: { fontSize: 11, fontWeight: '600' },
  swipeableContainer: { position: 'relative', marginVertical: 4, minHeight: 92 },
  deleteAction: { position: 'absolute', right: 0, top: 8, bottom: 8, width: 80, borderTopRightRadius: 14, borderBottomRightRadius: 14, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  deleteButton: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  deleteText: { color: 'white', fontSize: 11, fontWeight: '600', marginTop: 3 },
  swipeableCard: { position: 'relative', zIndex: 1, backgroundColor: 'transparent' },
  cardTouchable: { flex: 1 },
});

export default HomeScreen;