import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const TermsScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);

  const sections = [
    { title: '1. Acceptation des conditions', content: 'En utilisant l\'application BodyVision AI, vous acceptez les présentes conditions d\'utilisation. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser notre application.' },
    { title: '2. Description du service', content: 'BodyVision AI est une application d\'analyse corporelle intelligente qui utilise l\'intelligence artificielle pour :\n• Analyser votre posture et composition corporelle\n• Discuter de vos résultats avec un coach virtuel 24/7\n• Créer des plans fitness personnalisés\n• Fournir des recommandations nutritionnelles' },
    { title: '3. Compte utilisateur', content: 'Pour utiliser certaines fonctionnalités, vous devez créer un compte. Vous êtes responsable de :\n• Maintenir la confidentialité de votre mot de passe\n• Fournir des informations exactes et à jour\n• Toute activité sur votre compte' },
    { title: '4. Données personnelles', content: 'Nous collectons et traitons vos données conformément à notre Politique de Confidentialité. En utilisant notre service, vous consentez à ce traitement.' },
    { title: '5. Propriété intellectuelle', content: 'Tous les droits de propriété intellectuelle sur l\'application, son contenu et ses algorithmes appartiennent à BodyVision AI. Vous ne pouvez pas copier, modifier ou distribuer notre contenu sans autorisation.' },
    { title: '6. Limitations de responsabilité', content: 'BodyVision AI fournit des recommandations basées sur des algorithmes d\'IA. Ces recommandations ne remplacent pas un avis médical professionnel. Consultez toujours un professionnel de santé avant de commencer un nouveau programme d\'exercice.' },
    { title: '7. Modifications des conditions', content: 'Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet dès leur publication dans l\'application.' },
    { title: '8. Droit applicable', content: 'Ces conditions sont régies par le droit français. Tout litige relèvera de la compétence des tribunaux français.' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: COLORS.background }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Conditions</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: COLORS.primary + '12' }]}>
            <Ionicons name="document-text" size={36} color={COLORS.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: COLORS.text }]}>Conditions d'utilisation</Text>
          <Text style={[styles.heroSub, { color: COLORS.textSecondary }]}>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</Text>
        </View>

        <View style={[styles.introCard, { backgroundColor: COLORS.secondary + '08' }]}>
          <Text style={[styles.introText, { color: COLORS.text }]}>Bienvenue sur BodyVision AI. Ces conditions régissent votre utilisation de notre application et de nos services.</Text>
        </View>

        {sections.map((s, i) => (
          <View key={i} style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
            <Text style={[styles.sectionTitle, { color: COLORS.secondary }]}>{s.title}</Text>
            <Text style={[styles.sectionContent, { color: COLORS.text }]}>{s.content}</Text>
          </View>
        ))}

        <View style={[styles.contactCard, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
          <Ionicons name="chatbubbles" size={20} color={COLORS.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactLabel, { color: COLORS.text }]}>Questions ?</Text>
            <Text style={[styles.contactEmail, { color: COLORS.secondary }]}>legal@bodyvision-ai.com</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>Conditions régies par le droit français. Tout litige sera soumis aux tribunaux compétents de Paris.</Text>
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
  contactCard: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, borderRadius: 16, padding: 18, alignItems: 'center', gap: 14 },
  contactLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  contactEmail: { fontSize: 14, fontWeight: '600' },
  footer: { alignItems: 'center', padding: 24, gap: 4 },
  footerText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  copyright: { fontSize: 11 },
});

export default TermsScreen;