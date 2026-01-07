import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { analysisAPI } from '../services/api';
import { getThemeColors } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  
  const [analyses, setAnalyses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, logout } = useAuth();

  const loadAnalyses = async () => {
    try {
      console.log('📥 Loading user analyses for stats...');
      const response = await analysisAPI.getUserAnalyses();
      
      const formattedAnalyses = response.data.map(analysis => {
        return {
          id: analysis.id,
          analysis_data: analysis.analysis_data,
          fitness_plan: analysis.fitness_plan,
          has_fitness_plan: analysis.has_fitness_plan || false,
          plan_type: analysis.plan_type || 'basic'
        };
      });
      
      setAnalyses(formattedAnalyses);
    } catch (error) {
      console.error('❌ Error loading analyses:', error);
      Alert.alert(
        'Erreur',
        error.response?.status === 401 
          ? 'Session expirée. Veuillez vous reconnecter.'
          : 'Impossible de charger vos statistiques.',
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

  const renderStatsSummary = () => {
    if (analyses.length === 0) return null;
    
    const totalAnalyses = analyses.length;
    const enhancedAnalyses = analyses.filter(a => a.analysis_data?.body_composition_complete).length;
    const fitnessPlans = analyses.filter(a => a.has_fitness_plan).length;
    const intelligentPlans = analyses.filter(a => a.plan_type === 'intelligent').length;
    
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="analytics" size={24} color={COLORS.primary} />
            </View>
            <Text style={[styles.statNumber, { color: COLORS.text }]}>{totalAnalyses}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Analyses</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.secondary + '15' }]}>
              <Ionicons name="rocket" size={24} color={COLORS.secondary} />
            </View>
            <Text style={[styles.statNumber, { color: COLORS.text }]}>{enhancedAnalyses}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Améliorées</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="fitness" size={24} color={COLORS.success} />
            </View>
            <Text style={[styles.statNumber, { color: COLORS.text }]}>{fitnessPlans}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Plans Fitness</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Ionicons name="brain" size={24} color={COLORS.warning} />
            </View>
            <Text style={[styles.statNumber, { color: COLORS.text }]}>{intelligentPlans}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textSecondary }]}>Plans Intelligents</Text>
          </View>
        </View>
      </View>
    );
  };

  const calculateProgress = () => {
    if (analyses.length === 0) return null;
    
    const enhancedAnalyses = analyses.filter(a => a.analysis_data?.body_composition_complete).length;
    const fitnessPlans = analyses.filter(a => a.has_fitness_plan).length;
    
    const enhancedPercentage = Math.round((enhancedAnalyses / analyses.length) * 100);
    const fitnessPercentage = Math.round((fitnessPlans / analyses.length) * 100);
    
    return (
      <View style={[styles.progressSection, { backgroundColor: COLORS.card }]}>
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Votre Progression</Text>
        
        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: COLORS.text }]}>Analyses Complètes</Text>
            <Text style={[styles.progressPercentage, { color: COLORS.primary }]}>{enhancedPercentage}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: COLORS.background }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${enhancedPercentage}%`,
                  backgroundColor: COLORS.secondary
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: COLORS.textSecondary }]}>
            {enhancedAnalyses} sur {analyses.length} analyses sont complètes
          </Text>
        </View>
        
        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: COLORS.text }]}>Plans Fitness Créés</Text>
            <Text style={[styles.progressPercentage, { color: COLORS.primary }]}>{fitnessPercentage}%</Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: COLORS.background }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${fitnessPercentage}%`,
                  backgroundColor: COLORS.success
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: COLORS.textSecondary }]}>
            {fitnessPlans} sur {analyses.length} analyses ont un plan
          </Text>
        </View>
      </View>
    );
  };

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
        <View style={[styles.header, { backgroundColor: COLORS.card }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </Text>
          </View>
          <Text style={[styles.userName, { color: COLORS.text }]}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={[styles.userEmail, { color: COLORS.textSecondary }]}>{user?.email}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Vos Statistiques</Text>
          {renderStatsSummary()}
        </View>

        {analyses.length > 0 && calculateProgress()}

        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Informations Personnelles</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Prénom</Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]}>{user?.first_name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Nom</Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]}>{user?.last_name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]}>{user?.email}</Text>
            </View>
            {user?.age && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Âge</Text>
                <Text style={[styles.infoValue, { color: COLORS.text }]}>{user.age} ans</Text>
              </View>
            )}
            {user?.height && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Taille</Text>
                <Text style={[styles.infoValue, { color: COLORS.text }]}>{user.height} cm</Text>
              </View>
            )}
            {user?.weight && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>Poids</Text>
                <Text style={[styles.infoValue, { color: COLORS.text }]}>{user.weight} kg</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>À propos de BodyVision AI</Text>
          <View style={styles.appInfo}>
            <Text style={[styles.appDescription, { color: COLORS.text }]}>
              BodyVision AI utilise l'intelligence artificielle pour analyser votre posture, 
              générer des modèles 3D de votre physique et créer des plans fitness personnalisés.
            </Text>
            <View style={styles.features}>
              <Text style={[styles.feature, { color: COLORS.textSecondary }]}>• Analyse posturale avancée</Text>
              <Text style={[styles.feature, { color: COLORS.textSecondary }]}>• Modélisation 3D du corps</Text>
              <Text style={[styles.feature, { color: COLORS.textSecondary }]}>• Plans d'entraînement personnalisés</Text>
              <Text style={[styles.feature, { color: COLORS.textSecondary }]}>• Recommandations nutritionnelles</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={[styles.logoutButtonText, { color: COLORS.error }]}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.version, { color: COLORS.textSecondary }]}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 50,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ({ COLORS }) => COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 10,
  },
  section: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statsContainer: {
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    alignItems: 'center',
    width: '48%',
  },
  statIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  progressSection: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
  },
  progressItem: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
  },
  infoGrid: {},
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ({ COLORS }) => COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  appInfo: {},
  appDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  features: {},
  feature: {
    fontSize: 13,
    marginBottom: 4,
  },
  actions: {
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutButton: {
    backgroundColor: ({ COLORS }) => COLORS.error + '15',
    borderWidth: 1,
    borderColor: ({ COLORS }) => COLORS.error,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  version: {
    fontSize: 12,
  },
});

export default ProfileScreen;