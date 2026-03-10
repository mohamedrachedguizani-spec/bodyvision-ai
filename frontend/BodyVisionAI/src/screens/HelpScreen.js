import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, SafeAreaView, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HelpScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  const [expandedIndex, setExpandedIndex] = useState(null);

  const helpSections = [
    { icon: 'camera', color: COLORS.primary, title: 'Comment faire une analyse', items: [
      'Placez-vous devant un fond clair et uniforme',
      'Portez des vêtements moulants pour une meilleure analyse',
      'Prenez des photos frontale, arrière et latérale si possible',
      'Assurez-vous d\'avoir un bon éclairage',
      'Tenez-vous droit, les bras légèrement écartés',
    ]},
    { icon: 'bar-chart', color: COLORS.secondary, title: 'Comprendre les résultats', items: [
      'Score postural : Évaluation de votre posture (0-100)',
      'IMC : Indice de Masse Corporelle',
      'Masse grasse : Pourcentage de graisse corporelle',
      'Masse musculaire : Pourcentage de muscle',
      'Classification : Évaluation de votre composition corporelle',
    ]},
    { icon: 'fitness', color: COLORS.success, title: 'Plans Fitness', items: [
      'Plans de base : Recommandations générales',
      'Plans intelligents : Programmes personnalisés',
      'Suivi : Consultez votre progression',
      'Adaptez l\'intensité selon votre niveau',
    ]},
    { icon: 'construct', color: COLORS.warning, title: 'Dépannage', items: [
      'Problème de connexion : Vérifiez votre Wi-Fi',
      'Photo floue : Améliorez l\'éclairage',
      'Analyse lente : Patientez quelques instants',
      'Erreur d\'analyse : Réessayez avec une meilleure photo',
    ]},
  ];

  const toggleSection = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { backgroundColor: COLORS.card }, SHADOWS.sm]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: COLORS.background }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Centre d'aide</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: COLORS.primary + '12' }]}>
            <Ionicons name="help-buoy" size={40} color={COLORS.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: COLORS.text }]}>Comment pouvons-nous{'\n'}vous aider ?</Text>
          <Text style={[styles.heroSub, { color: COLORS.textSecondary }]}>Trouvez des réponses à vos questions</Text>
        </View>

        {/* Accordion sections */}
        {helpSections.map((section, index) => (
          <TouchableOpacity key={index} style={[styles.section, { backgroundColor: COLORS.card }, SHADOWS.sm]} onPress={() => toggleSection(index)} activeOpacity={0.7}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: section.color + '12' }]}>
                <Ionicons name={section.icon} size={18} color={section.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>{section.title}</Text>
              <Ionicons name={expandedIndex === index ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textSecondary} />
            </View>
            {expandedIndex === index && (
              <View style={styles.sectionBody}>
                {section.items.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Ionicons name="checkmark-circle" size={14} color={section.color} />
                    <Text style={[styles.itemText, { color: COLORS.text }]}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Contact */}
        <View style={[styles.contactCard, { backgroundColor: COLORS.primary }, SHADOWS.lg]}>
          <Text style={styles.contactTitle}>Besoin d'aide supplémentaire ?</Text>
          <Text style={styles.contactSub}>Notre équipe de support est là pour vous aider</Text>
          <TouchableOpacity style={styles.contactBtn} onPress={() => Alert.alert('Contacter le support', 'Envoyer un email ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Envoyer', onPress: () => Linking.openURL('mailto:support@bodyvision-ai.com?subject=Demande d\'aide') },
          ])}>
            <Ionicons name="mail" size={16} color={COLORS.primary} />
            <Text style={[styles.contactBtnText, { color: COLORS.primary }]}>Contacter le support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>BodyVision AI v1.0.0</Text>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>© 2024 Tous droits réservés</Text>
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
  hero: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  heroIcon: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  heroSub: { fontSize: 14, textAlign: 'center' },
  section: { marginHorizontal: 16, marginBottom: 10, borderRadius: 18, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  sectionBody: { marginTop: 14, paddingLeft: 48, gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemText: { fontSize: 14, lineHeight: 20, flex: 1 },
  contactCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 22, padding: 24, alignItems: 'center' },
  contactTitle: { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  contactSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 18, textAlign: 'center' },
  contactBtn: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, alignItems: 'center', gap: 8 },
  contactBtnText: { fontSize: 14, fontWeight: '700' },
  footer: { alignItems: 'center', padding: 24, gap: 2 },
  footerText: { fontSize: 12 },
});

export default HelpScreen;