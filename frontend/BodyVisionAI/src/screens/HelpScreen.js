import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const HelpScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);

  const helpSections = [
    {
      title: '📸 Comment faire une analyse',
      items: [
        '• Placez-vous devant un fond clair et uniforme',
        '• Portez des vêtements moulants pour une meilleure analyse',
        '• Prenez des photos frontale, arrière et latérale si possible',
        '• Assurez-vous d\'avoir un bon éclairage',
        '• Tenez-vous droit, les bras légèrement écartés',
      ],
    },
    {
      title: '📊 Comprendre les résultats',
      items: [
        '• Score postural : Évaluation de votre posture (0-100)',
        '• IMC : Indice de Masse Corporelle',
        '• Masse grasse : Pourcentage de graisse corporelle',
        '• Masse musculaire : Pourcentage de muscle',
        '• Classification : Évaluation de votre composition corporelle',
      ],
    },
    {
      title: '💪 Plans Fitness',
      items: [
        '• Plans de base : Recommandations générales',
        '• Plans intelligents : Programmes personnalisés',
        '• Suivi : Consultez votre progression',
        '• Adaptez l\'intensité selon votre niveau',
      ],
    },
    {
      title: '🔧 Dépannage',
      items: [
        '• Problème de connexion : Vérifiez votre Wi-Fi',
        '• Photo floue : Améliorez l\'éclairage',
        '• Analyse lente : Patientez quelques instants',
        '• Erreur d\'analyse : Réessayez avec une meilleure photo',
      ],
    },
  ];

  const handleContactSupport = () => {
    Alert.alert(
      'Contacter le support',
      'Envoyer un email au support technique ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Envoyer', 
          onPress: () => Linking.openURL('mailto:support@bodyvision-ai.com?subject=Demande d\'aide&body=Bonjour,') 
        },
      ]
    );
  };

  const handleFAQ = () => {
    Alert.alert('FAQ', 'La FAQ sera disponible prochainement.');
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
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Centre d'aide</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroSection, { backgroundColor: COLORS.card }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-circle" size={60} color={COLORS.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: COLORS.text }]}>Comment pouvons-nous vous aider ?</Text>
          <Text style={[styles.heroSubtitle, { color: COLORS.textSecondary }]}>
            Trouvez des réponses à vos questions et apprenez à utiliser BodyVision AI
          </Text>
        </View>

        {helpSections.map((section, index) => (
          <View key={index} style={[styles.section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <Text key={itemIndex} style={[styles.sectionItem, { color: COLORS.text }]}>
                  {item}
                </Text>
              ))}
            </View>
          </View>
        ))}

        <View style={[styles.contactSection, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.contactTitle, { color: COLORS.text }]}>Besoin d'aide supplémentaire ?</Text>
          <Text style={[styles.contactText, { color: COLORS.textSecondary }]}>
            Notre équipe de support est là pour vous aider
          </Text>
          
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: COLORS.primary }]}
            onPress={handleContactSupport}
          >
            <Ionicons name="mail" size={20} color="white" />
            <Text style={styles.contactButtonText}>Contacter le support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.contactButton, styles.faqButton, { borderColor: COLORS.primary }]}
            onPress={handleFAQ}
          >
            <Ionicons name="help-circle-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.contactButtonText, { color: COLORS.primary }]}>
              Consulter la FAQ
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.infoTitle, { color: COLORS.textSecondary }]}>Informations de version</Text>
          <Text style={[styles.infoText, { color: COLORS.textSecondary }]}>BodyVision AI v1.0.0</Text>
          <Text style={[styles.infoText, { color: COLORS.textSecondary }]}>© 2024 Tous droits réservés</Text>
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
  heroSection: {
    alignItems: 'center',
    padding: 30,
    marginBottom: 20,
  },
  heroIcon: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  sectionContent: {
    paddingLeft: 10,
  },
  sectionItem: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  contactSection: {
    alignItems: 'center',
    padding: 30,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 16,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  contactText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 12,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  faqButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  infoSection: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
});

export default HelpScreen;