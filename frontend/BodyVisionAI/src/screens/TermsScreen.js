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

const TermsScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);

  const sections = [
    {
      title: '1. Acceptation des conditions',
      content: 'En utilisant l\'application BodyVision AI, vous acceptez les présentes conditions d\'utilisation. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser notre application.'
    },
    {
      title: '2. Description du service',
      content: 'BodyVision AI est une application d\'analyse corporelle intelligente qui utilise l\'intelligence artificielle pour :\n• Analyser votre posture et composition corporelle\n• Générer des modèles 3D de votre physique\n• Créer des plans fitness personnalisés\n• Fournir des recommandations nutritionnelles'
    },
    {
      title: '3. Compte utilisateur',
      content: 'Pour utiliser certaines fonctionnalités, vous devez créer un compte. Vous êtes responsable de :\n• Maintenir la confidentialité de votre mot de passe\n• Fournir des informations exactes et à jour\n• Toute activité sur votre compte'
    },
    {
      title: '4. Données personnelles',
      content: 'Nous collectons et traitons vos données conformément à notre Politique de Confidentialité. En utilisant notre service, vous consentez à ce traitement.'
    },
    {
      title: '5. Propriété intellectuelle',
      content: 'Tous les droits de propriété intellectuelle sur l\'application, son contenu et ses algorithmes appartiennent à BodyVision AI. Vous ne pouvez pas copier, modifier ou distribuer notre contenu sans autorisation.'
    },
    {
      title: '6. Limitations de responsabilité',
      content: 'BodyVision AI fournit des recommandations basées sur des algorithmes d\'IA. Ces recommandations ne remplacent pas un avis médical professionnel. Consultez toujours un professionnel de santé avant de commencer un nouveau programme d\'exercice.'
    },
    {
      title: '7. Modifications des conditions',
      content: 'Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet dès leur publication dans l\'application.'
    },
    {
      title: '8. Droit applicable',
      content: 'Ces conditions sont régies par le droit français. Tout litige relèvera de la compétence des tribunaux français.'
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
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Conditions d'utilisation</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroSection, { backgroundColor: COLORS.card }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="document-text" size={50} color={COLORS.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: COLORS.text }]}>Conditions d'utilisation</Text>
          <Text style={[styles.heroSubtitle, { color: COLORS.textSecondary }]}>
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </Text>
        </View>

        <View style={[styles.introSection, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.introText, { color: COLORS.text }]}>
            Bienvenue sur BodyVision AI. Ces conditions d'utilisation régissent votre utilisation de notre application et de nos services.
          </Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={[styles.section, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{section.title}</Text>
            <Text style={[styles.sectionContent, { color: COLORS.text }]}>{section.content}</Text>
          </View>
        ))}

        <View style={[styles.contactSection, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.contactTitle, { color: COLORS.text }]}>Questions ?</Text>
          <Text style={[styles.contactText, { color: COLORS.textSecondary }]}>
            Pour toute question concernant ces conditions d'utilisation, contactez-nous à :
          </Text>
          <Text style={[styles.contactEmail, { color: COLORS.primary }]}>legal@bodyvision-ai.com</Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>© 2024 BodyVision AI. Tous droits réservés.</Text>
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
    marginBottom: 15,
    lineHeight: 20,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default TermsScreen;