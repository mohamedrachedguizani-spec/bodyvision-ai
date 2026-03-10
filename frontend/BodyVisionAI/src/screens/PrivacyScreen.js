import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const PrivacyScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);

  const sections = [
    { title: '1. Introduction', content: 'Chez BodyVision AI, nous prenons la protection de vos données personnelles très au sérieux. Cette politique explique comment nous collectons, utilisons et protégeons vos informations.' },
    { title: '2. Données que nous collectons', content: 'Nous collectons les données suivantes :\n• Informations de compte (nom, email, âge, taille, poids)\n• Photos et analyses corporelles\n• Données de performance et progression\n• Informations de l\'appareil et de connexion' },
    { title: '3. Comment nous utilisons vos données', content: 'Vos données sont utilisées pour :\n• Générer des analyses corporelles personnalisées\n• Créer des plans fitness adaptés\n• Améliorer nos algorithmes d\'IA\n• Vous fournir un support client\n• Envoyer des mises à jour et notifications' },
    { title: '4. Partage des données', content: 'Nous ne vendons pas vos données personnelles. Nous pouvons partager des données avec :\n• Des prestataires de services techniques (hébergement, analyse)\n• Des autorités légales si requis par la loi\n• Avec votre consentement explicite' },
    { title: '5. Sécurité des données', content: 'Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données, incluant :\n• Chiffrement des données sensibles\n• Contrôles d\'accès stricts\n• Surveillance de la sécurité\n• Sauvegardes régulières' },
    { title: '6. Vos droits', content: 'Conformément au RGPD, vous avez le droit de :\n• Accéder à vos données personnelles\n• Rectifier des informations inexactes\n• Supprimer vos données\n• Vous opposer au traitement\n• À la portabilité des données' },
    { title: '7. Conservation des données', content: 'Nous conservons vos données tant que votre compte est actif. Vous pouvez demander la suppression de votre compte à tout moment.' },
    { title: '8. Cookies et technologies', content: 'Nous utilisons des cookies pour améliorer votre expérience, analyser l\'utilisation de l\'application et personnaliser le contenu.' },
    { title: '9. Modifications', content: 'Nous pouvons mettre à jour cette politique de confidentialité. Nous vous informerons des changements importants via l\'application ou par email.' },
    { title: '10. Contact', content: 'Pour toute question concernant cette politique ou vos données personnelles, contactez notre Délégué à la Protection des Données.' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: COLORS.background }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Confidentialité</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: COLORS.success + '12' }]}>
            <Ionicons name="shield-checkmark" size={36} color={COLORS.success} />
          </View>
          <Text style={[styles.heroTitle, { color: COLORS.text }]}>Politique de confidentialité</Text>
          <Text style={[styles.heroSub, { color: COLORS.textSecondary }]}>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</Text>
        </View>

        <View style={[styles.introCard, { backgroundColor: COLORS.primary + '08' }]}>
          <Text style={[styles.introText, { color: COLORS.text }]}>Votre vie privée est importante pour nous. Cette politique détaille comment BodyVision AI traite et protège vos informations personnelles.</Text>
        </View>

        {sections.map((s, i) => (
          <View key={i} style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>{s.title}</Text>
            <Text style={[styles.sectionContent, { color: COLORS.text }]}>{s.content}</Text>
          </View>
        ))}

        <View style={[styles.contactCard, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <Ionicons name="mail" size={20} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactLabel, { color: COLORS.text }]}>Contact DPO</Text>
            <Text style={[styles.contactEmail, { color: COLORS.primary }]}>dpo@bodyvision-ai.com</Text>
            <Text style={[styles.contactAddr, { color: COLORS.textSecondary }]}>123 Rue de l'Innovation, 75000 Paris</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>Conforme au RGPD et à la loi Informatique et Libertés.</Text>
          <Text style={[styles.copyright, { color: COLORS.textSecondary }]}>© 2024 BodyVision AI</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  content: { flex: 1 },
  hero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24 },
  heroIcon: { width: 68, height: 68, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  heroSub: { fontSize: 13 },
  introCard: { marginHorizontal: 16, borderRadius: 16, padding: 18, marginBottom: 16 },
  introText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  section: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionContent: { fontSize: 14, lineHeight: 21 },
  contactCard: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, borderRadius: 16, padding: 18, alignItems: 'flex-start', gap: 14 },
  contactLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  contactEmail: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  contactAddr: { fontSize: 13 },
  footer: { alignItems: 'center', padding: 24, gap: 4 },
  footerText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  copyright: { fontSize: 11 },
});

export default PrivacyScreen;