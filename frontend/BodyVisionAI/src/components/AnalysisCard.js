import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors, SHADOWS, RADIUS } from '../utils/constants';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const AnalysisCard = ({ analysis, onPress, compact = false }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const analysisData = analysis.analysis_data || analysis.analysis || {};
  const composition = analysisData.body_composition_complete || {};
  const basicMetrics = composition.basic_metrics || {};
  const postureScore = analysisData.posture_analysis?.posture_score || 0;
  const isEnhancedAnalysis = !!analysisData.body_composition_complete;
  const hasFitnessPlan = analysis.fitness_plan !== null && analysis.fitness_plan !== undefined;
  const isIntelligentPlan = analysis.plan_type === 'intelligent';

  const getPostureColor = (score) => {
    if (score >= 80) return COLORS.success;
    if (score >= 65) return COLORS.primary;
    if (score >= 50) return COLORS.warning;
    return COLORS.error;
  };

  const formatValue = (value) => (!value || value === 'N/A') ? '--' : `${value}`;
  const scoreColor = getPostureColor(postureScore);

  if (compact) {
    return (
      <View style={[styles.compactCard, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
        {/* Top row: date + score */}
        <View style={styles.compactTop}>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
            <Text style={[styles.compactDate, { color: COLORS.textSecondary }]}>{formatDate(analysis.created_at)}</Text>
          </View>
          <View style={[styles.scorePill, { backgroundColor: scoreColor + '14' }]}>
            <Ionicons name="shield-checkmark" size={11} color={scoreColor} />
            <Text style={[styles.scoreText, { color: scoreColor }]}>{postureScore}/100</Text>
          </View>
        </View>

        {/* Metrics row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: COLORS.textSecondary }]}>IMC</Text>
            <Text style={[styles.metricVal, { color: COLORS.text }]}>{formatValue(basicMetrics.bmi)}</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: COLORS.border }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: COLORS.textSecondary }]}>Poids</Text>
            <Text style={[styles.metricVal, { color: COLORS.text }]}>{formatValue(basicMetrics.weight)}</Text>
          </View>
          {isEnhancedAnalysis && (
            <>
              <View style={[styles.metricDivider, { backgroundColor: COLORS.border }]} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: COLORS.textSecondary }]}>Masse Gr.</Text>
                <Text style={[styles.metricVal, { color: COLORS.text }]}>{formatValue(composition.fat_analysis?.body_fat_percentage)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Tags + arrow */}
        <View style={styles.compactBottom}>
          <View style={styles.tags}>
            {isEnhancedAnalysis && (
              <View style={[styles.tag, { backgroundColor: COLORS.success + '12' }]}>
                <Ionicons name="rocket" size={10} color={COLORS.success} />
                <Text style={[styles.tagText, { color: COLORS.success }]}>Améliorée</Text>
              </View>
            )}
            {hasFitnessPlan && (
              <View style={[styles.tag, { backgroundColor: (isIntelligentPlan ? COLORS.secondary : COLORS.primary) + '12' }]}>
                <Ionicons name={isIntelligentPlan ? "bulb" : "fitness"} size={10} color={isIntelligentPlan ? COLORS.secondary : COLORS.primary} />
                <Text style={[styles.tagText, { color: isIntelligentPlan ? COLORS.secondary : COLORS.primary }]}>{isIntelligentPlan ? 'Intelligent' : 'Fitness'}</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      </View>
    );
  }

  // Full card
  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: COLORS.card }, SHADOWS.md]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
          <Text style={[styles.date, { color: COLORS.textSecondary }]}>{formatDate(analysis.created_at)}</Text>
        </View>
        <View style={[styles.scorePill, { backgroundColor: scoreColor + '18' }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{postureScore}/100</Text>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: COLORS.text }]}>Analyse #{analysis.id || analysis.analysis_id}</Text>
        {isEnhancedAnalysis && (
          <View style={[styles.enhancedBadge, { backgroundColor: COLORS.secondary }]}>
            <Ionicons name="rocket" size={11} color="white" />
            <Text style={styles.enhancedText}>Améliorée</Text>
          </View>
        )}
      </View>

      <View style={styles.metricsGrid}>
        {[
          { icon: 'scale', lib: 'MaterialIcons', color: COLORS.primary, label: 'Poids', value: formatValue(basicMetrics.weight) },
          { icon: 'calculate', lib: 'MaterialIcons', color: COLORS.primary, label: 'IMC', value: formatValue(basicMetrics.bmi) },
          ...(isEnhancedAnalysis ? [
            { icon: 'monitor-weight', lib: 'MaterialIcons', color: COLORS.warning, label: 'Masse Gr.', value: formatValue(composition.fat_analysis?.body_fat_percentage) + '%' },
            { icon: 'fitness', lib: 'Ionicons', color: COLORS.success, label: 'Muscle', value: formatValue(composition.muscle_analysis?.muscle_percentage) + '%' },
          ] : []),
        ].map((m, i) => (
          <View key={i} style={[styles.metricCard, { backgroundColor: COLORS.background }]}>
            <View style={styles.metricHeader}>
              {m.lib === 'MaterialIcons' ? <MaterialIcons name={m.icon} size={14} color={m.color} /> : <Ionicons name={m.icon} size={14} color={m.color} />}
              <Text style={[styles.metricCardLabel, { color: COLORS.textSecondary }]}>{m.label}</Text>
            </View>
            <Text style={[styles.metricCardValue, { color: COLORS.text }]}>{m.value}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.cardFooter, { borderTopColor: COLORS.border }]}>
        <View style={styles.tags}>
          {hasFitnessPlan && (
            <View style={[styles.tag, { backgroundColor: (isIntelligentPlan ? COLORS.secondary : COLORS.primary) + '14' }]}>
              <Ionicons name={isIntelligentPlan ? "bulb" : "fitness"} size={12} color={isIntelligentPlan ? COLORS.secondary : COLORS.primary} />
              <Text style={[styles.tagText, { color: isIntelligentPlan ? COLORS.secondary : COLORS.primary }]}>{isIntelligentPlan ? 'Plan intelligent' : 'Fitness'}</Text>
            </View>
          )}
        </View>
        <View style={styles.detailsLink}>
          <Text style={[styles.detailsText, { color: COLORS.primary }]}>Détails</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Compact
  compactCard: { borderRadius: 16, padding: 14, marginVertical: 4 },
  compactTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  compactDate: { fontSize: 12 },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  scoreText: { fontSize: 11, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  metricItem: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 11, marginBottom: 2 },
  metricVal: { fontSize: 16, fontWeight: '700' },
  metricDivider: { width: 1, height: 22 },
  compactBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)' },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, gap: 3 },
  tagText: { fontSize: 10, fontWeight: '600' },
  // Full card
  card: { borderRadius: 20, padding: 18, marginVertical: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  date: { fontSize: 13 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '800', flex: 1 },
  enhancedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4, marginLeft: 8 },
  enhancedText: { fontSize: 11, color: 'white', fontWeight: '600' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricCard: { width: '47%', borderRadius: 14, padding: 12, flexGrow: 1 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metricCardLabel: { fontSize: 12, fontWeight: '600' },
  metricCardValue: { fontSize: 18, fontWeight: '800' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailsText: { fontSize: 14, fontWeight: '600' },
});

export default AnalysisCard;