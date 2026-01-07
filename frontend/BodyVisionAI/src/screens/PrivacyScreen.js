import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const PrivacyScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);

  const sections = [
    {
      title: '1. Introduction',
      content: 'Chez BodyVision AI, nous prenons la protection de vos données personnelles très au sérieux. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.'
    },
    {
      title: '2. Données que nous collectons',
      content: 'Nous collectons les données suivantes :\n• Informations de compte (nom, email, âge, taille, poids)\n• Photos et analyses corporelles\n• Données de performance et progression\n• Informations de l\'appareil et de connexion'
    },
    {
      title: '3. Comment nous utilisons vos données',
      content: 'Vos données sont utilisées pour :\n• Générer des analyses corporelles personnalisées\n• Créer des plans fitness adaptés\n• Améliorer nos algorithmes d\'IA\n• Vous fournir un support client\n• Envoyer des mises à jour et notifications'
    },
    {
      title: '4. Partage des données',
      content: 'Nous ne vendons pas vos données personnelles. Nous pouvons partager des données avec :\n• Des prestataires de services techniques (hébergement, analyse)\n• Des autorités légales si requis par la loi\n• Avec votre consentement explicite'
    },
    {
      title: '5. Sécurité des données',
      content: 'Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données, incluant :\n• Chiffrement des données sensibles\n• Contrôles d\'accès stricts\n• Surveillance de la sécurité\n• Sauvegardes régulières'
    },
    {
      title: '6. Vos droits',
      content: 'Conformément au RGPD, vous avez le droit de :\n• Accéder à vos données personnelles\n• Rectifier des informations inexactes\n• Supprimer vos données\n• Vous opposer au traitement\n• À la portabilité des données'
    },
    {
      title: '7. Conservation des données',
      content: 'Nous conservons vos données tant que votre compte est actif. Vous pouvez demander la suppression de votre compte à tout moment, ce qui entraînera la suppression de vos données personnelles.'
    },
    {
      title: '8. Cookies et technologies similaires',
      content: 'Nous utilisons des cookies pour améliorer votre expérience, analyser l\'utilisation de l\'application et personnaliser le contenu. Vous pouvez gérer vos préférences de cookies dans les paramètres.'
    },
    {
      title: '9. Modifications de la politique',
      content: 'Nous pouvons mettre à jour cette politique de confidentialité. Nous vous informerons des changements importants via l\'application ou par email.'
    },
    {
      title: '10. Contact',
      content: 'Pour toute question concernant cette politique ou vos données personnelles, contactez notre Délégué à la Protection des Données :'
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { backgroundColor: COLORS.card, borderBottomColor: COLORS.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Politique de confidentialité</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroSection, { backgroundColor: COLORS.card }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={50} color={COLORS.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: COLORS.text }]}>Politique de confidentialité</Text>
          <Text style={[styles.heroSubtitle, { color: COLORS.textSecondary }]}>
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </Text>
        </View>

        <View style={[styles.introSection, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.introText, { color: COLORS.text }]}>
            Votre vie privée est importante pour nous. Cette politique détaille comment BodyVision AI traite et protège vos informations personnelles.
          </Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={[styles.section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{section.title}</Text>
            <Text style={[styles.sectionContent, { color: COLORS.text }]}>{section.content}</Text>
          </View>
        ))}

        <View style={[styles.contactSection, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.contactTitle, { color: COLORS.text }]}>Contact DPO</Text>
          <Text style={[styles.contactText, { color: COLORS.textSecondary }]}>
            Délégué à la Protection des Données
          </Text>
          <Text style={[styles.contactEmail, { color: COLORS.primary }]}>dpo@bodyvision-ai.com</Text>
          <Text style={[styles.contactAddress, { color: COLORS.textSecondary }]}>
            123 Rue de l'Innovation{'\n'}
            75000 Paris, France
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>
            Cette politique est conforme au Règlement Général sur la Protection des Données (RGPD) et à la loi française Informatique et Libertés.
          </Text>
          <Text style={[styles.copyright, { color: COLORS.textSecondary }]}>© 2024 BodyVision AI. Tous droits réservés.</Text>
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
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  introSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  contactSection: {
    alignItems: 'center',
    padding: 30,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  contactText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  contactAddress: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PrivacyScreen;