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
import { getThemeColors } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const AnalysisScreen = ({ route, navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  
  const { analysis: initialAnalysis } = route.params;
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [fitnessPlan, setFitnessPlan] = useState(initialAnalysis.fitness_plan || null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [refreshing, setRefreshing] = useState(false);

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
    <View style={[styles.header, { backgroundColor: COLORS.card }]}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Analyse Corporelle </Text>
        <Text style={[styles.headerSubtitle, { color: COLORS.textSecondary }]}>
          ID: #{analysis.id || analysis.analysis_id || 'N/A'}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.shareButton}
        onPress={() => Alert.alert('Partager', 'Fonctionnalité à venir')}
      >
        <Ionicons name="share-social" size={22} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderMediaSection = () => {
    const imageUrls = analysis.multi_view_images || analysis.image_urls || {};
    const hasMultipleImages = Object.keys(imageUrls).length > 1;
    const multiViewData = analysis.analysis?.multi_view_data || {};
    
    return (
      <View style={[styles.section, { backgroundColor: COLORS.card }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
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
      <View style={[styles.section, { backgroundColor: COLORS.card }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
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
          <View style={[styles.multiViewIndicator, { backgroundColor: 'rgba(138,43,226,0.05)' }]}>
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
          <View style={[styles.confidenceContainer, { backgroundColor: 'rgba(52,199,89,0.05)' }]}>
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
          <View style={[styles.detailedAnalysis, { backgroundColor: 'rgba(0,122,255,0.05)' }]}>
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
          <View style={[styles.issuesContainer, { backgroundColor: 'rgba(255,59,48,0.05)' }]}>
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
          <View style={[styles.recommendationsContainer, { backgroundColor: 'rgba(52,199,89,0.05)' }]}>
            <View style={styles.recommendationsHeader}>
              <Ionicons name="bulb" size={18} color={COLORS.success} />
              <Text style={[styles.recommendationsTitle, { color: COLORS.success }]}>Recommandations Ciblées</Text>
            </View>
            {postureAnalysis.improvement_recommendations.map((rec, index) => (
              <View key={index} style={[styles.recommendationCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
                <Text style={[styles.recommendationCategory, { color: COLORS.primary }]}>{rec.category}:</Text>
                {rec.exercises && rec.exercises.map((exercise, exIndex) => (
                  <View key={exIndex} style={styles.exerciseItem}>
                    <Text style={styles.exerciseBullet}>•</Text>
                    <Text style={[styles.exerciseText, { color: COLORS.text }]}>{exercise}</Text>
                  </View>
                ))}
                <View style={styles.recommendationMeta}>
                  {rec.frequency && (
                    <Text style={[styles.recommendationFrequency, { color: COLORS.textSecondary }]}>Fréquence: {rec.frequency}</Text>
                  )}
                  {rec.duration && (
                    <Text style={[styles.recommendationDuration, { color: COLORS.textSecondary }]}>Durée: {rec.duration}</Text>
                  )}
                </View>
              </View>
            ))}
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
      <View style={[styles.section, { backgroundColor: COLORS.card }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
            <MaterialIcons name="monitor-weight" size={20} color={COLORS.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>⚖️ Composition Corporelle Complète</Text>
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
              <View style={[styles.measurementIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                <MaterialIcons name="scale" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.measurementValue, { color: COLORS.primary }]}>
                {basicMetrics.weight || 'N/A'}
              </Text>
              <Text style={[styles.measurementLabel, { color: COLORS.textSecondary }]}>POIDS</Text>
            </View>
            
            <View style={[styles.measurementCard, { backgroundColor: COLORS.background }]}>
              <View style={[styles.measurementIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                <MaterialIcons name="height" size={20} color={COLORS.primary} />
              </View>
              <Text style={[styles.measurementValue, { color: COLORS.primary }]}>
                {basicMetrics.height || 'N/A'}
              </Text>
              <Text style={[styles.measurementLabel, { color: COLORS.textSecondary }]}>TAILLE</Text>
            </View>

            <View style={[styles.measurementCard, { backgroundColor: COLORS.background }]}>
              <View style={[styles.measurementIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
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
        {yoloDetection.detected_class && yoloDetection.detected_class !== "Non détecté" && (
          <View style={[styles.yoloContainer, { backgroundColor: 'rgba(138,43,226,0.05)' }]}>
            <View style={styles.yoloHeader}>
              <View style={[styles.aiIcon, { backgroundColor: 'rgba(138,43,226,0.1)' }]}>
                <Ionicons name="hardware-chip" size={16} color={COLORS.secondary} />
              </View>
              <Text style={[styles.yoloTitle, { color: COLORS.text }]}>Détection IA YOLOv8</Text>
              <View style={[styles.confidenceBadge, { backgroundColor: 'rgba(138,43,226,0.2)' }]}>
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
        )}

        {/* Métadonnées d'analyse */}
        {analysis.analysis?.analysis_metadata && (
          <View style={[styles.metadataContainer, { 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            borderColor: COLORS.border 
          }]}>
            <Text style={[styles.metadataTitle, { color: COLORS.textSecondary }]}>🔬 Technologies utilisées:</Text>
            <View style={styles.techTags}>
              {analysis.analysis.analysis_metadata.engine_used && (
                <View style={[styles.techTag, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                  <Text style={[styles.techTagText, { color: COLORS.primary }]}>{analysis.analysis.analysis_metadata.engine_used}</Text>
                </View>
              )}
              {analysis.analysis.analysis_metadata.formulas_used && 
               analysis.analysis.analysis_metadata.formulas_used.map((formula, index) => (
                <View key={index} style={[styles.techTag, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
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
      <View style={[styles.section, { backgroundColor: COLORS.card }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
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
              <View style={[styles.trackingCard, { backgroundColor: 'rgba(0,122,255,0.05)' }]}>
                <Text style={[styles.trackingCardTitle, { color: COLORS.text }]}>Mesures Hebdomadaires</Text>
                {recommendations.progress_tracking.weekly_measurements && 
                 recommendations.progress_tracking.weekly_measurements.map((item, index) => (
                  <Text key={index} style={[styles.trackingItem, { color: COLORS.textSecondary }]}>• {item}</Text>
                ))}
              </View>
              
              <View style={[styles.trackingCard, { backgroundColor: 'rgba(0,122,255,0.05)' }]}>
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
          style={[styles.actionButton, styles.primaryButton]}
          onPress={generateFitnessPlan}
          disabled={isGeneratingPlan}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons 
              name="barbell" 
              size={22} 
              color={isGeneratingPlan ? COLORS.textSecondary : "white"} 
            />
            <Text style={[
              styles.primaryButtonText,
              isGeneratingPlan && styles.buttonTextDisabled
            ]}>
              {isGeneratingPlan ? '🔄 Génération...' : 'Générer Plan Fitness Intelligent'}
            </Text>
          </View>
          {!isGeneratingPlan && (
            <Ionicons name="arrow-forward" size={20} color="white" />
          )}
        </TouchableOpacity>
        
        {fitnessPlan && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => setActiveTab('fitness')}
          >
            <View style={styles.actionButtonContent}>
              <Ionicons name="fitness" size={22} color="white" />
              <Text style={styles.secondaryButtonText}>
                Voir le Plan Fitness {analysis.plan_type === 'intelligent' ? 'Intelligent' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="white" />
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
    
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {plan.personal_profile_summary && (
          <View style={[styles.section, { backgroundColor: COLORS.card }]}>
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
          <View style={[styles.section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🏋️ Phase 1 - Microcycle (4 semaines)</Text>
            
            {plan.phase_1_microcycle_4_semaines.objectives && (
              <View style={[styles.objectivesContainer, { backgroundColor: 'rgba(0,122,255,0.05)' }]}>
                <Text style={[styles.objectivesTitle, { color: COLORS.primary }]}>Objectifs:</Text>
                {plan.phase_1_microcycle_4_semaines.objectives.map((objective, index) => (
                  <View key={index} style={styles.objectiveItem}>
                    <Text style={styles.objectiveBullet}>🎯</Text>
                    <Text style={[styles.objectiveText, { color: COLORS.text }]}>{objective}</Text>
                  </View>
                ))}
              </View>
            )}
            
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
                    
                    <View style={styles.workoutMeta}>
                      {workoutData.intensity && (
                        <Text style={[styles.workoutMetaText, { color: COLORS.textSecondary }]}>Intensité: {workoutData.intensity}</Text>
                      )}
                      {workoutData.notes && (
                        <Text style={[styles.workoutNotes, { color: COLORS.textSecondary }]}>{workoutData.notes}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {plan.nutrition_strategy && (
          <View style={[styles.section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>🥗 Stratégie Nutritionnelle</Text>
            
            {plan.nutrition_strategy.caloric_target && (
              <View style={[styles.nutritionCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.nutritionSectionTitle, { color: COLORS.text }]}>🎯 Cible Calorique</Text>
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
            
            {plan.nutrition_strategy.macronutrient_split && (
              <View style={[styles.nutritionCard, { backgroundColor: COLORS.background }]}>
                <Text style={[styles.nutritionSectionTitle, { color: COLORS.text }]}>⚖️ Répartition des Macronutriments</Text>
                
                {plan.nutrition_strategy.macronutrient_split.protein && (
                  <View style={styles.macroSection}>
                    <Text style={[styles.macroTitle, { color: COLORS.text }]}>Protéines:</Text>
                    <Text style={[styles.macroDetail, { color: COLORS.text }]}>{plan.nutrition_strategy.macronutrient_split.protein.grams_per_kg}</Text>
                    <Text style={[styles.macroDetail, { color: COLORS.text }]}>{plan.nutrition_strategy.macronutrient_split.protein.total_grams}</Text>
                    {plan.nutrition_strategy.macronutrient_split.protein.sources && (
                      <Text style={[styles.macroSources, { color: COLORS.textSecondary }]}>
                        Sources: {plan.nutrition_strategy.macronutrient_split.protein.sources.join(', ')}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {plan.recovery_protocol && (
          <View style={[styles.section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>😴 Protocole de Récupération</Text>
            
            <View style={styles.recoveryGrid}>
              {plan.recovery_protocol.sleep && (
                <View style={[styles.recoveryCard, { backgroundColor: COLORS.background }]}>
                  <Text style={[styles.recoveryCardTitle, { color: COLORS.text }]}>💤 Sommeil</Text>
                  <Text style={[styles.recoveryText, { color: COLORS.text }]}>{plan.recovery_protocol.sleep.duration}</Text>
                  {plan.recovery_protocol.sleep.quality_tips && (
                    <View style={styles.recoveryTips}>
                      {plan.recovery_protocol.sleep.quality_tips.map((tip, index) => (
                        <Text key={index} style={[styles.recoveryTip, { color: COLORS.textSecondary }]}>• {tip}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
              
              {plan.recovery_protocol.active_recovery && (
                <View style={[styles.recoveryCard, { backgroundColor: COLORS.background }]}>
                  <Text style={[styles.recoveryCardTitle, { color: COLORS.text }]}>🚶 Récupération Active</Text>
                  <Text style={[styles.recoveryText, { color: COLORS.text }]}>{plan.recovery_protocol.active_recovery.frequency}</Text>
                  {plan.recovery_protocol.active_recovery.activities && (
                    <Text style={[styles.recoveryActivities, { color: COLORS.textSecondary }]}>
                      {plan.recovery_protocol.active_recovery.activities.join(', ')}
                    </Text>
                  )}
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
      
      <View style={[styles.tabNavigation, { backgroundColor: COLORS.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analysis' && [styles.activeTab, { backgroundColor: COLORS.primary }]]}
          onPress={() => setActiveTab('analysis')}
        >
          <Ionicons 
            name="analytics" 
            size={20} 
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
            size={20} 
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
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  shareButton: {
    padding: 8,
    borderRadius: 12,
  },
  tabNavigation: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {},
  tabText: {
    fontSize: 15,
    fontWeight: '600',
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    borderRadius: 20,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  multiViewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  multiViewBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
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
    borderRadius: 12,
    marginBottom: 8,
  },
  mediaLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
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
    fontWeight: 'bold',
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
    borderColor: 'rgba(0,0,0,0.1)',
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
    fontWeight: 'bold',
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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
    borderRadius: 16,
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
    fontWeight: 'bold',
  },
  issueCard: {
    borderRadius: 12,
    padding: 12,
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
    borderRadius: 12,
    marginLeft: 8,
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold',
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
    borderRadius: 16,
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
    fontWeight: 'bold',
  },
  recommendationCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  recommendationCategory: {
    fontSize: 15,
    fontWeight: 'bold',
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
    borderTopColor: 'rgba(0,0,0,0.1)',
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
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {},
  secondaryButton: {},
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileCard: {
    borderRadius: 12,
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
    fontWeight: 'bold',
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  objectivesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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
    borderRadius: 12,
    padding: 16,
  },
  workoutDayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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
    borderTopColor: 'rgba(0,0,0,0.1)',
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  nutritionSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
  },
  macroSection: {
    marginBottom: 16,
  },
  macroTitle: {
    fontSize: 15,
    fontWeight: 'bold',
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
    borderRadius: 12,
    padding: 16,
  },
  recoveryCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
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
    borderRadius: 16,
    alignItems: 'center',
  },
  measurementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  measurementValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  measurementLabel: {
    fontSize: 12,
    fontWeight: '600',
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
    fontWeight: 'bold',
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
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailedLabel: {
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  detailedValue: {
    fontSize: 16,
    fontWeight: 'bold',
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
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  componentLabel: {
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'center',
  },
  componentValue: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  yoloContainer: {
    borderRadius: 16,
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
  },
  yoloGender: {
    fontSize: 14,
  },
  yoloGenderValue: {
    fontWeight: 'bold',
  },
  metadataContainer: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  metadataTitle: {
    fontSize: 12,
    fontWeight: 'bold',
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  scheduleDay: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  scheduleDayLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 100,
  },
  scheduleActivity: {
    fontSize: 14,
    flex: 1,
  },
  trackingSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  trackingGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  trackingCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  trackingCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
});

export default AnalysisScreen;