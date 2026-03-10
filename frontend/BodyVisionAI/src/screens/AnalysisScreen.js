import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { analysisAPI } from '../services/api';
import { getThemeColors, SHADOWS, getThemeShadows } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const AnalysisScreen = ({ route, navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  // Reusable dark mode card border style
  const cardBorder = isDarkMode ? { borderWidth: 1, borderColor: COLORS.borderLight } : {};
  const dmShadow = getThemeShadows(isDarkMode);
  // Dynamic section style with dark mode borders applied globally
  const sectionDark = isDarkMode ? { borderWidth: 1, borderColor: COLORS.borderLight, ...dmShadow.sm } : {};

  // Override styles.section to include dark mode borders
  const section = [styles.section, sectionDark];
  
  const { analysis: initialAnalysis } = route.params;
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [fitnessPlan, setFitnessPlan] = useState(initialAnalysis.fitness_plan || null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [activePlanSection, setActivePlanSection] = useState('overview');

  useEffect(() => {
    if (!analysis.analysis && analysis.analysis_data) {
      setAnalysis(prev => ({
        ...prev,
        analysis: prev.analysis_data
      }));
    } else if (!analysis.analysis && !analysis.analysis_data) {
      console.error('Analysis data is completely undefined:', analysis);
      Alert.alert('Erreur', 'Données d\'analyse corrompues');
      navigation.goBack();
    }
  }, [analysis]);

  const generateFitnessPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      console.log('🎯 Generating intelligent fitness plan with analysis data...');
      
      const requestData = {
        analysis_id: analysis.id || analysis.analysis_id,
        ...(analysis.analysis || analysis.analysis_data)
      };
      
      const response = await analysisAPI.generateIntelligentFitnessPlan(requestData);
      
      setFitnessPlan(response.data.fitness_plan);
      setActiveTab('fitness');
      
      setAnalysis(prev => ({
        ...prev,
        fitness_plan: response.data.fitness_plan,
        plan_type: 'intelligent'
      }));
      
      Alert.alert('Succès', 'Plan fitness intelligent généré et sauvegardé avec succès!');
    } catch (error) {
      console.error('Fitness plan error:', error);
      Alert.alert('Erreur', 'Impossible de générer le plan fitness intelligent');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (analysis.id || analysis.analysis_id) {
        const analysisId = analysis.id || analysis.analysis_id;
        const response = await analysisAPI.getAnalysisDetails(analysisId);
        setAnalysis(prev => ({
          ...prev,
          analysis: response.data.analysis_data,
          fitness_plan: response.data.fitness_plan,
          plan_type: response.data.plan_type,
          multi_view_images: response.data.multi_view_images
        }));
        if (response.data.fitness_plan) {
          setFitnessPlan(response.data.fitness_plan);
        }
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: COLORS.card, ...cardBorder, borderBottomWidth: isDarkMode ? 1 : 0, borderBottomColor: COLORS.borderLight }, dmShadow.sm]}>
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: isDarkMode ? COLORS.surface : COLORS.background }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={20} color={COLORS.text} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Analyse Corporelle</Text>
        <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>
          ID: #{analysis.id || analysis.analysis_id || 'N/A'}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.shareButton, { backgroundColor: COLORS.primary + '12' }]}
        onPress={() => Alert.alert('Partager', 'Fonctionnalité à venir')}
      >
        <Ionicons name="share-social" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderMediaSection = () => {
    const imageUrls = analysis.multi_view_images || analysis.image_urls || {};
    const hasMultipleImages = Object.keys(imageUrls).length > 1;
    const multiViewData = analysis.analysis?.multi_view_data || {};
    
    return (
      <View style={[section, { backgroundColor: COLORS.card }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: COLORS.primary + '15' }]}>
            <Ionicons name="images" size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>📷 Photos d'Analyse</Text>
          {hasMultipleImages && (
            <View style={[styles.multiViewBadge, { backgroundColor: COLORS.secondary + '20' }]}>
              <Text style={[styles.multiViewBadgeText, { color: COLORS.secondary }]}>Multi-vues</Text>
            </View>
          )}
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.mediaScrollView}
        >
          {Object.entries(imageUrls).map(([type, path], index) => {
            const url = typeof path === 'string' ? path : '';
            const imageUrl = url.startsWith('/') ? `http://192.168.1.114:8000${url}` : url;
            
            return (
              <View key={index} style={styles.mediaCard}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
                <Text style={[styles.mediaLabel, { color: COLORS.textSecondary }]}>
                  {type === 'front' ? 'Frontale' : 
                   type === 'back' ? 'Postérieure' : 
                   type === 'side' ? 'Latérale' : type}
                </Text>
                {multiViewData.posture_scores && multiViewData.posture_scores[type] > 0 && (
                  <View style={styles.viewScoreBadge}>
                    <Text style={styles.viewScoreText}>
                      {multiViewData.posture_scores[type]} pts
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
        
        {hasMultipleImages && (
          <View style={styles.multiViewInfoContainer}>
            <Text style={[styles.multiViewInfo, { color: COLORS.success }]}>
              ✅ Analyse multi-vues activée ({Object.keys(imageUrls).length} vues)
            </Text>
            {multiViewData.analysis_method && (
              <Text style={[styles.analysisMethod, { color: COLORS.textSecondary }]}>
                {multiViewData.analysis_method}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderPostureAnalysis = () => {
    const postureAnalysis = analysis.analysis?.posture_analysis || {};
    const postureScore = postureAnalysis.posture_score || 0;
    const postureGrade = postureAnalysis.posture_grade || 'À évaluer';
    const multiViewData = analysis.analysis?.multi_view_data || {};
    const viewsAnalyzed = postureAnalysis.views_analyzed || multiViewData.available_views || ['front'];
    
    let scoreColor = COLORS.success;
    if (postureScore < 60) scoreColor = COLORS.error;
    else if (postureScore < 75) scoreColor = COLORS.warning;
    
    return (
      <View style={[section, { backgroundColor: COLORS.card }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: COLORS.primary + '15' }]}>
            <MaterialIcons name="straighten" size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>📊 Analyse Posturale Avancée</Text>
          <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}20` }]}>
            <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>
              {postureScore}/100
            </Text>
          </View>
        </View>
        
        {viewsAnalyzed && viewsAnalyzed.length > 1 && (
          <View style={[styles.multiViewIndicator, { backgroundColor: COLORS.secondary + '0A' }]}>
            <Ionicons name="eye" size={16} color={COLORS.secondary} />
            <Text style={[styles.multiViewIndicatorText, { color: COLORS.secondary }]}>
              Basé sur {viewsAnalyzed.length} vues: {viewsAnalyzed.join(', ')}
            </Text>
          </View>
        )}
        
        <View style={styles.gradeContainer}>
          <Text style={[styles.gradeLabel, { color: COLORS.textSecondary }]}>Grade:</Text>
          <View style={[styles.gradeBadge, { backgroundColor: `${scoreColor}20` }]}>
            <Text style={[styles.gradeText, { color: scoreColor }]}>
              {postureGrade}
            </Text>
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <View style={styles.scoreRing}>
            <View style={[styles.scoreRingInner, { backgroundColor: COLORS.background }]}>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>
                {postureScore}
              </Text>
              <Text style={[styles.scoreLabel, { color: COLORS.textSecondary }]}>Score</Text>
            </View>
            <View style={[
              styles.scoreProgress, 
              { 
                transform: [{ rotate: `${(postureScore / 100) * 360}deg` }],
                borderTopColor: scoreColor,
                borderRightColor: scoreColor
              }
            ]} />
          </View>
        </View>
        
        {postureAnalysis.confidence && (
          <View style={[styles.confidenceContainer, { backgroundColor: COLORS.success + '0A' }]}>
            <Ionicons 
              name={postureAnalysis.confidence === 'Élevée' ? 'shield-checkmark' : 'alert-circle'} 
              size={16} 
              color={postureAnalysis.confidence === 'Élevée' ? COLORS.success : COLORS.warning} 
            />
            <Text style={[styles.confidenceText, { color: COLORS.success }]}>
              Confiance: {postureAnalysis.confidence}
            </Text>
          </View>
        )}
        
        {postureAnalysis.detailed_analysis && (
          <View style={[styles.detailedAnalysis, { backgroundColor: COLORS.primary + '0A' }]}>
            <Text style={[styles.detailedTitle, { color: COLORS.primary }]}>Analyse Détaillée:</Text>
            {Object.entries(postureAnalysis.detailed_analysis).map(([key, value], index) => {
              if (typeof value === 'string' && !key.includes('raw_score')) {
                return (
                  <View key={index} style={styles.detailRow}>
                    <Text style={[styles.detailKey, { color: COLORS.textSecondary }]}>{key.replace('_', ' ')}:</Text>
                    <Text style={[styles.detailValue, { color: COLORS.text }]}>{value}</Text>
                  </View>
                );
              }
              return null;
            })}
          </View>
        )}

        {postureAnalysis.detected_issues && postureAnalysis.detected_issues.length > 0 && (
          <View style={[styles.issuesContainer, { backgroundColor: COLORS.error + '0A' }]}>
            <View style={styles.issuesHeader}>
              <Ionicons name="warning" size={18} color={COLORS.error} />
              <Text style={[styles.issuesTitle, { color: COLORS.error }]}>Points d'amélioration détectés</Text>
            </View>
            {postureAnalysis.detected_issues.map((issue, index) => {
              const issueObj = typeof issue === 'string' ? { issue } : issue;
              const detectedIn = issueObj.detected_in || "vue frontale";
              
              return (
                <View key={index} style={[styles.issueCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
                  <View style={styles.issueHeader}>
                    <Text style={[styles.issueText, { color: COLORS.text }]}>{issueObj.issue}</Text>
                    {issueObj.severity && (
                      <View style={[
                        styles.severityBadge,
                        { backgroundColor: issueObj.severity === 'Modérée' ? COLORS.warning + '20' : COLORS.error + '20' }
                      ]}>
                        <Text style={[
                          styles.severityText,
                          { color: issueObj.severity === 'Modérée' ? COLORS.warning : COLORS.error }
                        ]}>
                          {issueObj.severity}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.issueDetails}>
                    {issueObj.impact && (
                      <Text style={[styles.issueImpact, { color: COLORS.textSecondary }]}>Impact: {issueObj.impact}</Text>
                    )}
                    {issueObj.priority && (
                      <Text style={[styles.issuePriority, { color: COLORS.textSecondary }]}>Priorité: {issueObj.priority}</Text>
                    )}
                    {detectedIn && (
                      <Text style={[styles.issueDetectedIn, { color: COLORS.secondary }]}>
                        Détecté dans: {Array.isArray(detectedIn) ? detectedIn.join(', ') : detectedIn}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {postureAnalysis.improvement_recommendations && postureAnalysis.improvement_recommendations.length > 0 && (
          <View style={[styles.recommendationsContainer, { backgroundColor: COLORS.success + '0A' }]}>
            <View style={styles.recommendationsHeader}>
              <Ionicons name="bulb" size={18} color={COLORS.success} />
              <Text style={[styles.recommendationsTitle, { color: COLORS.success }]}>
                Recommandations Ciblées ({postureAnalysis.improvement_recommendations.length})
              </Text>
            </View>
            {postureAnalysis.improvement_recommendations.map((rec, index) => {
              const priorityColor = rec.priority === 'Haute' ? COLORS.error
                : rec.priority === 'Moyenne' ? COLORS.warning : COLORS.success;
              return (
                <View key={index} style={[styles.recommendationCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[styles.recommendationCategory, { color: COLORS.primary, flex: 1 }]}>{rec.category}</Text>
                    {rec.priority && (
                      <View style={{ backgroundColor: priorityColor + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: priorityColor }}>{rec.priority}</Text>
                      </View>
                    )}
                  </View>
                  {rec.target_problem && rec.target_problem !== rec.category && (
                    <Text style={[styles.issueImpact, { color: COLORS.textSecondary, marginBottom: 6, fontSize: 12 }]}>
                      🎯 {rec.target_problem}
                    </Text>
                  )}
                  {rec.exercises && rec.exercises.map((exercise, exIndex) => (
                    <View key={exIndex} style={styles.exerciseItem}>
                      <Text style={styles.exerciseBullet}>•</Text>
                      <Text style={[styles.exerciseText, { color: COLORS.text }]}>{exercise}</Text>
                    </View>
                  ))}
                  <View style={[styles.recommendationMeta, { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
                    {rec.frequency && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="repeat" size={12} color={COLORS.textSecondary} />
                        <Text style={[styles.recommendationFrequency, { color: COLORS.textSecondary }]}>{rec.frequency}</Text>
                      </View>
                    )}
                    {rec.duration && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="time" size={12} color={COLORS.textSecondary} />
                        <Text style={[styles.recommendationDuration, { color: COLORS.textSecondary }]}>{rec.duration}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // Fonctions utilitaires manquantes
  const getBodyTypeColor = (bodyType) => {
    if (!bodyType) return COLORS.textSecondary;
    if (bodyType.includes('Athlétique')) return COLORS.success;
    if (bodyType.includes('Normal')) return COLORS.primary;
    if (bodyType.includes('Surpoids')) return COLORS.warning;
    if (bodyType.includes('Obèse') || bodyType.includes('Maigre')) return COLORS.error;
    return COLORS.secondary;
  };

  const getBMIInterpretation = (bmi) => {
    if (bmi < 18.5) return "Insuffisance pondérale";
    if (bmi < 25) return "Poids normal";
    if (bmi < 30) return "Surpoids";
    return "Obésité";
  };

  const getVisceralFatRisk = (visceralFat) => {
    if (!visceralFat || visceralFat === 'N/A') return '';
    
    try {
      const value = parseFloat(visceralFat);
      if (value < 9) return 'Faible risque';
      if (value < 13) return 'Risque modéré';
      return 'Risque élevé';
    } catch {
      return '';
    }
  };

  // Fonction renderBodyMeasurements manquante
  const renderBodyMeasurements = () => {
    const composition = analysis.analysis?.body_composition_complete || {};
    const basicMetrics = composition.basic_metrics || {};
    const fatAnalysis = composition.fat_analysis || {};
    const muscleAnalysis = composition.muscle_analysis || {};
    const otherComponents = composition.other_components || {};
    const yoloDetection = analysis.analysis?.yolo_detection || {};
    
    return (
      <View style={[section, { backgroundColor: COLORS.card }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: COLORS.primary + '15' }]}>
            <MaterialIcons name="monitor-weight" size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>⚖️ Composition Corporelle</Text>
          {basicMetrics.body_composition_class && (
            <View style={[
              styles.typeBadge,
              { 
                backgroundColor: getBodyTypeColor(basicMetrics.body_composition_class) + '20'
              }
            ]}>
              <Text style={[
                styles.typeBadgeText,
                { color: getBodyTypeColor(basicMetrics.body_composition_class) }
              ]}>
                {basicMetrics.body_composition_class}
              </Text>
            </View>
          )}
        </View>
        
        {/* Métriques de base */}
        <View style={styles.metricsSection}>
          <Text style={[styles.subsectionTitle, { color: COLORS.text }]}>📏 Métriques de Base</Text>
          <View style={styles.measurementsGrid}>
            <View style={[styles.measurementCard, { backgroundColor: COLORS.background }]}>
              <View style={[styles.measurementIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <MaterialIcons name="scale" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.measurementValue, { color: COLORS.primary }]}>
                {basicMetrics.weight || 'N/A'}
              </Text>
              <Text style={[styles.measurementLabel, { color: COLORS.textSecondary }]}>POIDS</Text>
            </View>
            
            <View style={[styles.measurementCard, { backgroundColor: COLORS.background }]}>
              <View style={[styles.measurementIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <MaterialIcons name="height" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.measurementValue, { color: COLORS.primary }]}>
                {basicMetrics.height || 'N/A'}
              </Text>
              <Text style={[styles.measurementLabel, { color: COLORS.textSecondary }]}>TAILLE</Text>
            </View>

            <View style={[styles.measurementCard, { backgroundColor: COLORS.background }]}>
              <View style={[styles.measurementIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <MaterialIcons name="calculate" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.measurementValue, { color: COLORS.primary }]}>
                {basicMetrics.bmi || 'N/A'}
              </Text>
              <Text style={[styles.measurementLabel, { color: COLORS.textSecondary }]}>IMC</Text>
              {basicMetrics.bmi && basicMetrics.bmi !== 'N/A' && (
                <Text style={[styles.measurementInterpretation, { color: COLORS.textSecondary }]}>
                  {getBMIInterpretation(parseFloat(basicMetrics.bmi))}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Analyse Graisseuse */}
        {fatAnalysis && Object.keys(fatAnalysis).length > 0 && (
          <View style={styles.metricsSection}>
            <Text style={[styles.subsectionTitle, { color: COLORS.text }]}>🧴 Analyse Graisseuse</Text>
            <View style={styles.detailedGrid}>
              <View style={[styles.detailedCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.detailedLabel, { color: COLORS.textSecondary }]}>Masse Grasse</Text>
                <Text style={[styles.detailedValue, { color: COLORS.text }]}>
                  {fatAnalysis.body_fat_kg || 'N/A'}
                </Text>
                <Text style={[styles.detailedSubtext, { color: COLORS.textSecondary }]}>
                  {fatAnalysis.body_fat_percentage || 'N/A'}%
                </Text>
              </View>
              
              <View style={[styles.detailedCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.detailedLabel, { color: COLORS.textSecondary }]}>Distribution</Text>
                <Text style={[styles.detailedValue, { color: COLORS.text }]} numberOfLines={2}>
                  {fatAnalysis.fat_distribution || 'N/A'}
                </Text>
              </View>
              
              {fatAnalysis.visceral_fat_estimated && (
                <View style={[styles.detailedCard, { backgroundColor: COLORS.background }]}>
                  <Text style={[styles.detailedLabel, { color: COLORS.textSecondary }]}>Graisse Viscérale</Text>
                  <Text style={[styles.detailedValue, { color: COLORS.text }]}>
                    {fatAnalysis.visceral_fat_estimated}
                  </Text>
                  <Text style={[styles.detailedSubtext, { color: COLORS.textSecondary }]}>
                    {getVisceralFatRisk(fatAnalysis.visceral_fat_estimated)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Analyse Musculaire */}
        {muscleAnalysis && Object.keys(muscleAnalysis).length > 0 && (
          <View style={styles.metricsSection}>
            <Text style={[styles.subsectionTitle, { color: COLORS.text }]}>💪 Analyse Musculaire</Text>
            <View style={styles.detailedGrid}>
              <View style={[styles.detailedCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.detailedLabel, { color: COLORS.textSecondary }]}>Masse Musculaire</Text>
                <Text style={[styles.detailedValue, { color: COLORS.text }]}>
                  {muscleAnalysis.skeletal_muscle_mass_kg || 'N/A'}
                </Text>
                <Text style={[styles.detailedSubtext, { color: COLORS.textSecondary }]}>
                  {muscleAnalysis.muscle_percentage || 'N/A'}%
                </Text>
              </View>
              
              <View style={[styles.detailedCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.detailedLabel, { color: COLORS.textSecondary }]}>Masse Maigre</Text>
                <Text style={[styles.detailedValue, { color: COLORS.text }]}>
                  {muscleAnalysis.lean_body_mass_kg || 'N/A'}
                </Text>
              </View>
              
              <View style={[styles.detailedCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.detailedLabel, { color: COLORS.textSecondary }]}>Ratio M/G</Text>
                <Text style={[styles.detailedValue, { color: COLORS.text }]}>
                  {muscleAnalysis.muscle_to_fat_ratio || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Autres Composants */}
        {otherComponents && Object.keys(otherComponents).length > 0 && (
          <View style={styles.metricsSection}>
            <Text style={[styles.subsectionTitle, { color: COLORS.text }]}>🧬 Autres Composants</Text>
            <View style={styles.componentsGrid}>
              <View style={[styles.componentCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.componentLabel, { color: COLORS.textSecondary }]}>Eau Corporelle</Text>
                <Text style={[styles.componentValue, { color: COLORS.text }]}>
                  {otherComponents.body_water_estimated || 'N/A'}
                </Text>
              </View>
              
              <View style={[styles.componentCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.componentLabel, { color: COLORS.textSecondary }]}>Masse Osseuse</Text>
                <Text style={[styles.componentValue, { color: COLORS.text }]}>
                  {otherComponents.bone_mass_estimated || 'N/A'}
                </Text>
              </View>
              
              <View style={[styles.componentCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.componentLabel, { color: COLORS.textSecondary }]}>Masse Résiduelle</Text>
                <Text style={[styles.componentValue, { color: COLORS.text }]}>
                  {otherComponents.residual_mass || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Détection YOLO */}
        {/* {yoloDetection.detected_class && yoloDetection.detected_class !== "Non détecté" && (
          <View style={[styles.yoloContainer, { backgroundColor: COLORS.secondary + '0A' }]}>
            <View style={styles.yoloHeader}>
              <View style={[styles.aiIcon, { backgroundColor: COLORS.secondary + '18' }]}>
                <Ionicons name="hardware-chip" size={16} color={COLORS.secondary} />
              </View>
              <Text style={[styles.yoloTitle, { color: COLORS.text }]}>Détection IA YOLOv8</Text>
              <View style={[styles.confidenceBadge, { backgroundColor: COLORS.secondary + '25' }]}>
                <Text style={[styles.confidenceText, { color: COLORS.secondary }]}>
                  {yoloDetection.confidence ? (yoloDetection.confidence * 100).toFixed(0) : '0'}% confiance
                </Text>
              </View>
            </View>
            <View style={styles.yoloDetails}>
              <Text style={[styles.yoloClass, { color: COLORS.text }]}>
                Classe: <Text style={[styles.yoloClassValue, { color: COLORS.secondary }]}>{yoloDetection.detected_class}</Text>
              </Text>
              {yoloDetection.gender && yoloDetection.gender !== 'unknown' && (
                <Text style={[styles.yoloGender, { color: COLORS.text }]}>
                  Genre: <Text style={[styles.yoloGenderValue, { color: COLORS.secondary }]}>
                    {yoloDetection.gender === 'male' ? 'Homme' : 'Femme'}
                  </Text>
                </Text>
              )}
            </View>
          </View>
        )} */}

        {/* Métadonnées d'analyse */}
        {analysis.analysis?.analysis_metadata && (
          <View style={[styles.metadataContainer, { 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            borderColor: COLORS.border 
          }]}>
            <Text style={[styles.metadataTitle, { color: COLORS.textSecondary }]}>🔬 Technologies utilisées:</Text>
            <View style={styles.techTags}>
              {analysis.analysis.analysis_metadata.engine_used && (
                <View style={[styles.techTag, { backgroundColor: COLORS.primary + '15' }]}>
                  <Text style={[styles.techTagText, { color: COLORS.primary }]}>{analysis.analysis.analysis_metadata.engine_used}</Text>
                </View>
              )}
              {analysis.analysis.analysis_metadata.formulas_used && 
               analysis.analysis.analysis_metadata.formulas_used.map((formula, index) => (
                <View key={index} style={[styles.techTag, { backgroundColor: COLORS.primary + '15' }]}>
                  <Text style={[styles.techTagText, { color: COLORS.primary }]}>{formula}</Text>
                </View>
              ))}
            </View>
            {analysis.analysis.analysis_metadata.is_real_case_adjusted && (
              <Text style={[styles.realCaseNote, { color: COLORS.success }]}>
                ✅ Ajustements appliqués pour correspondre aux données de laboratoire
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // Fonction renderFitnessRecommendations manquante
  const renderFitnessRecommendations = () => {
    const recommendations = analysis.analysis?.fitness_recommendations || {};
    
    return (
      <View style={[section, { backgroundColor: COLORS.card }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: COLORS.primary + '15' }]}>
            <MaterialIcons name="recommend" size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🎯 Recommandations Fitness Détaillées</Text>
        </View>
        
        {/* Emploi du temps hebdomadaire */}
        {recommendations.weekly_schedule && (
          <View style={[styles.scheduleSection, { backgroundColor: COLORS.background }]}>
            <Text style={[styles.scheduleTitle, { color: COLORS.primary }]}>📅 Emploi du temps Hebdomadaire</Text>
            {Object.entries(recommendations.weekly_schedule).map(([day, activity]) => (
              <View key={day} style={styles.scheduleDay}>
                <Text style={[styles.scheduleDayLabel, { color: COLORS.text }]}>{day}:</Text>
                <Text style={[styles.scheduleActivity, { color: COLORS.text }]}>{activity}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Suivi de progression */}
        {recommendations.progress_tracking && (
          <View style={[styles.trackingSection, { backgroundColor: COLORS.background }]}>
            <Text style={[styles.trackingTitle, { color: COLORS.primary }]}>📊 Suivi de Progression</Text>
            <View style={styles.trackingGrid}>
              <View style={[styles.trackingCard, { backgroundColor: COLORS.primary + '0A' }]}>
                <Text style={[styles.trackingCardTitle, { color: COLORS.text }]}>Mesures Hebdomadaires</Text>
                {recommendations.progress_tracking.weekly_measurements && 
                 recommendations.progress_tracking.weekly_measurements.map((item, index) => (
                  <Text key={index} style={[styles.trackingItem, { color: COLORS.textSecondary }]}>• {item}</Text>
                ))}
              </View>
              
              <View style={[styles.trackingCard, { backgroundColor: COLORS.primary + '0A' }]}>
                <Text style={[styles.trackingCardTitle, { color: COLORS.text }]}>Métriques Clés</Text>
                {recommendations.progress_tracking.key_metrics && 
                 recommendations.progress_tracking.key_metrics.map((metric, index) => (
                  <Text key={index} style={[styles.trackingItem, { color: COLORS.textSecondary }]}>• {metric}</Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Recommandations par catégorie */}
        {recommendations.strength_training && recommendations.strength_training.length > 0 && (
          <View style={styles.recommendationCategory}>
            <View style={styles.categoryHeader}>
              <Ionicons name="barbell" size={18} color={COLORS.success} />
              <Text style={[styles.categoryTitle, { color: COLORS.text }]}>Renforcement musculaire</Text>
            </View>
            {recommendations.strength_training.map((exercise, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationBullet}>🏋️</Text>
                <Text style={[styles.recommendationText, { color: COLORS.text }]}>{exercise}</Text>
              </View>
            ))}
          </View>
        )}

        {recommendations.flexibility_work && recommendations.flexibility_work.length > 0 && (
          <View style={styles.recommendationCategory}>
            <View style={styles.categoryHeader}>
              <MaterialIcons name="self-improvement" size={18} color={COLORS.primary} />
              <Text style={[styles.categoryTitle, { color: COLORS.text }]}>Flexibilité & Mobilité</Text>
            </View>
            {recommendations.flexibility_work.map((item, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationBullet}>🧘</Text>
                <Text style={[styles.recommendationText, { color: COLORS.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {recommendations.cardio_recommendations && recommendations.cardio_recommendations.length > 0 && (
          <View style={styles.recommendationCategory}>
            <View style={styles.categoryHeader}>
              <Ionicons name="heart" size={18} color={COLORS.error} />
              <Text style={[styles.categoryTitle, { color: COLORS.text }]}>Cardio</Text>
            </View>
            {recommendations.cardio_recommendations.map((item, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationBullet}>🏃</Text>
                <Text style={[styles.recommendationText, { color: COLORS.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {recommendations.nutrition_advice && recommendations.nutrition_advice.length > 0 && (
          <View style={styles.recommendationCategory}>
            <View style={styles.categoryHeader}>
              <Ionicons name="nutrition" size={18} color={COLORS.warning} />
              <Text style={[styles.categoryTitle, { color: COLORS.text }]}>Conseils Nutritionnels</Text>
            </View>
            {recommendations.nutrition_advice.map((advice, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationBullet}>🥗</Text>
                <Text style={[styles.recommendationText, { color: COLORS.text }]}>{advice}</Text>
              </View>
            ))}
          </View>
        )}

        {recommendations.lifestyle_changes && recommendations.lifestyle_changes.length > 0 && (
          <View style={styles.recommendationCategory}>
            <View style={styles.categoryHeader}>
              <MaterialIcons name="self-improvement" size={18} color={COLORS.secondary} />
              <Text style={[styles.categoryTitle, { color: COLORS.text }]}>Changements de Style de Vie</Text>
            </View>
            {recommendations.lifestyle_changes.map((change, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationBullet}>✨</Text>
                <Text style={[styles.recommendationText, { color: COLORS.text }]}>{change}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAnalysisTab = () => (
    <ScrollView 
      style={styles.tabContent} 
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
      {renderMediaSection()}
      {renderPostureAnalysis()}
      {renderBodyMeasurements()}
      {renderFitnessRecommendations()}

      <View style={styles.actionSection}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: COLORS.primary + '10', ...cardBorder }, dmShadow.sm]}
          onPress={generateFitnessPlan}
          disabled={isGeneratingPlan}
          activeOpacity={0.7}
        >
          <View style={styles.actionButtonContent}>
            <View style={[styles.actionIconWrap, { backgroundColor: COLORS.primary + '18' }]}>
              <Ionicons 
                name="barbell" 
                size={20} 
                color={isGeneratingPlan ? COLORS.textSecondary : COLORS.primary} 
              />
            </View>
            <Text style={[
              styles.primaryButtonText, { color: COLORS.primary },
              isGeneratingPlan && styles.buttonTextDisabled
            ]}>
              {isGeneratingPlan ? '🔄 Génération...' : 'Générer Plan Fitness Intelligent'}
            </Text>
          </View>
          {!isGeneratingPlan && (
            <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
          )}
        </TouchableOpacity>
        
        {fitnessPlan && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: COLORS.secondary + '10', ...cardBorder }, dmShadow.sm]}
            onPress={() => setActiveTab('fitness')}
            activeOpacity={0.7}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIconWrap, { backgroundColor: COLORS.secondary + '18' }]}>
                <Ionicons name="fitness" size={20} color={COLORS.secondary} />
              </View>
              <Text style={[styles.secondaryButtonText, { color: COLORS.secondary }]}>
                Voir le Plan Fitness {analysis.plan_type === 'intelligent' ? 'Intelligent' : ''}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={COLORS.secondary} />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  const renderFitnessTab = () => {
    if (!fitnessPlan) {
      return (
        <View style={styles.emptyTab}>
          <Ionicons name="barbell-outline" size={80} color={COLORS.textSecondary} style={styles.emptyIcon} />
          <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>
            Générez un plan fitness intelligent pour voir les détails complets
          </Text>
          <TouchableOpacity 
            style={[styles.generateButton, { backgroundColor: COLORS.primary }]}
            onPress={generateFitnessPlan}
          >
            <Text style={styles.generateButtonText}>Générer le Plan Intelligent</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const plan = typeof fitnessPlan === 'string' ? JSON.parse(fitnessPlan) : fitnessPlan;
    
    // Detect new v3 plan format
    const isV3 = plan.plan_metadata || plan.program_phases;
    
    if (isV3) {
      return renderV3FitnessPlan(plan);
    }

    // Legacy plan fallback
    return renderLegacyFitnessPlan(plan);
  };

  // ══════════════════════════════════════════════════════════════
  // V3 INTELLIGENT FITNESS PLAN RENDERER
  // ══════════════════════════════════════════════════════════════

  const renderV3FitnessPlan = (plan) => {
    const sections = [
      { key: 'overview', label: 'Vue d\'ensemble', icon: 'eye' },
      { key: 'phases', label: 'Phases', icon: 'layers' },
      { key: 'training', label: 'Entraînement', icon: 'barbell' },
      { key: 'nutrition', label: 'Nutrition', icon: 'nutrition' },
      { key: 'recovery', label: 'Récupération', icon: 'bed' },
      { key: 'goals', label: 'Objectifs', icon: 'flag' },
    ];

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Sub-navigation */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planSubNav}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section.key}
              style={[
                styles.planSubNavItem,
                activePlanSection === section.key && { backgroundColor: COLORS.primary },
              ]}
              onPress={() => setActivePlanSection(section.key)}
            >
              <Ionicons
                name={section.icon}
                size={16}
                color={activePlanSection === section.key ? 'white' : COLORS.textSecondary}
              />
              <Text style={[
                styles.planSubNavText,
                { color: activePlanSection === section.key ? 'white' : COLORS.textSecondary },
              ]}>
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activePlanSection === 'overview' && renderPlanOverview(plan)}
        {activePlanSection === 'phases' && renderPlanPhases(plan)}
        {activePlanSection === 'training' && renderPlanTraining(plan)}
        {activePlanSection === 'nutrition' && renderPlanNutrition(plan)}
        {activePlanSection === 'recovery' && renderPlanRecovery(plan)}
        {activePlanSection === 'goals' && renderPlanGoals(plan)}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ── OVERVIEW ──
  const renderPlanOverview = (plan) => {
    const meta = plan.plan_metadata || {};
    const profile = plan.athletic_profile || {};
    const insights = plan.ai_coaching_insights || {};
    const phases = plan.program_phases || [];

    const goalLabels = {
      fat_loss: '🔥 Perte de Graisse',
      muscle_gain: '💪 Prise de Masse',
      recomposition: '🔄 Recomposition',
      posture_correction: '🧘 Correction Posturale',
      maintenance: '⚖️ Maintien & Optimisation',
      athletic_performance: '🚀 Performance Athlétique',
    };
    const levelLabels = { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' };

    return (
      <>
        {/* Hero Card */}
        <View style={[styles.section, { backgroundColor: COLORS.primary }]}>
          <Text style={[styles.heroTitle, { color: 'white' }]}>
            {goalLabels[meta.primary_goal] || '🎯 Plan Fitness Intelligent'}
          </Text>
          <Text style={[styles.heroSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>
            {meta.total_phases} phases • {meta.total_duration_weeks} semaines • Niveau {levelLabels[meta.fitness_level] || meta.fitness_level}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{meta.total_duration_weeks || '—'}</Text>
              <Text style={styles.heroStatLabel}>Semaines</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{meta.total_phases || '—'}</Text>
              <Text style={styles.heroStatLabel}>Phases</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{levelLabels[meta.fitness_level]?.charAt(0) || '—'}</Text>
              <Text style={styles.heroStatLabel}>Niveau</Text>
            </View>
          </View>
        </View>

        {/* AI Insights */}
        {insights.personalized_message && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.secondary + '15' }]}>
                <Ionicons name="sparkles" size={20} color={COLORS.secondary} />
              </View>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>💡 Conseil de votre Coach IA</Text>
            </View>
            <Text style={[styles.insightMessage, { color: COLORS.text }]}>
              "{insights.personalized_message}"
            </Text>
            {insights.top_3_priorities && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.insightLabel, { color: COLORS.primary }]}>🎯 Vos 3 Priorités:</Text>
                {insights.top_3_priorities.map((p, i) => (
                  <View key={i} style={styles.priorityItem}>
                    <View style={[styles.priorityNumber, { backgroundColor: COLORS.primary + '20' }]}>
                      <Text style={[styles.priorityNumberText, { color: COLORS.primary }]}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.priorityText, { color: COLORS.text }]}>{p}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Athletic Profile */}
        {profile.current_status && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>📊 Votre Profil Athlétique</Text>
            </View>
            <Text style={[styles.profileStatusText, { color: COLORS.text }]}>{profile.current_status}</Text>

            {profile.strengths && profile.strengths.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.profileSubTitle, { color: COLORS.success }]}>✅ Points Forts</Text>
                {profile.strengths.map((s, i) => (
                  <Text key={i} style={[styles.profileListItemText, { color: COLORS.text }]}>• {s}</Text>
                ))}
              </View>
            )}
            {profile.areas_to_improve && profile.areas_to_improve.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.profileSubTitle, { color: COLORS.warning }]}>⚠️ Axes d'Amélioration</Text>
                {profile.areas_to_improve.map((w, i) => (
                  <Text key={i} style={[styles.profileListItemText, { color: COLORS.text }]}>• {w}</Text>
                ))}
              </View>
            )}
            {profile.ideal_weight && (
              <View style={[styles.idealWeightBadge, { backgroundColor: COLORS.primary + '10' }]}>
                <Ionicons name="analytics" size={16} color={COLORS.primary} />
                <Text style={[styles.idealWeightText, { color: COLORS.primary }]}>
                  Poids idéal estimé: {profile.ideal_weight} ({profile.weight_adjustment || ''})
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Phases Timeline Preview */}
        {phases.length > 0 && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: COLORS.success + '15' }]}>
                <Ionicons name="git-branch" size={20} color={COLORS.success} />
              </View>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🗺️ Aperçu du Programme</Text>
            </View>
            {phases.map((phase, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: phase.color || COLORS.primary }]} />
                {index < phases.length - 1 && <View style={[styles.timelineLine, { backgroundColor: COLORS.border }]} />}
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelinePhase, { color: COLORS.text }]}>
                    {phase.icon || '📌'} Phase {phase.phase_number}: {phase.name}
                  </Text>
                  <Text style={[styles.timelineDuration, { color: COLORS.textSecondary }]}>
                    {phase.duration_weeks} semaines • {phase.intensity_range || ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </>
    );
  };

  // ── PHASES ──
  const renderPlanPhases = (plan) => {
    const phases = plan.program_phases || [];

    return (
      <>
        {phases.map((phase, index) => (
          <View key={index} style={[section, { backgroundColor: COLORS.card }]}>
            <TouchableOpacity onPress={() => setExpandedPhase(expandedPhase === index ? null : index)}>
              <View style={styles.phaseHeader}>
                <View style={[styles.phaseIcon, { backgroundColor: (phase.color || COLORS.primary) + '20' }]}>
                  <Text style={styles.phaseIconText}>{phase.icon || '📌'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.phaseTitle, { color: COLORS.text }]}>
                    Phase {phase.phase_number}: {phase.name}
                  </Text>
                  <Text style={[styles.phaseMeta, { color: COLORS.textSecondary }]}>
                    {phase.duration_weeks} semaines • {phase.volume || ''}
                  </Text>
                </View>
                <Ionicons
                  name={expandedPhase === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </View>
            </TouchableOpacity>

            {expandedPhase === index && (
              <View style={styles.phaseDetail}>
                {/* Objectifs */}
                {phase.objectives && (
                  <View style={[styles.phaseSection, { backgroundColor: COLORS.background }]}>
                    <Text style={[styles.phaseSectionTitle, { color: COLORS.primary }]}>🎯 Objectifs</Text>
                    {phase.objectives.map((obj, i) => (
                      <View key={i} style={styles.objectiveRow}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                        <Text style={[styles.objectiveRowText, { color: COLORS.text }]}>{obj}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Détails */}
                <View style={[styles.phaseSection, { backgroundColor: COLORS.background }]}>
                  <Text style={[styles.phaseSectionTitle, { color: COLORS.primary }]}>📋 Détails</Text>
                  {phase.training_focus && (
                    <View style={styles.phaseDetailRow}>
                      <Text style={[styles.phaseDetailLabel, { color: COLORS.textSecondary }]}>Focus:</Text>
                      <Text style={[styles.phaseDetailValue, { color: COLORS.text }]}>{phase.training_focus}</Text>
                    </View>
                  )}
                  {phase.intensity_range && (
                    <View style={styles.phaseDetailRow}>
                      <Text style={[styles.phaseDetailLabel, { color: COLORS.textSecondary }]}>Intensité:</Text>
                      <Text style={[styles.phaseDetailValue, { color: COLORS.text }]}>{phase.intensity_range}</Text>
                    </View>
                  )}
                  {phase.volume && (
                    <View style={styles.phaseDetailRow}>
                      <Text style={[styles.phaseDetailLabel, { color: COLORS.textSecondary }]}>Volume:</Text>
                      <Text style={[styles.phaseDetailValue, { color: COLORS.text }]}>{phase.volume}</Text>
                    </View>
                  )}
                </View>

                {/* Indicateurs clés */}
                {phase.key_indicators && (
                  <View style={[styles.phaseSection, { backgroundColor: COLORS.background }]}>
                    <Text style={[styles.phaseSectionTitle, { color: COLORS.primary }]}>📈 Indicateurs de Succès</Text>
                    {phase.key_indicators.map((ind, i) => (
                      <Text key={i} style={[styles.indicatorText, { color: COLORS.text }]}>📊 {ind}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </>
    );
  };

  // ── TRAINING ──
  const renderPlanTraining = (plan) => {
    const currentPhase = plan.current_phase_detail || {};
    const weeklyProgram = currentPhase.weekly_program || {};
    const phaseInfo = currentPhase.phase_info || {};
    const days = weeklyProgram.days || {};

    return (
      <>
        {/* Phase info */}
        <View style={[section, { backgroundColor: COLORS.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="barbell" size={20} color={COLORS.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
              🏋️ {phaseInfo.name || 'Programme d\'Entraînement'}
            </Text>
          </View>
          <View style={[styles.splitBadge, { backgroundColor: COLORS.primary + '15' }]}>
            <Text style={[styles.splitBadgeText, { color: COLORS.primary }]}>
              {weeklyProgram.split_type || 'Programme complet'}
            </Text>
          </View>
        </View>

        {/* Daily Programs */}
        {Object.entries(days).map(([dayKey, dayData]) => (
          <View key={dayKey} style={[styles.section, { backgroundColor: COLORS.card, paddingVertical: 12, paddingHorizontal: 16 }]}>
            <TouchableOpacity
              onPress={() => setExpandedDay(expandedDay === dayKey ? null : dayKey)}
              style={styles.dayHeader}
            >
              <View style={[styles.dayBadge, {
                backgroundColor: dayData.intensity?.includes('Repos') || dayData.intensity?.includes('1')
                  ? COLORS.success + '20'
                  : dayData.intensity?.includes('8') || dayData.intensity?.includes('9')
                    ? COLORS.error + '20'
                    : COLORS.primary + '20'
              }]}>
                <Text style={[styles.dayBadgeText, { color: COLORS.text }]}>
                  {dayKey === 'monday' ? 'LUN' : dayKey === 'tuesday' ? 'MAR' : dayKey === 'wednesday' ? 'MER' :
                   dayKey === 'thursday' ? 'JEU' : dayKey === 'friday' ? 'VEN' : dayKey === 'saturday' ? 'SAM' : 'DIM'}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.dayTitle, { color: COLORS.text }]} numberOfLines={1}>
                  {dayData.name || dayKey}
                </Text>
                <Text style={[styles.dayFocus, { color: COLORS.textSecondary }]} numberOfLines={1}>
                  {dayData.focus || ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.dayDuration, { color: COLORS.textSecondary }]}>{dayData.duration || ''}</Text>
                <Text style={[styles.dayIntensity, { color: COLORS.textSecondary }]}>{dayData.intensity || ''}</Text>
              </View>
              <Ionicons
                name={expandedDay === dayKey ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.textSecondary}
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>

            {expandedDay === dayKey && dayData.exercises && dayData.exercises.length > 0 && (
              <View style={styles.exercisesList}>
                {dayData.exercises.map((exercise, i) => (
                  <View key={i} style={[styles.exerciseCard, { backgroundColor: COLORS.background }]}>
                    <View style={styles.exerciseHeader}>
                      <Text style={[styles.exerciseNumber, { color: COLORS.primary }]}>#{i + 1}</Text>
                      <Text style={[styles.exerciseName, { color: COLORS.text }]}>
                        {typeof exercise === 'string' ? exercise : exercise.name}
                      </Text>
                    </View>
                    {typeof exercise === 'object' && (
                      <View style={styles.exerciseDetails}>
                        <View style={styles.exerciseMetaRow}>
                          {exercise.sets && exercise.sets !== '-' && (
                            <View style={[styles.exerciseMetaBadge, { backgroundColor: COLORS.primary + '15' }]}>
                              <Text style={[styles.exerciseMetaText, { color: COLORS.primary }]}>{exercise.sets} séries</Text>
                            </View>
                          )}
                          {exercise.reps && exercise.reps !== '-' && (
                            <View style={[styles.exerciseMetaBadge, { backgroundColor: COLORS.success + '15' }]}>
                              <Text style={[styles.exerciseMetaText, { color: COLORS.success }]}>{exercise.reps}</Text>
                            </View>
                          )}
                          {exercise.rest && exercise.rest !== '-' && (
                            <View style={[styles.exerciseMetaBadge, { backgroundColor: COLORS.warning + '15' }]}>
                              <Text style={[styles.exerciseMetaText, { color: COLORS.warning }]}>⏱ {exercise.rest}</Text>
                            </View>
                          )}
                        </View>
                        {exercise.notes && (
                          <Text style={[styles.exerciseNotes, { color: COLORS.textSecondary }]}>
                            💡 {exercise.notes}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Progression Rules */}
        {weeklyProgram.progression_rules && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>📈 Règles de Progression</Text>
            {(Array.isArray(weeklyProgram.progression_rules) ? weeklyProgram.progression_rules : [weeklyProgram.progression_rules]).map((rule, i) => (
              <Text key={i} style={[styles.ruleText, { color: COLORS.text }]}>📌 {rule}</Text>
            ))}
          </View>
        )}
      </>
    );
  };

  // ── NUTRITION ──
  const renderPlanNutrition = (plan) => {
    const nutrition = plan.nutrition_strategy || {};
    const caloric = nutrition.caloric_strategy || {};
    const macros = nutrition.macronutrients || {};
    const meals = nutrition.meal_plan_template || {};
    const hydration = nutrition.hydration_protocol || {};
    const supps = nutrition.supplementation || {};

    return (
      <>
        {/* Stratégie Calorique */}
        <View style={[section, { backgroundColor: COLORS.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="flame" size={20} color={COLORS.warning} />
            </View>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🔥 Stratégie Calorique</Text>
          </View>
          <View style={styles.caloricGrid}>
            {caloric.tdee_estimated && (
              <View style={[styles.caloricCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.caloricLabel, { color: COLORS.textSecondary }]}>TDEE</Text>
                <Text style={[styles.caloricValue, { color: COLORS.text }]}>{caloric.tdee_estimated}</Text>
              </View>
            )}
            {caloric.training_day_target && (
              <View style={[styles.caloricCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.caloricLabel, { color: COLORS.textSecondary }]}>Jour d'entraînement</Text>
                <Text style={[styles.caloricValue, { color: COLORS.primary }]}>{caloric.training_day_target}</Text>
              </View>
            )}
            {caloric.rest_day_target && (
              <View style={[styles.caloricCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.caloricLabel, { color: COLORS.textSecondary }]}>Jour de repos</Text>
                <Text style={[styles.caloricValue, { color: COLORS.success }]}>{caloric.rest_day_target}</Text>
              </View>
            )}
          </View>
          {caloric.deficit_or_surplus && (
            <View style={[styles.adjustmentBadge, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="trending-up" size={16} color={COLORS.warning} />
              <Text style={[styles.adjustmentText, { color: COLORS.warning }]}>{caloric.deficit_or_surplus}</Text>
            </View>
          )}
        </View>

        {/* Macronutriments */}
        <View style={[section, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>⚖️ Macronutriments</Text>
          {['protein', 'carbohydrates', 'fats'].map((macro) => {
            const data = macros[macro];
            if (!data) return null;
            const colors = { protein: '#FF3B30', carbohydrates: '#FF9500', fats: '#34C759' };
            const icons = { protein: '🥩', carbohydrates: '🍚', fats: '🥑' };
            const labels = { protein: 'Protéines', carbohydrates: 'Glucides', fats: 'Lipides' };
            return (
              <View key={macro} style={[styles.macroCard, { backgroundColor: COLORS.background, borderLeftColor: colors[macro], borderLeftWidth: 4 }]}>
                <View style={styles.macroHeader}>
                  <Text style={[styles.macroLabel, { color: COLORS.text }]}>{icons[macro]} {labels[macro]}</Text>
                  <Text style={[styles.macroPercentage, { color: colors[macro] }]}>{data.percentage || ''}</Text>
                </View>
                <View style={styles.macroDetails}>
                  <Text style={[styles.macroDetailText, { color: COLORS.text }]}>📏 {data.grams_per_kg || ''} • {data.daily_total || data.training_day || ''}</Text>
                  {data.timing && <Text style={[styles.macroDetailText, { color: COLORS.textSecondary }]}>⏰ {data.timing}</Text>}
                  {data.best_sources && (
                    <Text style={[styles.macroSources, { color: COLORS.textSecondary }]}>
                      Sources: {data.best_sources.slice(0, 3).join(' • ')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Plan de Repas */}
        {Object.keys(meals).length > 0 && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🍽️ Plan de Repas Type</Text>
            {Object.entries(meals).map(([key, meal]) => (
              <View key={key} style={[styles.mealCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.mealTime, { color: COLORS.primary }]}>{meal.timing || ''}</Text>
                <Text style={[styles.mealComposition, { color: COLORS.text }]}>{meal.composition || ''}</Text>
                {meal.example && (
                  <Text style={[styles.mealExample, { color: COLORS.textSecondary }]}>💡 {meal.example}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Hydratation */}
        {hydration.minimum_daily && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>💧 Hydratation</Text>
            <View style={styles.hydrationGrid}>
              <View style={[styles.hydrationCard, { backgroundColor: COLORS.primary + '12' }]}>
                <Ionicons name="water" size={24} color={COLORS.primary} />
                <Text style={[styles.hydrationValue, { color: COLORS.primary }]}>{hydration.minimum_daily}</Text>
                <Text style={[styles.hydrationLabel, { color: COLORS.textSecondary }]}>Minimum/jour</Text>
              </View>
              <View style={[styles.hydrationCard, { backgroundColor: COLORS.success + '12' }]}>
                <Ionicons name="fitness" size={24} color={COLORS.success} />
                <Text style={[styles.hydrationValue, { color: COLORS.success }]}>{hydration.training_days}</Text>
                <Text style={[styles.hydrationLabel, { color: COLORS.textSecondary }]}>Jours d'entraînement</Text>
              </View>
            </View>
          </View>
        )}

        {/* Supplémentation */}
        {(supps.essential || supps.performance) && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>💊 Supplémentation</Text>
            {supps.essential && supps.essential.length > 0 && (
              <>
                <Text style={[styles.suppCategory, { color: COLORS.success }]}>✅ Essentiels</Text>
                {supps.essential.map((s, i) => (
                  <View key={i} style={[styles.suppCard, { backgroundColor: COLORS.background }]}>
                    <Text style={[styles.suppName, { color: COLORS.text }]}>{typeof s === 'string' ? s : s.name}</Text>
                    {typeof s === 'object' && (
                      <>
                        <Text style={[styles.suppDose, { color: COLORS.textSecondary }]}>{s.dose} • {s.timing}</Text>
                        <Text style={[styles.suppReason, { color: COLORS.textSecondary }]}>{s.reason}</Text>
                      </>
                    )}
                  </View>
                ))}
              </>
            )}
            {supps.performance && supps.performance.length > 0 && (
              <>
                <Text style={[styles.suppCategory, { color: COLORS.warning }]}>⚡ Performance (optionnel)</Text>
                {supps.performance.map((s, i) => (
                  <View key={i} style={[styles.suppCard, { backgroundColor: COLORS.background }]}>
                    <Text style={[styles.suppName, { color: COLORS.text }]}>{typeof s === 'string' ? s : s.name}</Text>
                    {typeof s === 'object' && (
                      <Text style={[styles.suppDose, { color: COLORS.textSecondary }]}>{s.dose} • {s.timing}</Text>
                    )}
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Foods to Limit */}
        {nutrition.foods_to_limit && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🚫 Aliments à Limiter</Text>
            {nutrition.foods_to_limit.map((food, i) => (
              <Text key={i} style={[styles.limitFoodText, { color: COLORS.text }]}>❌ {food}</Text>
            ))}
          </View>
        )}
      </>
    );
  };

  // ── RECOVERY ──
  const renderPlanRecovery = (plan) => {
    const recovery = plan.recovery_protocol || {};
    const sleep = recovery.sleep_optimization || {};
    const active = recovery.active_recovery || {};
    const mobility = recovery.mobility_program || {};
    const stress = recovery.stress_management || {};
    const injury = recovery.injury_prevention || {};

    return (
      <>
        {/* Sleep */}
        <View style={[section, { backgroundColor: COLORS.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: COLORS.secondary + '15' }]}>
              <Ionicons name="moon" size={20} color={COLORS.secondary} />
            </View>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>😴 Optimisation du Sommeil</Text>
          </View>
          <View style={[styles.sleepTarget, { backgroundColor: COLORS.secondary + '15' }]}>
            <Text style={[styles.sleepTargetText, { color: COLORS.secondary }]}>
              🎯 Objectif: {sleep.target_duration || '7-9h/nuit'}
            </Text>
          </View>
          {sleep.pre_sleep_protocol && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.recoverySubTitle, { color: COLORS.text }]}>Routine du soir:</Text>
              {sleep.pre_sleep_protocol.map((tip, i) => (
                <Text key={i} style={[styles.recoveryTipText, { color: COLORS.text }]}>🌙 {tip}</Text>
              ))}
            </View>
          )}
          {sleep.environment && (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.recoverySubTitle, { color: COLORS.text }]}>Environnement:</Text>
              {sleep.environment.map((env, i) => (
                <Text key={i} style={[styles.recoveryTipText, { color: COLORS.text }]}>🛏️ {env}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Active Recovery */}
        {active.activities && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🚶 Récupération Active</Text>
            <Text style={[styles.recoveryFrequency, { color: COLORS.textSecondary }]}>{active.frequency || ''}</Text>
            {active.activities.map((act, i) => (
              <View key={i} style={[styles.activityCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.activityName, { color: COLORS.text }]}>
                  {typeof act === 'string' ? act : `${act.activity} (${act.duration})`}
                </Text>
                {typeof act === 'object' && act.intensity && (
                  <Text style={[styles.activityIntensity, { color: COLORS.textSecondary }]}>{act.intensity}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Mobility */}
        {mobility.daily_minimum && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🧘 Programme de Mobilité</Text>
            <Text style={[styles.recoverySubTitle, { color: COLORS.primary }]}>Routine quotidienne ({mobility.daily_minimum.duration}):</Text>
            {mobility.daily_minimum.exercises && mobility.daily_minimum.exercises.map((ex, i) => (
              <Text key={i} style={[styles.mobilityExText, { color: COLORS.text }]}>• {ex}</Text>
            ))}
          </View>
        )}

        {/* Stress Management */}
        {stress.daily_practices && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🧠 Gestion du Stress</Text>
            {stress.daily_practices.map((p, i) => (
              <View key={i} style={[styles.stressPractice, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.stressPracticeName, { color: COLORS.text }]}>
                  {typeof p === 'string' ? p : p.practice}
                </Text>
                {typeof p === 'object' && (
                  <Text style={[styles.stressPracticeMeta, { color: COLORS.textSecondary }]}>
                    {p.duration} • {p.timing}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Injury Prevention */}
        {injury.principles && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🛡️ Prévention des Blessures</Text>
            {injury.principles.map((p, i) => (
              <Text key={i} style={[styles.injuryPrinciple, { color: COLORS.text }]}>⚕️ {p}</Text>
            ))}
            {injury.prehab_exercises && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.recoverySubTitle, { color: COLORS.warning }]}>Exercices de Prévention:</Text>
                {injury.prehab_exercises.map((group, i) => (
                  <View key={i} style={[styles.prehabGroup, { backgroundColor: COLORS.background }]}>
                    <Text style={[styles.prehabTarget, { color: COLORS.primary }]}>
                      {typeof group === 'string' ? group : `🎯 ${group.target}`}
                    </Text>
                    {typeof group === 'object' && group.exercises && group.exercises.map((ex, j) => (
                      <Text key={j} style={[styles.prehabExText, { color: COLORS.text }]}>  • {ex}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </>
    );
  };

  // ── GOALS ──
  const renderPlanGoals = (plan) => {
    const goals = plan.smart_goals || {};
    const monitoring = plan.monitoring_plan || {};
    const strengths = plan.strength_standards || {};
    const insights = plan.ai_coaching_insights || {};

    return (
      <>
        {/* Duration */}
        <View style={[styles.section, { backgroundColor: COLORS.primary }]}>
          <Text style={[styles.goalsDurationTitle, { color: 'white' }]}>📅 Durée du Programme</Text>
          <Text style={[styles.goalsDurationText, { color: 'rgba(255,255,255,0.9)' }]}>
            {goals.program_duration || '—'}
          </Text>
          <View style={styles.goalsDates}>
            <Text style={styles.goalsDate}>Début: {goals.start_date || '—'}</Text>
            <Text style={styles.goalsDate}>Fin: {goals.target_end_date || '—'}</Text>
          </View>
        </View>

        {/* Body Composition Goals */}
        {goals.body_composition_goals && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🎯 Objectifs Composition Corporelle</Text>
            {Object.entries(goals.body_composition_goals).map(([key, value]) => (
              <View key={key} style={[styles.goalRow, { borderBottomColor: COLORS.border }]}>
                <Text style={[styles.goalLabel, { color: COLORS.textSecondary }]}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Text>
                <Text style={[styles.goalValue, { color: COLORS.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Monthly Milestones */}
        {goals.monthly_milestones && goals.monthly_milestones.length > 0 && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🏆 Jalons Mensuels</Text>
            {goals.monthly_milestones.map((milestone, i) => (
              <View key={i} style={[styles.milestoneCard, { backgroundColor: COLORS.background }]}>
                <View style={[styles.milestoneHeader, { borderBottomColor: COLORS.border }]}>
                  <Text style={[styles.milestoneMonth, { color: COLORS.primary }]}>
                    📌 {milestone.title || `Mois ${milestone.month}`}
                  </Text>
                </View>
                {milestone.checkpoints && milestone.checkpoints.map((cp, j) => (
                  <Text key={j} style={[styles.milestoneCheck, { color: COLORS.text }]}>{cp}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Lifestyle Goals */}
        {goals.lifestyle_goals && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🌟 Objectifs Mode de Vie</Text>
            {Object.entries(goals.lifestyle_goals).map(([key, value]) => (
              <View key={key} style={styles.lifestyleGoalRow}>
                <Text style={[styles.lifestyleIcon]}>{
                  key === 'sleep' ? '😴' : key === 'hydration' ? '💧' :
                  key === 'steps' ? '🚶' : key === 'stress' ? '🧠' : '🥗'
                }</Text>
                <Text style={[styles.lifestyleText, { color: COLORS.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Strength Standards */}
        {strengths.beginner && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>💪 Standards de Force</Text>
            {Object.entries(strengths).map(([level, lifts]) => (
              <View key={level} style={[styles.strengthLevel, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.strengthLevelTitle, { color: COLORS.primary }]}>
                  {level === 'beginner' ? '🟢 Débutant' : level === 'intermediate' ? '🟡 Intermédiaire' : '🔴 Avancé'}
                </Text>
                <View style={styles.strengthLifts}>
                  {Object.entries(lifts).map(([lift, value]) => (
                    <View key={lift} style={styles.strengthLift}>
                      <Text style={[styles.strengthLiftName, { color: COLORS.textSecondary }]}>{lift}</Text>
                      <Text style={[styles.strengthLiftValue, { color: COLORS.text }]}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Mindset Tips */}
        {insights.mindset_tips && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🧠 Conseils Mindset</Text>
            {insights.mindset_tips.map((tip, i) => (
              <Text key={i} style={[styles.mindsetTip, { color: COLORS.text }]}>💭 {tip}</Text>
            ))}
          </View>
        )}

        {/* Expected Timeline */}
        {insights.expected_timeline && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>⏱️ Timeline Attendue</Text>
            {Object.entries(insights.expected_timeline).map(([key, value]) => (
              <View key={key} style={[styles.timelineExpected, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.timelineExpectedLabel, { color: COLORS.primary }]}>
                  {key === 'first_results_visible' ? '👀 Premiers résultats' :
                   key === 'significant_transformation' ? '🔥 Transformation significative' :
                   '🌟 Intégration mode de vie'}
                </Text>
                <Text style={[styles.timelineExpectedValue, { color: COLORS.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Monitoring */}
        {monitoring.deload_protocol && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>📋 Protocole de Décharge</Text>
            <Text style={[styles.deloadFreq, { color: COLORS.primary }]}>{monitoring.deload_protocol.frequency}</Text>
            {monitoring.deload_protocol.signs_deload_needed && monitoring.deload_protocol.signs_deload_needed.map((sign, i) => (
              <Text key={i} style={[styles.deloadSign, { color: COLORS.text }]}>⚠️ {sign}</Text>
            ))}
          </View>
        )}
      </>
    );
  };

  // ── LEGACY PLAN RENDERER (backwards compatibility) ──
  const renderLegacyFitnessPlan = (plan) => {
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {plan.personal_profile_summary && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🎯 Profil Personnel</Text>
            <View style={[styles.profileCard, { backgroundColor: COLORS.background }]}>
              <Text style={[styles.profileStatus, { color: COLORS.text }]}>{plan.personal_profile_summary.current_status}</Text>
              {plan.personal_profile_summary.strengths && (
                <View style={styles.profileList}>
                  <Text style={[styles.profileListTitle, { color: COLORS.text }]}>Points Forts:</Text>
                  {plan.personal_profile_summary.strengths.map((strength, index) => (
                    <View key={index} style={styles.profileListItem}>
                      <Text style={styles.profileListBullet}>✅</Text>
                      <Text style={[styles.profileListText, { color: COLORS.textSecondary }]}>{strength}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {plan.phase_1_microcycle_4_semaines && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🏋️ Phase 1 - Microcycle (4 semaines)</Text>
            {plan.phase_1_microcycle_4_semaines.weekly_structure && (
              <View style={styles.weeklyStructure}>
                {Object.entries(plan.phase_1_microcycle_4_semaines.weekly_structure).map(([day, workoutData]) => (
                  <View key={day} style={[styles.workoutDay, { backgroundColor: COLORS.background }]}>
                    <Text style={[styles.workoutDayTitle, { color: COLORS.text }]}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                      {workoutData.focus && ` - ${workoutData.focus}`}
                    </Text>
                    {workoutData.workout && Array.isArray(workoutData.workout) && (
                      <View style={styles.workoutExercises}>
                        {workoutData.workout.map((exercise, index) => (
                          <Text key={index} style={[styles.workoutExercise, { color: COLORS.text }]}>• {exercise}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {plan.nutrition_strategy && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🥗 Stratégie Nutritionnelle</Text>
            {plan.nutrition_strategy.caloric_target && (
              <View style={[styles.nutritionCard, { backgroundColor: COLORS.background }]}>
                <View style={styles.nutritionRow}>
                  <Text style={[styles.nutritionLabel, { color: COLORS.textSecondary }]}>Maintien:</Text>
                  <Text style={[styles.nutritionValue, { color: COLORS.text }]}>{plan.nutrition_strategy.caloric_target.maintenance}</Text>
                </View>
                <View style={styles.nutritionRow}>
                  <Text style={[styles.nutritionLabel, { color: COLORS.textSecondary }]}>Objectif:</Text>
                  <Text style={[styles.nutritionValue, { color: COLORS.text }]}>{plan.nutrition_strategy.caloric_target.goal}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {plan.recovery_protocol && (
          <View style={[section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>😴 Protocole de Récupération</Text>
            <View style={styles.recoveryGrid}>
              {plan.recovery_protocol.sleep && (
                <View style={[styles.recoveryCard, { backgroundColor: COLORS.background }]}>
                  <Text style={[styles.recoveryCardTitle, { color: COLORS.text }]}>💤 Sommeil</Text>
                  <Text style={[styles.recoveryText, { color: COLORS.text }]}>{plan.recovery_protocol.sleep.duration}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: COLORS.background }]}>
      {renderHeader()}
      
      <View style={[styles.tabNavigation, { backgroundColor: COLORS.card, ...cardBorder }, dmShadow.sm]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analysis' && [styles.activeTab, { backgroundColor: COLORS.primary }]]}
          onPress={() => setActiveTab('analysis')}
        >
          <Ionicons 
            name="analytics" 
            size={18} 
            color={activeTab === 'analysis' ? 'white' : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText, 
            { color: activeTab === 'analysis' ? 'white' : COLORS.textSecondary }]}>
            Analyse
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'fitness' && [styles.activeTab, { backgroundColor: COLORS.primary }]]}
          onPress={() => setActiveTab('fitness')}
        >
          <Ionicons 
            name="fitness" 
            size={18} 
            color={activeTab === 'fitness' ? 'white' : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'fitness' && styles.activeTabText,
            { color: activeTab === 'fitness' ? 'white' : COLORS.textSecondary }]}>
            Fitness
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'analysis' ? renderAnalysisTab() : renderFitnessTab()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  shareButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabNavigation: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 18,
    padding: 5,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    gap: 8,
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeTabText: {
    color: 'white',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  multiViewIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    padding: 8,
    borderRadius: 8,
  },
  multiViewIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  gradeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  gradeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  scoreBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  multiViewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  multiViewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  mediaScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  mediaCard: {
    width: 180,
    marginRight: 12,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 8,
  },
  mediaLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 4,
  },
  viewScoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  viewScoreText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '700',
  },
  multiViewInfoContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  multiViewInfo: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  analysisMethod: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: 'rgba(128,128,128,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  scoreRingInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  scoreProgress: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 60,
    borderWidth: 8,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
    padding: 8,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailedAnalysis: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailedTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailKey: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  issuesContainer: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  issuesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  issueCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  issueDetails: {
    marginTop: 8,
  },
  issueImpact: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  issuePriority: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  issueDetectedIn: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  recommendationsContainer: {
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  recommendationCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  recommendationCategory: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  exerciseBullet: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
  },
  exerciseText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  recommendationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  recommendationFrequency: {
    fontSize: 12,
  },
  recommendationDuration: {
    fontSize: 12,
  },
  actionSection: {
    marginTop: 8,
    marginBottom: 32,
    gap: 12,
  },
  actionButton: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryButton: {},
  secondaryButton: {},
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextDisabled: {
    color: '#CCCCCC',
  },
  emptyTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  generateButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 18,
    ...SHADOWS.md,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  profileCard: {
    borderRadius: 16,
    padding: 16,
  },
  profileStatus: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  profileList: {
    marginTop: 12,
  },
  profileListTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  profileListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  profileListBullet: {
    fontSize: 12,
    marginRight: 8,
    marginTop: 2,
  },
  profileListText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  objectivesContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  objectivesTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  objectiveBullet: {
    fontSize: 14,
    marginRight: 10,
    marginTop: 2,
  },
  objectiveText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  weeklyStructure: {
    gap: 16,
  },
  workoutDay: {
    borderRadius: 16,
    padding: 16,
  },
  workoutDayTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  workoutExercises: {
    marginBottom: 12,
  },
  workoutExercise: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  workoutMeta: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
    paddingTop: 12,
  },
  workoutMetaText: {
    fontSize: 12,
    marginBottom: 6,
  },
  workoutNotes: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  nutritionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  nutritionSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutritionLabel: {
    fontSize: 14,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  macroSection: {
    marginBottom: 16,
  },
  macroTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  macroDetail: {
    fontSize: 13,
    marginBottom: 4,
  },
  macroSources: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  recoveryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  recoveryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  recoveryCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  recoveryText: {
    fontSize: 14,
    marginBottom: 12,
  },
  recoveryTips: {
    marginTop: 8,
  },
  recoveryTip: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
  recoveryActivities: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Styles pour les nouvelles sections ajoutées
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  measurementCard: {
    width: (width - 96) / 3,
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  measurementIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  measurementValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  measurementLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  measurementInterpretation: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  metricsSection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginLeft: 4,
  },
  detailedGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailedCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  detailedLabel: {
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  detailedValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  detailedSubtext: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  componentsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  componentCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  componentLabel: {
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'center',
  },
  componentValue: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  yoloContainer: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  yoloHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yoloTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  yoloDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yoloClass: {
    fontSize: 14,
  },
  yoloClassValue: {
    fontWeight: '700',
  },
  yoloGender: {
    fontSize: 14,
  },
  yoloGenderValue: {
    fontWeight: '700',
  },
  metadataContainer: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  metadataTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  techTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  techTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  techTagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  realCaseNote: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  scheduleSection: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  scheduleDay: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  scheduleDayLabel: {
    fontSize: 14,
    fontWeight: '700',
    width: 100,
  },
  scheduleActivity: {
    fontSize: 14,
    flex: 1,
  },
  trackingSection: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  trackingGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  trackingCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
  },
  trackingCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  trackingItem: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
  recommendationCategory: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationBullet: {
    fontSize: 14,
    marginRight: 10,
    marginTop: 2,
  },
  recommendationText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // ══════════════════════════════════════════════════
  // V3 INTELLIGENT FITNESS PLAN STYLES
  // ══════════════════════════════════════════════════

  // Sub-navigation
  planSubNav: {
    marginBottom: 14,
    paddingVertical: 4,
  },
  planSubNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: 'rgba(128,128,128,0.08)',
    gap: 6,
  },
  planSubNavText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Hero card
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroStat: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroStatValue: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    height: 36,
  },

  // AI Insights
  insightMessage: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  priorityNumber: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityNumberText: {
    fontSize: 14,
    fontWeight: '800',
  },
  priorityText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // Athletic Profile
  profileStatusText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  profileSubTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  profileListItemText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 4,
  },
  idealWeightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  idealWeightText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Timeline
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingLeft: 4,
    position: 'relative',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 10,
    top: 18,
    bottom: -16,
    width: 2,
  },
  timelineContent: {
    marginLeft: 14,
    flex: 1,
  },
  timelinePhase: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  timelineDuration: {
    fontSize: 12,
  },

  // Phases
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phaseIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseIconText: {
    fontSize: 22,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  phaseMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  phaseDetail: {
    marginTop: 16,
    gap: 12,
  },
  phaseSection: {
    borderRadius: 14,
    padding: 14,
  },
  phaseSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  objectiveRowText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  phaseDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  phaseDetailLabel: {
    fontSize: 13,
  },
  phaseDetailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  indicatorText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },

  // Training
  splitBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: -4,
  },
  splitBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  dayFocus: {
    fontSize: 12,
    marginTop: 2,
  },
  dayDuration: {
    fontSize: 11,
  },
  dayIntensity: {
    fontSize: 10,
    marginTop: 2,
  },
  exercisesList: {
    marginTop: 14,
    gap: 8,
  },
  exerciseCard: {
    borderRadius: 14,
    padding: 14,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  exerciseDetails: {
    marginTop: 8,
  },
  exerciseMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  exerciseMetaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  exerciseMetaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  exerciseNotes: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  ruleText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },

  // Nutrition
  caloricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  caloricCard: {
    flex: 1,
    minWidth: (width - 96) / 3,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  caloricLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 6,
  },
  caloricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  adjustmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  adjustmentText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  macroCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  macroPercentage: {
    fontSize: 14,
    fontWeight: '800',
  },
  macroDetails: {
    gap: 4,
  },
  macroDetailText: {
    fontSize: 13,
    lineHeight: 18,
  },
  mealCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  mealTime: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  mealComposition: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  mealExample: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  hydrationGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  hydrationCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  hydrationValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  hydrationLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  suppCategory: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  suppCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 6,
  },
  suppName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  suppDose: {
    fontSize: 12,
    marginBottom: 2,
  },
  suppReason: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  limitFoodText: {
    fontSize: 13,
    lineHeight: 22,
  },

  // Recovery
  sleepTarget: {
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  sleepTargetText: {
    fontSize: 15,
    fontWeight: '800',
  },
  recoverySubTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  recoveryTipText: {
    fontSize: 13,
    lineHeight: 22,
  },
  recoveryFrequency: {
    fontSize: 13,
    marginBottom: 10,
  },
  activityCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 6,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '500',
  },
  activityIntensity: {
    fontSize: 12,
    marginTop: 2,
  },
  mobilityExText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  stressPractice: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 6,
  },
  stressPracticeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  stressPracticeMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  injuryPrinciple: {
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 4,
  },
  prehabGroup: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 6,
  },
  prehabTarget: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  prehabExText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Goals
  goalsDurationTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  goalsDurationText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  goalsDates: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  goalsDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  goalLabel: {
    fontSize: 13,
    flex: 1,
  },
  goalValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  milestoneCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  milestoneHeader: {
    padding: 12,
    borderBottomWidth: 1,
  },
  milestoneMonth: {
    fontSize: 14,
    fontWeight: '800',
  },
  milestoneCheck: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  lifestyleGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  lifestyleIcon: {
    fontSize: 20,
  },
  lifestyleText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  strengthLevel: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  strengthLevelTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  strengthLifts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  strengthLift: {
    alignItems: 'center',
    minWidth: 80,
  },
  strengthLiftName: {
    fontSize: 11,
    marginBottom: 2,
  },
  strengthLiftValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  mindsetTip: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  timelineExpected: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  timelineExpectedLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  timelineExpectedValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  deloadFreq: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  deloadSign: {
    fontSize: 13,
    lineHeight: 22,
  },
});

export default AnalysisScreen;