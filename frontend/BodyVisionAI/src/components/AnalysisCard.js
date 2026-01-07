import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../utils/constants';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const AnalysisCard = ({ analysis, onPress, compact = false }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const analysisData = analysis.analysis_data || analysis.analysis || {};
  const composition = analysisData.body_composition_complete || {};
  const basicMetrics = composition.basic_metrics || {};
  const postureAnalysis = analysisData.posture_analysis || {};
  const postureScore = postureAnalysis.posture_score || 0;
  
  const isEnhancedAnalysis = !!analysisData.body_composition_complete;
  const hasFitnessPlan = analysis.fitness_plan !== null && analysis.fitness_plan !== undefined;
  const isIntelligentPlan = analysis.plan_type === 'intelligent';
  
  const getPostureColor = (score) => {
    if (score >= 80) return COLORS.success;
    if (score >= 65) return COLORS.primary;
    if (score >= 50) return COLORS.warning;
    return COLORS.error;
  };
  
  const formatValue = (value, unit = '') => {
    if (!value || value === 'N/A') return '--';
    return `${value}${unit}`;
  };

  if (compact) {
    return (
      <TouchableOpacity 
        style={[styles.compactCard, { backgroundColor: COLORS.card }]} 
        onPress={onPress}
      >
        <View style={styles.compactHeader}>
          <View style={styles.compactDateContainer}>
            <Ionicons name="calendar" size={12} color={COLORS.textSecondary} />
            <Text style={[styles.compactDate, { color: COLORS.textSecondary }]}>
              {formatDate(analysis.created_at)}
            </Text>
          </View>
          
          <View style={[
            styles.compactStatusBadge,
            { backgroundColor: `${getPostureColor(postureScore)}15` }
          ]}>
            <Text style={[styles.compactStatusText, { color: getPostureColor(postureScore) }]}>
              {postureScore}/100
            </Text>
          </View>
        </View>
        
        <View style={styles.compactMetrics}>
          <View style={styles.compactMetricItem}>
            <Text style={[styles.compactMetricLabel, { color: COLORS.textSecondary }]}>IMC</Text>
            <Text style={[styles.compactMetricValue, { color: COLORS.text }]}>
              {formatValue(basicMetrics.bmi)}
            </Text>
          </View>
          
          <View style={[styles.compactMetricDivider, { backgroundColor: COLORS.border }]} />
          
          <View style={styles.compactMetricItem}>
            <Text style={[styles.compactMetricLabel, { color: COLORS.textSecondary }]}>Poids</Text>
            <Text style={[styles.compactMetricValue, { color: COLORS.text }]}>
              {formatValue(basicMetrics.weight)}
            </Text>
          </View>
          
          {isEnhancedAnalysis && (
            <>
              <View style={[styles.compactMetricDivider, { backgroundColor: COLORS.border }]} />
              <View style={styles.compactMetricItem}>
                <Text style={[styles.compactMetricLabel, { color: COLORS.textSecondary }]}>Masse Gr.</Text>
                <Text style={[styles.compactMetricValue, { color: COLORS.text }]}>
                  {formatValue(composition.fat_analysis?.body_fat_percentage)}
                </Text>
              </View>
            </>
          )}
        </View>
        
        <View style={[styles.compactFooter, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <View style={styles.compactTags}>
            {isEnhancedAnalysis && (
              <View style={[styles.compactTag, { backgroundColor: COLORS.success + '15' }]}>
                <Ionicons name="rocket" size={10} color={COLORS.success} />
                <Text style={[styles.compactTagText, { color: COLORS.success }]}>
                  Améliorée
                </Text>
              </View>
            )}
            
            {hasFitnessPlan && (
              <View style={[
                styles.compactTag,
                { backgroundColor: isIntelligentPlan ? COLORS.secondary + '15' : COLORS.primary + '15' }
              ]}>
                <Ionicons 
                  name={isIntelligentPlan ? "brain" : "fitness"} 
                  size={10} 
                  color={isIntelligentPlan ? COLORS.secondary : COLORS.primary} 
                />
                <Text style={[
                  styles.compactTagText, 
                  { color: isIntelligentPlan ? COLORS.secondary : COLORS.primary }
                ]}>
                  {isIntelligentPlan ? 'Intelligent' : 'Fitness'}
                </Text>
              </View>
            )}
          </View>
          
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: COLORS.card }]} 
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar" size={14} color={COLORS.textSecondary} />
          <Text style={[styles.date, { color: COLORS.textSecondary }]}>
            {formatDate(analysis.created_at)}
          </Text>
        </View>
        
        <View style={[
          styles.statusBadge,
          { backgroundColor: `${getPostureColor(postureScore)}20` }
        ]}>
          <Text style={[styles.statusText, { color: getPostureColor(postureScore) }]}>
            {postureScore}/100
          </Text>
        </View>
      </View>
      
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: COLORS.text }]}>
            Analyse #{analysis.id || analysis.analysis_id}
          </Text>
          {isEnhancedAnalysis && (
            <View style={[styles.enhancedBadge, { backgroundColor: COLORS.secondary }]}>
              <Ionicons name="rocket" size={12} color="white" />
              <Text style={styles.enhancedText}>Améliorée</Text>
            </View>
          )}
        </View>
        
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: COLORS.background }]}>
            <View style={styles.metricHeader}>
              <MaterialIcons name="scale" size={14} color={COLORS.primary} />
              <Text style={[styles.metricLabel, { color: COLORS.textSecondary }]}>Poids</Text>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.text }]}>
              {formatValue(basicMetrics.weight)}
            </Text>
          </View>
          
          <View style={[styles.metricCard, { backgroundColor: COLORS.background }]}>
            <View style={styles.metricHeader}>
              <MaterialIcons name="calculate" size={14} color={COLORS.primary} />
              <Text style={[styles.metricLabel, { color: COLORS.textSecondary }]}>IMC</Text>
            </View>
            <Text style={[styles.metricValue, { color: COLORS.text }]}>
              {formatValue(basicMetrics.bmi)}
            </Text>
          </View>
          
          {isEnhancedAnalysis && (
            <>
              <View style={[styles.metricCard, { backgroundColor: COLORS.background }]}>
                <View style={styles.metricHeader}>
                  <MaterialIcons name="monitor-weight" size={14} color={COLORS.warning} />
                  <Text style={[styles.metricLabel, { color: COLORS.textSecondary }]}>Masse Gr.</Text>
                </View>
                <Text style={[styles.metricValue, { color: COLORS.text }]}>
                  {formatValue(composition.fat_analysis?.body_fat_percentage, '%')}
                </Text>
              </View>
              
              <View style={[styles.metricCard, { backgroundColor: COLORS.background }]}>
                <View style={styles.metricHeader}>
                  <Ionicons name="fitness" size={14} color={COLORS.success} />
                  <Text style={[styles.metricLabel, { color: COLORS.textSecondary }]}>Muscle</Text>
                </View>
                <Text style={[styles.metricValue, { color: COLORS.text }]}>
                  {formatValue(composition.muscle_analysis?.muscle_percentage, '%')}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
      
      <View style={[styles.footer, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
        <View style={styles.features}>
          {hasFitnessPlan && (
            <View style={[
              styles.featureBadge,
              { backgroundColor: isIntelligentPlan ? COLORS.secondary + '20' : COLORS.primary + '20' }
            ]}>
              <Ionicons 
                name={isIntelligentPlan ? "brain" : "fitness"} 
                size={12} 
                color={isIntelligentPlan ? COLORS.secondary : COLORS.primary} 
              />
              <Text style={[
                styles.featureText, 
                { color: isIntelligentPlan ? COLORS.secondary : COLORS.primary }
              ]}>
                {isIntelligentPlan ? 'Plan intelligent' : 'Fitness'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.viewDetailsContainer}>
          <Text style={[styles.viewDetails, { color: COLORS.primary }]}>Détails</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  compactCard: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  compactDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactDate: {
    fontSize: 12,
  },
  compactStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  compactStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  compactMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  compactMetricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  compactMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  compactMetricDivider: {
    width: 1,
    height: 20,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  compactTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  compactTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  compactTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
  },
  enhancedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8,
  },
  enhancedText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  features: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  featureText: {
    fontSize: 10,
    fontWeight: '600',
  },
  viewDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetails: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AnalysisCard;