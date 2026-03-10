import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { analysisAPI } from '../services/api';
import { getThemeColors, SHADOWS, RADIUS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';

// ── Barre de métrique avec label et valeur ──────────────────────
const MetricBar = ({ label, value, maxValue, unit, color, COLORS }) => {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={mbStyles.row}>
      <View style={mbStyles.labelRow}>
        <Text style={[mbStyles.label, { color: COLORS.textSecondary }]}>{label}</Text>
        <Text style={[mbStyles.val, { color: COLORS.text }]}>
          {value !== null && value !== undefined ? `${value}${unit}` : '—'}
        </Text>
      </View>
      <View style={[mbStyles.track, { backgroundColor: COLORS.border }]}>
        <Animated.View
          style={[
            mbStyles.fill,
            {
              backgroundColor: color,
              width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
};
const mbStyles = StyleSheet.create({
  row: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13 },
  val: { fontSize: 13, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

// ── Badge d'accomplissement ─────────────────────────────────────
const Badge = ({ icon, label, earned, COLORS }) => (
  <View style={[
    badgeStyles.wrap,
    {
      backgroundColor: earned ? COLORS.primary + '14' : COLORS.border + '40',
      borderColor: earned ? COLORS.primary + '30' : 'transparent',
    },
  ]}>
    <Text style={[badgeStyles.icon, { opacity: earned ? 1 : 0.3 }]}>{icon}</Text>
    <Text style={[badgeStyles.label, { color: earned ? COLORS.text : COLORS.textTertiary }]}>{label}</Text>
    {earned && (
      <View style={[badgeStyles.dot, { backgroundColor: COLORS.success }]} />
    )}
  </View>
);
const badgeStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    width: '30%',
    position: 'relative',
  },
  icon: { fontSize: 24, marginBottom: 4 },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  dot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4 },
});

// ── Composant principal ──────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, logout } = useAuth();

  const loadStats = async () => {
    try {
      const response = await analysisAPI.getUserStats();
      setStats(response.data);
    } catch (error) {
      Alert.alert(
        'Erreur',
        error.response?.status === 401 ? 'Session expirée.' : 'Impossible de charger vos statistiques.',
        error.response?.status === 401
          ? [{ text: 'OK', onPress: () => logout() }]
          : [{ text: 'Réessayer' }],
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadStats());
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => { setRefreshing(true); loadStats(); };

  // ── Données issues du backend (/user-stats) ──────────────────
  const totalAnalyses    = stats?.total_analyses    ?? 0;
  const enhancedAnalyses = stats?.enhanced_analyses ?? 0;
  const fitnessPlans     = stats?.fitness_plans     ?? 0;
  const enhancedPct      = stats?.enhanced_pct      ?? 0;
  const fitnessPct       = stats?.fitness_pct       ?? 0;
  const avgBmi           = stats?.last_bmi           ?? null;
  const avgFat           = stats?.last_body_fat      ?? null;
  const avgMuscle        = stats?.last_muscle        ?? null;
  const avgPosture       = stats?.last_posture_score ?? null;
  const bestPosture      = stats?.best_posture_score ?? null;
  const hasBodyMetrics   = avgBmi != null || avgFat != null || avgMuscle != null || avgPosture != null;

  const getBmiLabel = (bmi) => {
    if (!bmi) return null;
    if (bmi < 18.5) return { label: 'Insuffisance pondérale', color: COLORS.warning };
    if (bmi < 25)   return { label: 'Poids normal', color: COLORS.success };
    if (bmi < 30)   return { label: 'Surpoids', color: COLORS.warning };
    return { label: 'Obésité', color: COLORS.error };
  };
  const bmiInfo = getBmiLabel(avgBmi);

  // Badges
  const profileComplete = !!(user?.age && user?.height && user?.weight);
  const badges = [
    { icon: '🔬', label: 'Première\nanalyse',  earned: totalAnalyses >= 1 },
    { icon: '💪', label: 'Plan\nfitness',      earned: fitnessPlans >= 1 },
    { icon: '📋', label: 'Profil\ncomplet',    earned: profileComplete },
    { icon: '🏆', label: '5 analyses',          earned: totalAnalyses >= 5 },
    { icon: '⭐', label: '10 analyses',          earned: totalAnalyses >= 10 },
    { icon: '🎯', label: 'Expert\n(3 plans)',   earned: fitnessPlans >= 3 },
  ];

  const infoItems = [
    { icon: 'person-outline', label: 'Prénom', value: user?.first_name },
    { icon: 'person-outline', label: 'Nom', value: user?.last_name },
    { icon: 'mail-outline', label: 'Email', value: user?.email },
    user?.age    ? { icon: 'calendar-outline', label: 'Âge',    value: `${user.age} ans`  } : null,
    user?.height ? { icon: 'resize-outline',   label: 'Taille', value: `${user.height} cm`} : null,
    user?.weight ? { icon: 'scale-outline',    label: 'Poids',  value: `${user.weight} kg`} : null,
  ].filter(Boolean);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <LoadingSpinner message="Chargement des statistiques..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={[styles.headerCard, { backgroundColor: COLORS.primary }, SHADOWS.lg]}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.first_name} {user?.last_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="create-outline" size={14} color={COLORS.primary} />
            <Text style={[styles.editBtnText, { color: COLORS.primary }]}>Modifier le profil</Text>
          </TouchableOpacity>
        </View>

        {/* ── Empty state ── */}
        {totalAnalyses === 0 && (
          <View style={[styles.card, { backgroundColor: COLORS.card }, SHADOWS.sm, styles.emptyCard]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: COLORS.primary + '12' }]}>
              <Ionicons name="body-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: COLORS.text }]}>Aucune analyse pour l'instant</Text>
            <Text style={[styles.emptySubtitle, { color: COLORS.textSecondary }]}>
              Lancez votre première analyse corporelle pour voir vos statistiques ici.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => navigation.navigate('Camera')}
            >
              <Ionicons name="camera-outline" size={18} color="white" />
              <Text style={styles.emptyBtnText}>Démarrer une analyse</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Stats Grid ── */}
        {totalAnalyses > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Vue d'ensemble</Text>
            </View>
            <View style={styles.statsGrid}>
              {[
                { icon: 'analytics-outline',       color: COLORS.primary,   value: totalAnalyses,    label: 'Analyses\ntotales' },
                { icon: 'checkmark-circle-outline', color: COLORS.secondary, value: enhancedAnalyses, label: 'Analyses\ncomplètes' },
                { icon: 'barbell-outline',          color: COLORS.success,   value: fitnessPlans,     label: 'Plans\nfitness' },
                { icon: 'pulse-outline',            color: COLORS.accent,    value: bestPosture ?? '—', label: 'Meilleur\nscore posture' },
              ].map((s, i) => (
                <View key={i} style={[styles.statCard, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
                  <View style={[styles.statIconWrap, { backgroundColor: s.color + '14' }]}>
                    <Ionicons name={s.icon} size={22} color={s.color} />
                  </View>
                  <Text style={[styles.statNumber, { color: COLORS.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Métriques corporelles ── */}
        {totalAnalyses > 0 && hasBodyMetrics && (
          <View style={[styles.card, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="body-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: COLORS.text }]}>Métriques corporelles</Text>
              <Text style={[styles.cardSubNote, { color: COLORS.textTertiary }]}>dernière analyse</Text>
            </View>

            {avgBmi != null && (
              <View style={[styles.bmiHighlight, { backgroundColor: bmiInfo?.color + '12', borderColor: bmiInfo?.color + '30' }]}>
                <View>
                  <Text style={[styles.bmiValue, { color: bmiInfo?.color }]}>{avgBmi}</Text>
                  <Text style={[styles.bmiUnit, { color: COLORS.textSecondary }]}>IMC</Text>
                </View>
                <View style={[styles.bmiPill, { backgroundColor: bmiInfo?.color + '20' }]}>
                  <Text style={[styles.bmiPillText, { color: bmiInfo?.color }]}>{bmiInfo?.label}</Text>
                </View>
              </View>
            )}

            <View style={{ marginTop: 12 }}>
              {avgFat != null && (
                <MetricBar label="Masse grasse" value={avgFat} maxValue={40} unit="%" color={COLORS.error} COLORS={COLORS} />
              )}
              {avgMuscle != null && (
                <MetricBar label="Masse musculaire" value={avgMuscle} maxValue={60} unit="%" color={COLORS.success} COLORS={COLORS} />
              )}
              {avgPosture != null && (
                <MetricBar label="Score posture" value={avgPosture} maxValue={100} unit=" pts" color={COLORS.primary} COLORS={COLORS} />
              )}
            </View>

            {bestPosture != null && (
              <View style={[styles.bestRow, { borderTopColor: COLORS.border }]}>
                <Ionicons name="trophy-outline" size={15} color={COLORS.warning} />
                <Text style={[styles.bestText, { color: COLORS.textSecondary }]}>
                  {'Meilleur score posture : '}
                </Text>
                <Text style={[styles.bestText, { color: COLORS.warning, fontWeight: '700' }]}>
                  {`${bestPosture} pts`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Progression ── */}
        {totalAnalyses > 0 && (
          <View style={[styles.card, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="trending-up-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: COLORS.text }]}>Progression</Text>
            </View>
            {[
              { label: 'Analyses complètes',  pct: enhancedPct, color: COLORS.secondary, sub: `${enhancedAnalyses} / ${totalAnalyses}` },
              { label: 'Plans fitness créés', pct: fitnessPct,  color: COLORS.success,   sub: `${fitnessPlans} / ${totalAnalyses}` },
            ].map((p, i) => (
              <View key={i} style={styles.progressItem}>
                <View style={styles.progressRow}>
                  <View>
                    <Text style={[styles.progressLabel, { color: COLORS.text }]}>{p.label}</Text>
                    <Text style={[styles.progressSub, { color: COLORS.textTertiary }]}>{p.sub}</Text>
                  </View>
                  <Text style={[styles.progressPct, { color: p.color }]}>{p.pct}%</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: COLORS.border }]}>
                  <View style={[styles.progressFill, { width: `${p.pct}%`, backgroundColor: p.color }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Badges ── */}
        {totalAnalyses > 0 && (
          <View style={[styles.card, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="ribbon-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.cardTitle, { color: COLORS.text }]}>Accomplissements</Text>
              <Text style={[styles.cardSubNote, { color: COLORS.textTertiary }]}>
                {badges.filter(b => b.earned).length}/{badges.length}
              </Text>
            </View>
            <View style={styles.badgesGrid}>
              {badges.map((b, i) => (
                <Badge key={i} {...b} COLORS={COLORS} />
              ))}
            </View>
          </View>
        )}

        {/* ── Informations personnelles ── */}
        <View style={[styles.card, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="person-circle-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.cardTitle, { color: COLORS.text }]}>Informations personnelles</Text>
          </View>
          {infoItems.map((item, i) => (
            <View
              key={i}
              style={[
                styles.infoRow,
                i < infoItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.border },
              ]}
            >
              <View style={styles.infoLeft}>
                <View style={[styles.infoIconWrap, { backgroundColor: COLORS.primary + '10' }]}>
                  <Ionicons name={item.icon} size={16} color={COLORS.primary} />
                </View>
                <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>{item.label}</Text>
              </View>
              <Text style={[styles.infoValue, { color: COLORS.text }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.version, { color: COLORS.textTertiary }]}>BodyVision AI · v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  headerCard: { alignItems: 'center', paddingTop: 50, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  avatarRing: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 26, fontWeight: '800' },
  userName: { color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 3 },
  userEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 14 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  editBtnText: { fontSize: 13, fontWeight: '600' },

  // Section header
  sectionHeader: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, marginTop: 10, gap: 10 },
  statCard: { width: '47%', alignItems: 'center', padding: 18, borderRadius: 20, flexGrow: 1 },
  statIconWrap: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statNumber: { fontSize: 28, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center', lineHeight: 16 },

  // Cards
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  cardSubNote: { fontSize: 12 },

  // BMI highlight
  bmiHighlight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 4 },
  bmiValue: { fontSize: 32, fontWeight: '800' },
  bmiUnit: { fontSize: 12, marginTop: 2 },
  bmiPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  bmiPillText: { fontSize: 13, fontWeight: '700' },

  // Best row
  bestRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, marginTop: 4, borderTopWidth: 1 },
  bestText: { fontSize: 13 },

  // Progress
  progressItem: { marginBottom: 18 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600' },
  progressSub: { fontSize: 11, marginTop: 1 },
  progressPct: { fontSize: 15, fontWeight: '800' },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  // Badges
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },

  // Info
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },

  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: 36, marginTop: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 16 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14 },
  emptyBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  // Footer
  footer: { alignItems: 'center', padding: 20, paddingBottom: 40 },
  version: { fontSize: 12 },
});

export default ProfileScreen;