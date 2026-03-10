import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Modal,
  Linking,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { analysisAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getThemeColors, SHADOWS } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons, MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

const CameraScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);

  // ── Animated values ──────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImages, setSelectedImages] = useState({
    front: null,
    back: null,
    side: null,
  });
  const [cameraPermission, setCameraPermission] = useState(null);
  const [galleryPermission, setGalleryPermission] = useState(null);
  const [imageWarningModal, setImageWarningModal] = useState({
    visible: false,
    imageData: null,
    imageType: null,
    warningType: null,
  });
  const [imageDimensions, setImageDimensions] = useState({});
  const [activeStep, setActiveStep] = useState('front');

  // ── Dynamic dark/light mode palette ────────────────────────
  const dm = {
    bg: isDarkMode ? '#0B0A14' : '#F7F6FE',
    card: isDarkMode ? '#16142A' : '#FFFFFF',
    cardAlt: isDarkMode ? '#1C1A33' : '#F9F8FF',
    surface: isDarkMode ? '#201E38' : '#F1F0FF',
    text: isDarkMode ? '#EEEDF8' : '#1A1740',
    textSec: isDarkMode ? '#8E8CA3' : '#6B6889',
    textTer: isDarkMode ? '#5C5A72' : '#9794AD',
    border: isDarkMode ? '#2A2844' : '#E2E0F0',
    borderLight: isDarkMode ? '#222040' : '#EDECF7',
    accent: '#6C5CE7',
    accentLight: isDarkMode ? '#7E6FF0' : '#6C5CE7',
    accentSoft: isDarkMode ? 'rgba(108,92,231,0.15)' : 'rgba(108,92,231,0.08)',
    accentGlow: isDarkMode ? 'rgba(108,92,231,0.35)' : 'rgba(108,92,231,0.18)',
    success: '#00C48C',
    successSoft: isDarkMode ? 'rgba(0,196,140,0.15)' : 'rgba(0,196,140,0.08)',
    warning: '#FFB020',
    warningSoft: isDarkMode ? 'rgba(255,176,32,0.15)' : 'rgba(255,176,32,0.08)',
    error: '#FF4757',
    errorSoft: isDarkMode ? 'rgba(255,71,87,0.15)' : 'rgba(255,71,87,0.08)',
    overlay: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)',
    shadow: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(108,92,231,0.08)',
  };

  // ── Entrance animation ─────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Pulse animation for analyze button ─────────────────────
  useEffect(() => {
    const canAnalyze = selectedImages.front !== null;
    if (canAnalyze) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [selectedImages.front]);

  // ── Progress bar animation ─────────────────────────────────
  useEffect(() => {
    const count = Object.values(selectedImages).filter((img) => img !== null).length;
    Animated.spring(progressAnim, {
      toValue: count / 3,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [selectedImages]);

  // ── Permissions ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      setCameraPermission(cameraStatus.status === 'granted');

      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setGalleryPermission(galleryStatus.status === 'granted');

      if (galleryStatus.status !== 'granted') {
        Alert.alert(
          'Permission requise',
          "L'application a besoin d'accéder à vos photos pour l'analyse."
        );
      }
    })();
  }, []);

  // ── Image quality check ────────────────────────────────────
  const checkImageQuality = (image) => {
    const warnings = [];

    if (image.width && image.height) {
      if (image.width < 300 || image.height < 300) {
        warnings.push({
          type: 'size',
          message: `Image petite (${image.width}×${image.height}px). Une résolution plus élevée améliorera la précision.`,
          level: 'warning',
        });
      }
      const aspectRatio = image.width / image.height;
      if (aspectRatio > 1.5) {
        warnings.push({
          type: 'ratio',
          message: 'Format portrait recommandé pour une analyse optimale.',
          level: 'info',
        });
      }
    }

    if (image.fileSize) {
      if (image.fileSize < 50 * 1024) {
        warnings.push({
          type: 'quality',
          message: "Qualité d'image potentiellement insuffisante pour une analyse précise.",
          level: 'warning',
        });
      }
      if (image.fileSize > 10 * 1024 * 1024) {
        warnings.push({
          type: 'size',
          message: "Image volumineuse — l'analyse prendra un peu plus de temps.",
          level: 'info',
        });
      }
    }

    return warnings;
  };

  const handleImageSelection = (image, type, warnings) => {
    if (warnings.length > 0) {
      setImageWarningModal({
        visible: true,
        imageData: image,
        imageType: type,
        warningType: warnings[0].type,
        warnings,
      });
    } else {
      setSelectedImages((prev) => ({ ...prev, [type]: image }));
      // Auto-advance to next step
      if (type === 'front' && !selectedImages.back) setActiveStep('back');
      else if (type === 'back' && !selectedImages.side) setActiveStep('side');
    }
  };

  const pickImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
        exif: true,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        const imageAspectRatio = image.width / image.height;
        setImageDimensions((prev) => ({
          ...prev,
          [type]: {
            width: Math.min(CARD_WIDTH - 32, 380),
            height: Math.min(CARD_WIDTH - 32, 380) / imageAspectRatio,
            aspectRatio: imageAspectRatio,
          },
        }));
        handleImageSelection(image, type, checkImageQuality(image));
      }
    } catch (error) {
      console.error(`❌ Error picking ${type} image:`, error);
      Alert.alert('Erreur', "Impossible de sélectionner l'image");
    }
  };

  const takePhoto = async (type) => {
    try {
      if (!cameraPermission) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status === 'granted') {
          setCameraPermission(true);
        } else {
          Alert.alert(
            'Permission caméra requise',
            "L'accès à la caméra est nécessaire. Voulez-vous ouvrir les paramètres ?",
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Paramètres',
                onPress: () =>
                  Platform.OS === 'ios'
                    ? Linking.openURL('app-settings:')
                    : Linking.openSettings(),
              },
            ]
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
        exif: true,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        const imageAspectRatio = image.width / image.height;
        setImageDimensions((prev) => ({
          ...prev,
          [type]: {
            width: Math.min(CARD_WIDTH - 32, 380),
            height: Math.min(CARD_WIDTH - 32, 380) / imageAspectRatio,
            aspectRatio: imageAspectRatio,
          },
        }));
        handleImageSelection(image, type, checkImageQuality(image));
      }
    } catch (error) {
      console.error(`❌ Error taking ${type} photo:`, error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const getViewLabel = (type) =>
    ({ front: 'Frontale', back: 'Postérieure', side: 'Latérale' }[type] || type);

  // ── Upload & analysis ──────────────────────────────────────
  const uploadImages = async () => {
    if (!selectedImages.front) {
      Alert.alert(
        'Photo frontale requise',
        "La vue frontale est obligatoire pour lancer l'analyse."
      );
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();

      Object.entries(selectedImages).forEach(([type, image]) => {
        if (image) {
          const uriParts = image.uri.split('.');
          const fileExtension = uriParts[uriParts.length - 1].toLowerCase();
          const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
          const fieldName = { front: 'front_file', back: 'back_file', side: 'side_file' }[type];

          if (fieldName) {
            formData.append(fieldName, {
              uri: image.uri,
              type: mimeType,
              name: `${type}_view.${fileExtension}`,
            });
          }
        }
      });

      formData.append('activity_level', 'moderate');

      const response = await analysisAPI.analyzeBodyEnhanced(formData);

      navigation.navigate('Analysis', {
        analysis: {
          id: response.data.analysis_id,
          analysis_id: response.data.analysis_id,
          image_urls: response.data.image_urls || {},
          analysis: response.data.analysis,
          created_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Upload error:', error);

      let errorMessage = "Impossible d'analyser les images";

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (
        error.code === 'ECONNABORTED' ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('Timeout')
      ) {
        errorMessage =
          "L'analyse prend plus de temps que prévu. Essayez avec des images plus légères.";
      }

      if (error.response?.status === 404) {
        errorMessage =
          "Le serveur a été mis à jour. Veuillez redémarrer l'application.";
      }

      Alert.alert("Erreur d'analyse", errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = (type) => {
    setSelectedImages((prev) => ({ ...prev, [type]: null }));
    setImageDimensions((prev) => {
      const newDims = { ...prev };
      delete newDims[type];
      return newDims;
    });
    setActiveStep(type);
  };

  const selectedCount = Object.values(selectedImages).filter((img) => img !== null).length;
  const canAnalyze = selectedImages.front !== null;

  // ═══════════════════════════════════════════════════════════
  //  Loading state
  // ═══════════════════════════════════════════════════════════
  if (isAnalyzing) {
    return (
      <LoadingSpinner
        message="Analyse IA en cours..."
        subMessage="L'IA analyse votre posture, composition corporelle et développement musculaire. Cela peut prendre 1 à 2 minutes."
      />
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Step Indicator
  // ═══════════════════════════════════════════════════════════
  const StepIndicator = () => {
    const steps = [
      { key: 'front', label: 'Face', icon: 'person' },
      { key: 'back', label: 'Dos', icon: 'person-outline' },
      { key: 'side', label: 'Profil', icon: 'body' },
    ];

    return (
      <View style={[styles.stepRow, { backgroundColor: dm.card, borderColor: dm.border }]}>
        {steps.map((step, i) => {
          const done = !!selectedImages[step.key];
          const active = activeStep === step.key;
          return (
            <React.Fragment key={step.key}>
              {i > 0 && (
                <View
                  style={[
                    styles.stepLine,
                    {
                      backgroundColor: selectedImages[steps[i - 1].key]
                        ? dm.success
                        : dm.borderLight,
                    },
                  ]}
                />
              )}
              <TouchableOpacity
                onPress={() => setActiveStep(step.key)}
                style={styles.stepItem}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.stepCircle,
                    done && { backgroundColor: dm.success },
                    active &&
                      !done && {
                        backgroundColor: dm.accentSoft,
                        borderColor: dm.accent,
                        borderWidth: 2,
                      },
                    !active &&
                      !done && {
                        backgroundColor: dm.surface,
                        borderColor: dm.border,
                        borderWidth: 1.5,
                      },
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : (
                    <Ionicons
                      name={step.icon}
                      size={16}
                      color={active ? dm.accent : dm.textTer}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: done ? dm.success : active ? dm.accent : dm.textTer,
                      fontWeight: active || done ? '700' : '500',
                    },
                  ]}
                >
                  {step.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  Image Card Component
  // ═══════════════════════════════════════════════════════════
  const ImageCard = ({ type, title, subtitle, icon }) => {
    const image = selectedImages[type];
    const dims = imageDimensions[type];
    const isActive = activeStep === type;
    const isRequired = type === 'front';

    return (
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: dm.card,
            borderColor: isActive ? dm.accent + '40' : dm.border,
            borderWidth: isActive ? 1.5 : 1,
            shadowColor: dm.shadow,
          },
          isActive && {
            shadowColor: dm.accentGlow,
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 8,
          },
        ]}
      >
        {/* Card Header */}
        <View style={styles.cardHead}>
          <View style={styles.cardHeadLeft}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: image ? dm.successSoft : dm.accentSoft },
              ]}
            >
              {image ? (
                <Ionicons name="checkmark-circle" size={22} color={dm.success} />
              ) : (
                <Ionicons name={icon} size={22} color={dm.accent} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.cardTitle, { color: dm.text }]}>{title}</Text>
                {isRequired && !image && (
                  <View style={[styles.requiredPill, { backgroundColor: dm.errorSoft }]}>
                    <Text style={[styles.requiredPillText, { color: dm.error }]}>Requis</Text>
                  </View>
                )}
                {!isRequired && !image && (
                  <View style={[styles.optionalPill, { backgroundColor: dm.surface }]}>
                    <Text style={[styles.optionalPillText, { color: dm.textTer }]}>
                      Optionnel
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardSub, { color: dm.textSec }]}>{subtitle}</Text>
            </View>
          </View>
          {image && (
            <TouchableOpacity
              onPress={() => clearImage(type)}
              style={[styles.clearBtn, { backgroundColor: dm.errorSoft }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={16} color={dm.error} />
            </TouchableOpacity>
          )}
        </View>

        {/* Image Preview or Picker */}
        {image ? (
          <View style={styles.previewWrap}>
            <Image
              source={{ uri: image.uri }}
              style={[
                styles.previewImg,
                { backgroundColor: dm.surface },
                dims && {
                  width: dims.width,
                  height: Math.min(dims.height, 350),
                },
              ]}
              resizeMode="contain"
            />
            <View style={[styles.imgMeta, { backgroundColor: dm.successSoft }]}>
              <View style={styles.imgMetaLeft}>
                <Ionicons name="checkmark-circle" size={16} color={dm.success} />
                <Text style={[styles.imgMetaText, { color: dm.success }]}>Prête</Text>
              </View>
              <Text style={[styles.imgMetaDim, { color: dm.textSec }]}>
                {image.width}×{image.height}
                {image.fileSize ? ` · ${(image.fileSize / 1024).toFixed(0)}KB` : ''}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.pickerArea}>
            {/* Visual placeholder */}
            <View
              style={[
                styles.placeholderBox,
                { backgroundColor: dm.surface, borderColor: dm.borderLight },
              ]}
            >
              <View style={[styles.placeholderIconWrap, { backgroundColor: dm.accentSoft }]}>
                <Ionicons name={icon} size={36} color={dm.accent} />
              </View>
              <Text style={[styles.placeholderText, { color: dm.textTer }]}>
                {type === 'front'
                  ? 'Photo de face'
                  : type === 'back'
                  ? 'Photo de dos'
                  : 'Photo de profil'}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.pickerBtns}>
              <TouchableOpacity
                style={[styles.pickerBtn, { backgroundColor: dm.accent }]}
                onPress={() => takePhoto(type)}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.pickerBtnTextLight}>Caméra</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerBtn,
                  { backgroundColor: dm.cardAlt, borderColor: dm.border, borderWidth: 1 },
                ]}
                onPress={() => pickImage(type)}
                activeOpacity={0.8}
              >
                <Ionicons name="images" size={18} color={dm.accent} />
                <Text style={[styles.pickerBtnTextDark, { color: dm.text }]}>Galerie</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  Warning Modal
  // ═══════════════════════════════════════════════════════════
  const ImageWarningModal = () => {
    const { visible, imageData, imageType, warnings } = imageWarningModal;
    if (!visible || !imageData) return null;

    const handleUseAnyway = () => {
      setSelectedImages((prev) => ({ ...prev, [imageType]: imageData }));
      setImageWarningModal({ visible: false, imageData: null, imageType: null });
      if (imageType === 'front' && !selectedImages.back) setActiveStep('back');
      else if (imageType === 'back' && !selectedImages.side) setActiveStep('side');
    };

    const handleSelectNew = () => {
      setImageWarningModal({ visible: false, imageData: null, imageType: null });
      setTimeout(() => {
        Alert.alert('Nouvelle sélection', 'Comment souhaitez-vous ajouter une image ?', [
          { text: 'Annuler', style: 'cancel' },
          { text: '📷 Caméra', onPress: () => takePhoto(imageType) },
          { text: '🖼️ Galerie', onPress: () => pickImage(imageType) },
        ]);
      }, 300);
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setImageWarningModal({ visible: false, imageData: null, imageType: null })
        }
      >
        <View style={[styles.modalOverlay, { backgroundColor: dm.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: dm.card }]}>
            {/* Header */}
            <View style={[styles.modalHead, { borderBottomColor: dm.border }]}>
              <View style={[styles.modalIconWrap, { backgroundColor: dm.warningSoft }]}>
                <Feather name="alert-triangle" size={22} color={dm.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: dm.text }]}>
                  Qualité d'image
                </Text>
                <Text style={[styles.modalSubtitle, { color: dm.textSec }]}>
                  Vérification automatique
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  setImageWarningModal({ visible: false, imageData: null, imageType: null })
                }
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={dm.textTer} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Preview */}
              <View style={styles.modalPreview}>
                <Image
                  source={{ uri: imageData.uri }}
                  style={[styles.modalImg, { backgroundColor: dm.surface }]}
                  resizeMode="contain"
                />
                <View style={styles.modalImgStats}>
                  <View style={[styles.statPill, { backgroundColor: dm.surface }]}>
                    <Text style={[styles.statText, { color: dm.textSec }]}>
                      {imageData.width}×{imageData.height}
                    </Text>
                  </View>
                  {imageData.fileSize && (
                    <View style={[styles.statPill, { backgroundColor: dm.surface }]}>
                      <Text style={[styles.statText, { color: dm.textSec }]}>
                        {(imageData.fileSize / 1024).toFixed(1)} KB
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Warnings */}
              <View style={styles.modalWarnings}>
                {warnings &&
                  warnings.map((w, i) => (
                    <View
                      key={i}
                      style={[
                        styles.warnRow,
                        {
                          backgroundColor:
                            w.level === 'warning' ? dm.warningSoft : dm.accentSoft,
                        },
                      ]}
                    >
                      <Feather
                        name={w.level === 'warning' ? 'alert-triangle' : 'info'}
                        size={16}
                        color={w.level === 'warning' ? dm.warning : dm.accent}
                      />
                      <Text
                        style={[
                          styles.warnText,
                          { color: w.level === 'warning' ? dm.warning : dm.text },
                        ]}
                      >
                        {w.message}
                      </Text>
                    </View>
                  ))}
              </View>

              {/* Tips */}
              <View style={[styles.modalTips, { backgroundColor: dm.surface }]}>
                <Text style={[styles.modalTipsTitle, { color: dm.accent }]}>
                  💡 Recommandations
                </Text>
                <Text style={[styles.modalTipLine, { color: dm.textSec }]}>
                  • Format portrait (3:4) recommandé
                </Text>
                <Text style={[styles.modalTipLine, { color: dm.textSec }]}>
                  • Min. 500×750 pixels pour la meilleure précision
                </Text>
                <Text style={[styles.modalTipLine, { color: dm.textSec }]}>
                  • Bon éclairage, pas de contre-jour
                </Text>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={[styles.modalActions, { borderTopColor: dm.border }]}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: dm.surface }]}
                onPress={handleSelectNew}
              >
                <Feather name="refresh-cw" size={16} color={dm.text} />
                <Text style={[styles.modalBtnText, { color: dm.text }]}>Autre image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: dm.accent }]}
                onPress={handleUseAnyway}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Utiliser</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: dm.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={dm.bg}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── HEADER ────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.headerWrap,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={[styles.headerBar, { backgroundColor: dm.card, borderColor: dm.border }]}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: dm.surface }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color={dm.text} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View style={styles.headerBrand}>
                <View style={[styles.headerDot, { backgroundColor: dm.accent }]} />
                <Text style={[styles.headerTitle, { color: dm.text }]}>BodyVision</Text>
                <Text style={[styles.headerAI, { color: dm.accent }]}>AI</Text>
              </View>
              <Text style={[styles.headerSub, { color: dm.textSec }]}>
                Analyse Corporelle
              </Text>
            </View>

            <View style={{ width: 38 }} />
          </View>
        </Animated.View>

        {/* ── HERO SECTION ──────────────────────────────────── */}
        <Animated.View
          style={[
            styles.heroWrap,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.heroCard, { backgroundColor: dm.card, borderColor: dm.border }]}>
            {/* Decorative blob */}
            <View style={[styles.heroBlob, { backgroundColor: dm.accentSoft }]} />

            <View style={styles.heroContent}>
              <View style={[styles.heroBadge, { backgroundColor: dm.accentSoft }]}>
                <MaterialCommunityIcons name="brain" size={14} color={dm.accent} />
                <Text style={[styles.heroBadgeText, { color: dm.accent }]}>IA Avancée</Text>
              </View>

              <Text style={[styles.heroTitle, { color: dm.text }]}>
                Analyse{'\n'}Multidimensionnelle
              </Text>
              <Text style={[styles.heroDesc, { color: dm.textSec }]}>
                Ajoutez vos photos sous différents angles pour une analyse complète de votre
                posture et composition corporelle.
              </Text>

              {/* Metrics row */}
              <View style={styles.metricsRow}>
                {[
                  { icon: 'body', label: 'Posture', color: dm.success },
                  { icon: 'fitness', label: 'Musculaire', color: dm.accent },
                  { icon: 'analytics', label:'Composition', color: dm.warning },
                ].map((m, i) => (
                  <View key={i} style={styles.metricItem}>
                    <View style={[styles.metricDot, { backgroundColor: m.color + '25' }]}>
                      <Ionicons name={m.icon} size={16} color={m.color} />
                    </View>
                    <Text style={[styles.metricText, { color: dm.textSec }]}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── PROGRESS BAR ──────────────────────────────────── */}
        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: dm.textSec }]}>Progression</Text>
            <Text style={[styles.progressCount, { color: dm.accent }]}>
              {selectedCount}/3 photos
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: dm.surface }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: dm.accent,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* ── STEP INDICATOR ────────────────────────────────── */}
        <StepIndicator />

        {/* ── IMAGE CARDS ───────────────────────────────────── */}
        <View style={styles.cardsSection}>
          <ImageCard
            type="front"
            title="Vue Frontale"
            subtitle="Face complète · Posture naturelle"
            icon="person"
          />
          <ImageCard
            type="back"
            title="Vue Postérieure"
            subtitle="Dos · Épaules · Colonne vertébrale"
            icon="person-outline"
          />
          <ImageCard
            type="side"
            title="Vue Latérale"
            subtitle="Profil · Cambrure · Alignement"
            icon="body"
          />
        </View>

        {/* ── TIPS CARD ─────────────────────────────────────── */}
        {activeStep === 'front' && !selectedImages.front && (
          <View style={[styles.tipsCard, { backgroundColor: dm.card, borderColor: dm.border }]}>
            <View style={styles.tipsHead}>
              <Ionicons name="bulb" size={18} color={dm.warning} />
              <Text style={[styles.tipsTitle, { color: dm.text }]}>
                Conseils pour une photo optimale
              </Text>
            </View>
            {[
              'Photo de la tête aux pieds si possible',
              'Format portrait recommandé (3:4)',
              'Bon éclairage, évitez le contre-jour',
              'Tenue légère pour plus de précision',
              'Fond neutre et uni de préférence',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={[styles.tipBullet, { backgroundColor: dm.accentSoft }]}>
                  <Text style={[styles.tipBulletText, { color: dm.accent }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.tipText, { color: dm.textSec }]}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── ANALYZE BUTTON ────────────────────────────────── */}
        <View style={styles.analyzeSection}>
          <Animated.View style={{ transform: [{ scale: canAnalyze ? pulseAnim : 1 }] }}>
            <TouchableOpacity
              style={[
                styles.analyzeBtn,
                canAnalyze
                  ? {
                      backgroundColor: dm.accent,
                      shadowColor: dm.accent,
                      shadowOpacity: 0.35,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 10,
                    }
                  : {
                      backgroundColor: dm.surface,
                      borderColor: dm.border,
                      borderWidth: 1,
                    },
              ]}
              onPress={uploadImages}
              disabled={!canAnalyze || isAnalyzing}
              activeOpacity={0.85}
            >
              <View style={styles.analyzeBtnInner}>
                <View
                  style={[
                    styles.analyzeBtnIcon,
                    {
                      backgroundColor: canAnalyze
                        ? 'rgba(255,255,255,0.2)'
                        : dm.borderLight,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="auto-awesome"
                    size={22}
                    color={canAnalyze ? '#fff' : dm.textTer}
                  />
                </View>
                <View>
                  <Text
                    style={[
                      styles.analyzeBtnText,
                      { color: canAnalyze ? '#fff' : dm.textTer },
                    ]}
                  >
                    Lancer l'Analyse
                  </Text>
                  <Text
                    style={[
                      styles.analyzeBtnSub,
                      { color: canAnalyze ? 'rgba(255,255,255,0.7)' : dm.textTer },
                    ]}
                  >
                    {selectedCount} photo{selectedCount > 1 ? 's' : ''} sélectionnée
                    {selectedCount > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              {canAnalyze && <Ionicons name="arrow-forward" size={20} color="#fff" />}
            </TouchableOpacity>
          </Animated.View>

          {!canAnalyze && (
            <View style={[styles.hintRow, { backgroundColor: dm.errorSoft }]}>
              <Ionicons name="information-circle" size={16} color={dm.error} />
              <Text style={[styles.hintText, { color: dm.error }]}>
                La photo frontale est obligatoire pour commencer
              </Text>
            </View>
          )}
        </View>

        {/* ── FOOTER ────────────────────────────────────────── */}
        <View style={[styles.footer, { backgroundColor: dm.card, borderColor: dm.border }]}>
          <View style={styles.footerRow}>
            <Ionicons name="shield-checkmark" size={16} color={dm.success} />
            <Text style={[styles.footerText, { color: dm.textSec }]}>
              Images analysées localement et supprimées après traitement
            </Text>
          </View>
          <View style={styles.footerDivider}>
            <View style={[styles.footerDivLine, { backgroundColor: dm.border }]} />
          </View>
          <Text style={[styles.footerSub, { color: dm.textTer }]}>
            Toutes tailles acceptées · IA adaptative · Analyse complète
          </Text>
        </View>
      </ScrollView>

      <ImageWarningModal />
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },

  // ── Header ────────────────────
  headerWrap: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 12 : 4 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  headerAI: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  // ── Hero ──────────────────────
  heroWrap: { paddingHorizontal: 20, marginTop: 16 },
  heroCard: {
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroBlob: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.6,
  },
  heroContent: { zIndex: 1 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700' },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroDesc: { fontSize: 14, lineHeight: 21, marginBottom: 20 },
  metricsRow: { flexDirection: 'row', gap: 16 },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricDot: {
    width: 18,
    height: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricText: { fontSize: 12, fontWeight: '600' },

  // ── Progress ──────────────────
  progressWrap: { paddingHorizontal: 20, marginTop: 20 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: { fontSize: 13, fontWeight: '600' },
  progressCount: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  // ── Step indicator ────────────
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  stepItem: { alignItems: 'center', gap: 6 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: { fontSize: 11 },
  stepLine: { width: 32, height: 2, borderRadius: 1, marginHorizontal: 8 },

  // ── Cards Section ─────────────
  cardsSection: { paddingHorizontal: 20, marginTop: 20, gap: 14 },

  // ── Image Card ────────────────
  card: {
    borderRadius: 20,
    padding: 16,
    ...SHADOWS.sm,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  cardSub: { fontSize: 12, marginTop: 2 },
  requiredPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  requiredPillText: { fontSize: 10, fontWeight: '700' },
  optionalPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  optionalPillText: { fontSize: 10, fontWeight: '600' },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Preview ───────────────────
  previewWrap: { alignItems: 'center' },
  previewImg: {
    width: '100%',
    maxWidth: 380,
    minHeight: 180,
    borderRadius: 14,
    marginBottom: 10,
  },
  imgMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  imgMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  imgMetaText: { fontSize: 13, fontWeight: '700' },
  imgMetaDim: { fontSize: 11, fontStyle: 'italic' },

  // ── Picker area ───────────────
  pickerArea: { gap: 12 },
  placeholderBox: {
    height: 150,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  placeholderIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 13, fontWeight: '600' },

  pickerBtns: { flexDirection: 'row', gap: 10 },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  pickerBtnTextLight: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pickerBtnTextDark: { fontSize: 14, fontWeight: '700' },

  // ── Tips card ─────────────────
  tipsCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  tipsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  tipsTitle: { fontSize: 15, fontWeight: '700' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tipBullet: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipBulletText: { fontSize: 11, fontWeight: '800' },
  tipText: { fontSize: 13, flex: 1 },

  // ── Analyze button ────────────
  analyzeSection: { paddingHorizontal: 20, marginTop: 24 },
  analyzeBtn: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analyzeBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  analyzeBtnIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeBtnText: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  analyzeBtnSub: { fontSize: 12, marginTop: 2 },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  hintText: { fontSize: 12, fontWeight: '600', flex: 1 },

  // ── Footer ────────────────────
  footer: {
    marginHorizontal: 20,
    marginTop: 28,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerText: { fontSize: 12, lineHeight: 17, flex: 1 },
  footerDivider: { paddingVertical: 12 },
  footerDivLine: { height: 1 },
  footerSub: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },

  // ── Warning Modal ─────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 24,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  modalBody: { padding: 20, maxHeight: 360 },
  modalPreview: { alignItems: 'center', marginBottom: 16 },
  modalImg: {
    width: 180,
    height: 180,
    borderRadius: 16,
    marginBottom: 10,
  },
  modalImgStats: { flexDirection: 'row', gap: 8 },
  statPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statText: { fontSize: 11, fontWeight: '600' },
  modalWarnings: { gap: 8, marginBottom: 16 },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  warnText: { fontSize: 13, lineHeight: 18, flex: 1 },
  modalTips: { padding: 14, borderRadius: 14, marginBottom: 8 },
  modalTipsTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  modalTipLine: { fontSize: 12, lineHeight: 18 },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalBtnPrimary: { flex: 1.3 },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});

export default CameraScreen;
