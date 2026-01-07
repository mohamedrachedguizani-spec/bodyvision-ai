// HomeScreen.js
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
import { getThemeColors } from '../utils/constants';
import AnalysisCard from '../components/AnalysisCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';

const SwipeableAnalysisCard = ({ analysis, onPress, onDelete }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  
  const translateX = useRef(new Animated.Value(0)).current;
  const [isSwiped, setIsSwiped] = useState(false);
  const swipeThreshold = -80;
  const cardRef = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 2);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -80));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < swipeThreshold || gestureState.vx < -0.5) {
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
            tension: 60,
            friction: 8,
          }).start();
          setIsSwiped(true);
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
    setIsSwiped(false);
  };

  const handleDelete = () => {
    resetPosition();
    onDelete();
  };

  const handlePress = () => {
    if (isSwiped) {
      resetPosition();
    } else {
      onPress();
    }
  };

  const handleCardPress = () => {
    handlePress();
  };

  return (
    <View style={[styles.swipeableContainer, { backgroundColor: COLORS.background }]}>
      <View style={[styles.deleteAction, { backgroundColor: COLORS.error }]}>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={20} color="white" />
          <Text style={styles.deleteText}>Supprimer</Text>
        </TouchableOpacity>
      </View>

      <Animated.View
        ref={cardRef}
        style={[
          styles.swipeableCard,
          { transform: [{ translateX }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          onPress={handleCardPress} 
          activeOpacity={0.7}
          style={styles.cardTouchable}
        >
          <AnalysisCard
            analysis={analysis}
            onPress={handleCardPress}
            compact={true}
          />
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

  const loadAnalyses = async () => {
    try {
      console.log('📥 Loading user analyses...');
      const response = await analysisAPI.getUserAnalyses();
      
      const formattedAnalyses = response.data.map(analysis => {
        const createImageUrl = (pathOrFilename) => {
          if (!pathOrFilename) return null;
          if (pathOrFilename.startsWith('http')) return pathOrFilename;
          if (pathOrFilename.includes('/')) {
            const filename = pathOrFilename.split('/').pop();
            return `http://192.168.1.114:8000/uploads/${filename}`;
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
        
        return {
          id: analysis.id,
          analysis_id: analysis.id,
          image_url: imageUrl,
          image_path: analysis.image_path,
          multi_view_images: multiViewImages,
          analysis_data: analysis.analysis_data,
          fitness_plan: analysis.fitness_plan,
          created_at: analysis.created_at,
          has_fitness_plan: analysis.has_fitness_plan || false,
          plan_type: analysis.plan_type || 'basic'
        };
      });
      
      const sortedAnalyses = formattedAnalyses.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      setAnalyses(sortedAnalyses);
    } catch (error) {
      console.error('❌ Error loading analyses:', error);
      Alert.alert(
        'Erreur',
        error.response?.status === 401 
          ? 'Session expirée. Veuillez vous reconnecter.'
          : 'Impossible de charger vos analyses.',
        error.response?.status === 401 ? [
          { text: 'OK', onPress: () => logout() }
        ] : [{ text: 'Réessayer' }]
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAnalyses();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalyses();
  };

  const handleNewAnalysis = () => {
    navigation.navigate('Camera');
  };

  const handleAnalysisPress = async (analysis) => {
    try {
      if (analysis.analysis_data && analysis.fitness_plan !== undefined) {
        navigation.navigate('Analysis', { 
          analysis: {
            id: analysis.id,
            analysis_id: analysis.id,
            image_url: analysis.image_url,
            image_path: analysis.image_path,
            multi_view_images: analysis.multi_view_images,
            analysis: analysis.analysis_data,
            fitness_plan: analysis.fitness_plan,
            plan_type: analysis.plan_type,
            created_at: analysis.created_at
          }
        });
      } else {
        const response = await analysisAPI.getAnalysisDetails(analysis.id);
        const analysisData = response.data;
        navigation.navigate('Analysis', { 
          analysis: {
            id: analysisData.id,
            analysis_id: analysisData.id,
            image_url: analysisData.image_path 
              ? (analysisData.image_path.startsWith('/') 
                  ? `http://192.168.1.114:8000${analysisData.image_path}`
                  : analysisData.image_path)
              : null,
            multi_view_images: analysisData.multi_view_images,
            analysis: analysisData.analysis_data,
            fitness_plan: analysisData.fitness_plan,
            plan_type: analysisData.plan_type,
            created_at: analysisData.created_at
          }
        });
      }
    } catch (error) {
      console.error('❌ Error loading analysis details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails');
    }
  };

  const handleDeleteAnalysis = async (analysisId) => {
    Alert.alert(
      'Supprimer l\'analyse',
      'Êtes-vous sûr de vouloir supprimer cette analyse ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await analysisAPI.deleteAnalysis(analysisId);
              
              setAnalyses(analyses.filter(a => a.id !== analysisId));
              
              Alert.alert('Succès', 'Analyse supprimée avec succès');
            } catch (error) {
              console.error('❌ Error deleting analysis:', error);
              Alert.alert(
                'Erreur', 
                error.response?.data?.detail || 'Impossible de supprimer l\'analyse'
              );
            }
          }
        },
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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <LoadingSpinner message="Chargement de vos analyses..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { backgroundColor: COLORS.card }]}>
        <View style={styles.userInfo}>
          <TouchableOpacity 
            style={[
              styles.profileButton, 
              { 
                backgroundColor: COLORS.primary + '10',
                borderColor: COLORS.primary + '30' 
              }
            ]} 
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.profileAvatar, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.profileInitial}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Text>
            </View>
          </TouchableOpacity>
          <View>
            <Text style={[styles.greeting, { color: COLORS.textSecondary }]}>Bonjour,</Text>
            <Text style={[styles.userName, { color: COLORS.text }]}>{user?.first_name} {user?.last_name}</Text>
            <Text style={[styles.userEmail, { color: COLORS.textSecondary }]}>{user?.email}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.notificationButton, { backgroundColor: COLORS.background }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.mainAction, { backgroundColor: COLORS.primary }]}>
        <View style={styles.mainActionContent}>
          <View style={[styles.mainActionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="body" size={32} color="white" />
          </View>
          <View style={styles.mainActionText}>
            <Text style={styles.mainActionTitle}>
              Analyse Corporelle Avancée
            </Text>
            <Text style={styles.mainActionSubtitle}>
              Obtenez une analyse complète avec composition corporelle détaillée et plan fitness intelligent
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.scanButton, { backgroundColor: 'white' }]}
          onPress={handleNewAnalysis}
        >
          <Ionicons name="camera" size={20} color={COLORS.primary} />
          <Text style={[styles.scanButtonText, { color: COLORS.primary }]}>Nouvelle Analyse</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historySection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
            Historique des Analyses
          </Text>
          <Text style={[styles.analysisCount, { color: COLORS.textSecondary }]}>
            {analyses.length} analyse{analyses.length > 1 ? 's' : ''}
          </Text>
        </View>
        
        {analyses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="analytics-outline" size={60} color={COLORS.textSecondary} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: COLORS.text }]}>
              Aucune analyse
            </Text>
            <Text style={[styles.emptyStateText, { color: COLORS.textSecondary }]}>
              Commencez par créer votre première analyse corporelle avancée
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.analysesList}
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
            {analyses.map((analysis) => (
              <SwipeableAnalysisCard
                key={analysis.id}
                analysis={analysis}
                onPress={() => handleAnalysisPress(analysis)}
                onDelete={() => handleDeleteAnalysis(analysis.id)}
              />
            ))}
            <View style={styles.listBottomSpacer} />
          </ScrollView>
        )}
      </View>

      <View style={[styles.quickActions, { backgroundColor: COLORS.card }]}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle-outline" size={24} color={COLORS.primary} />
          <Text style={[styles.quickActionText, { color: COLORS.primary }]}>Profil</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('Help')}
        >
          <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
          <Text style={[styles.quickActionText, { color: COLORS.primary }]}>Aide</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
          <Text style={[styles.quickActionText, { color: COLORS.error }]}>
            Déconnexion
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 20,
    paddingBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profileButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  greeting: {
    fontSize: 14,
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainAction: {
    margin: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  mainActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  mainActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainActionText: {
    flex: 1,
  },
  mainActionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  mainActionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  scanButton: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  historySection: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  analysisCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  analysesList: {
    flex: 1,
  },
  listBottomSpacer: {
    height: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  quickAction: {
    alignItems: 'center',
    gap: 6,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  swipeableContainer: {
    position: 'relative',
    marginVertical: 6,
    height: undefined,
    minHeight: 92,
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 10,
    bottom: 10,
    width: 85,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  deleteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  swipeableCard: {
    position: 'relative',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  cardTouchable: {
    flex: 1,
  },
});

export default HomeScreen;