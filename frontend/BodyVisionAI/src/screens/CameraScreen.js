import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Camera from 'expo-camera';
import { useTheme } from '../contexts/ThemeContext';
import { analysisAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getThemeColors } from '../utils/constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const CameraScreen = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImages, setSelectedImages] = useState({
    front: null,
    back: null,
    side: null
  });
  const [cameraPermission, setCameraPermission] = useState(null);
  const [galleryPermission, setGalleryPermission] = useState(null);
  const [imageWarningModal, setImageWarningModal] = useState({
    visible: false,
    imageData: null,
    imageType: null,
    warningType: null
  });
  const [imageDimensions, setImageDimensions] = useState({});

  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(cameraStatus.status === 'granted');
      
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setGalleryPermission(galleryStatus.status === 'granted');
      
      if (galleryStatus.status !== 'granted') {
        Alert.alert(
          'Permission requise', 
          'L\'application a besoin d\'accéder à vos photos pour l\'analyse précise.'
        );
      }
    })();
  }, []);

  const checkImageQuality = (image, type) => {
    const warnings = [];
    
    if (image.width && image.height) {
      if (image.width < 300 || image.height < 300) {
        warnings.push({
          type: 'size',
          message: `L'image est petite (${image.width}×${image.height}px). Une image plus grande donnera de meilleurs résultats.`,
          level: 'warning'
        });
      }
      
      const aspectRatio = image.width / image.height;
      if (aspectRatio < 0.5 || aspectRatio > 1) {
        warnings.push({
          type: 'ratio',
          message: 'Le format portrait (3:4) est recommandé pour une analyse optimale.',
          level: 'info'
        });
      }
    }
    
    if (image.fileSize) {
      if (image.fileSize < 50 * 1024) {
        warnings.push({
          type: 'quality',
          message: 'L\'image semble être de faible qualité. Cela peut affecter la précision de l\'analyse.',
          level: 'warning'
        });
      }
      
      if (image.fileSize > 10 * 1024 * 1024) {
        warnings.push({
          type: 'size',
          message: 'L\'image est très grande. L\'analyse prendra plus de temps.',
          level: 'info'
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
        warnings: warnings
      });
    } else {
      setSelectedImages(prev => ({
        ...prev,
        [type]: image
      }));
      Alert.alert(
        'Image sélectionnée',
        `Vue ${getViewLabel(type)} ajoutée avec succès!`,
        [{ text: 'OK' }]
      );
    }
  };

  const pickImage = async (type) => {
    try {
      console.log(`📸 Opening image picker for ${type} view...`);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
        exif: true,
        base64: false,
      });

      console.log(`🖼️ Image picker result for ${type}:`, result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        console.log(`✅ ${type} image selected:`, {
          uri: image.uri,
          width: image.width,
          height: image.height,
          fileSize: image.fileSize
        });
        
        const imageAspectRatio = image.width / image.height;
        setImageDimensions(prev => ({
          ...prev,
          [type]: {
            width: Math.min(width - 80, 400),
            height: Math.min(width - 80, 400) / imageAspectRatio,
            aspectRatio: imageAspectRatio
          }
        }));
        
        const warnings = checkImageQuality(image, type);
        
        handleImageSelection(image, type, warnings);
      } else {
        console.log(`❌ ${type} image selection canceled`);
      }
    } catch (error) {
      console.error(`❌ Error picking ${type} image:`, error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const takePhoto = async (type) => {
    try {
      if (!cameraPermission) {
        Alert.alert(
          'Permission caméra requise',
          'Veuillez autoriser l\'accès à la caméra dans les paramètres.'
        );
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
        exif: true,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        
        const imageAspectRatio = image.width / image.height;
        setImageDimensions(prev => ({
          ...prev,
          [type]: {
            width: Math.min(width - 80, 400),
            height: Math.min(width - 80, 400) / imageAspectRatio,
            aspectRatio: imageAspectRatio
          }
        }));
        
        const warnings = checkImageQuality(image, type);
        
        handleImageSelection(image, type, warnings);
      }
    } catch (error) {
      console.error(`❌ Error taking ${type} photo:`, error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const getViewLabel = (type) => {
    const labels = {
      front: 'Frontale',
      back: 'Postérieure',
      side: 'Latérale'
    };
    return labels[type] || type;
  };

  const uploadImages = async () => {
    if (!selectedImages.front) {
      Alert.alert(
        'Photo frontale requise',
        'La vue frontale est obligatoire pour l\'analyse. Veuillez ajouter une photo de face.'
      );
      return;
    }

    console.log('🔄 Starting upload process with images:', Object.keys(selectedImages).filter(k => selectedImages[k]));
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      
      Object.entries(selectedImages).forEach(([type, image]) => {
        if (image) {
          const uriParts = image.uri.split('.');
          const fileExtension = uriParts[uriParts.length - 1].toLowerCase();
          const mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
          
          const fieldName = {
            front: 'front_file',
            back: 'back_file', 
            side: 'side_file'
          }[type];
          
          if (fieldName) {
            formData.append(fieldName, {
              uri: image.uri,
              type: mimeType,
              name: `${type}_view.${fileExtension}`,
            });
            
            console.log(`📤 Added ${type} image to form data (field: ${fieldName})`);
          }
        }
      });

      formData.append('activity_level', 'moderate');

      console.log('🚀 Sending to ENHANCED AI analysis...');
      
      const response = await analysisAPI.analyzeBodyEnhanced(formData);
      
      console.log('✅ ENHANCED AI analysis completed:', {
        analysis_id: response.data.analysis_id,
        has_analysis: !!response.data.analysis,
        has_images: !!response.data.image_urls
      });
      
      navigation.navigate('Analysis', { 
        analysis: {
          id: response.data.analysis_id,
          analysis_id: response.data.analysis_id,
          image_urls: response.data.image_urls || {},
          analysis: response.data.analysis,
          created_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      
      let errorMessage = 'Impossible d\'analyser les images';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.code === 'ECONNABORTED' || errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorMessage = 'L\'analyse prend plus de temps que prévu. Les images peuvent être trop grandes. Essayez avec des images plus légères (moins de 5MB chacune).';
      }
      
      if (error.response?.status === 404) {
        errorMessage = 'Le serveur a été mis à jour. Veuillez redémarrer l\'application ou vérifier votre connexion.';
      }
      
      Alert.alert('Erreur d\'analyse', errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = (type) => {
    setSelectedImages(prev => ({
      ...prev,
      [type]: null
    }));
    setImageDimensions(prev => {
      const newDims = { ...prev };
      delete newDims[type];
      return newDims;
    });
  };

  const ImageWarningModal = () => {
    const { visible, imageData, imageType, warningType, warnings } = imageWarningModal;
    
    if (!visible || !imageData) return null;

    const getWarningIcon = () => {
      if (warningType === 'size') return '⚠️';
      if (warningType === 'quality') return '📉';
      return 'ℹ️';
    };

    const getWarningTitle = () => {
      if (warningType === 'size') return 'Image petite détectée';
      if (warningType === 'quality') return 'Qualité d\'image faible';
      return 'Note importante';
    };

    const handleUseAnyway = () => {
      setSelectedImages(prev => ({
        ...prev,
        [imageType]: imageData
      }));
      setImageWarningModal({ visible: false, imageData: null, imageType: null });
      Alert.alert(
        'Image acceptée',
        `Vue ${getViewLabel(imageType)} ajoutée avec succès!`,
        [{ text: 'OK' }]
      );
    };

    const handleSelectNew = () => {
      setImageWarningModal({ visible: false, imageData: null, imageType: null });
      setTimeout(() => {
        Alert.alert(
          'Choisir une autre image',
          'Voulez-vous prendre une nouvelle photo ou choisir une autre image depuis la galerie?',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Prendre photo', onPress: () => takePhoto(imageType) },
            { text: 'Choisir photo', onPress: () => pickImage(imageType) },
          ]
        );
      }, 300);
    };

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageWarningModal({ visible: false, imageData: null, imageType: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.warningModal, { backgroundColor: COLORS.card }]}>
            <View style={[styles.warningHeader, { backgroundColor: 'rgba(255,149,0,0.05)' }]}>
              <Text style={styles.warningIcon}>{getWarningIcon()}</Text>
              <Text style={[styles.warningTitle, { color: COLORS.text }]}>{getWarningTitle()}</Text>
            </View>
            
            <ScrollView style={styles.warningContent}>
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: imageData.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <View style={styles.imageStats}>
                  <Text style={[styles.imageStat, { color: COLORS.textSecondary }]}>
                    Taille: {imageData.width} × {imageData.height} pixels
                  </Text>
                  {imageData.fileSize && (
                    <Text style={[styles.imageStat, { color: COLORS.textSecondary }]}>
                      Poids: {(imageData.fileSize / 1024).toFixed(1)} KB
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.warningsList}>
                {warnings.map((warning, index) => (
                  <View key={index} style={styles.warningItem}>
                    <Feather 
                      name={warning.level === 'warning' ? 'alert-triangle' : 'info'} 
                      size={18} 
                      color={warning.level === 'warning' ? COLORS.warning : COLORS.primary} 
                    />
                    <Text style={[
                      styles.warningMessage,
                      warning.level === 'warning' && styles.warningMessageWarning,
                      { color: warning.level === 'warning' ? COLORS.warning : COLORS.text }
                    ]}>
                      {warning.message}
                    </Text>
                  </View>
                ))}
              </View>
              
              <View style={[styles.recommendations, { backgroundColor: 'rgba(0,122,255,0.05)' }]}>
                <Text style={[styles.recommendationsTitle, { color: COLORS.primary }]}>Recommandations :</Text>
                <Text style={[styles.recommendationText, { color: COLORS.textSecondary }]}>• Utilisez une photo en format portrait (3:4)</Text>
                <Text style={[styles.recommendationText, { color: COLORS.textSecondary }]}>• Taille minimale recommandée : 500×750 pixels</Text>
                <Text style={[styles.recommendationText, { color: COLORS.textSecondary }]}>• Bon éclairage, pas de contre-jour</Text>
                <Text style={[styles.recommendationText, { color: COLORS.textSecondary }]}>• Tenue légère pour une analyse précise</Text>
              </View>
            </ScrollView>
            
            <View style={styles.warningActions}>
              <TouchableOpacity 
                style={[styles.warningButton, styles.secondaryButton, { backgroundColor: COLORS.border }]}
                onPress={handleSelectNew}
              >
                <Text style={[styles.secondaryButtonText, { color: COLORS.text }]}>Choisir une autre</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.warningButton, styles.primaryButton, { backgroundColor: COLORS.primary }]}
                onPress={handleUseAnyway}
              >
                <Text style={styles.primaryButtonText}>Utiliser quand même</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const ImageSelectionCard = ({ type, title, description, icon }) => {
    const image = selectedImages[type];
    const dimensions = imageDimensions[type];
    
    return (
      <View style={[styles.imageCard, { backgroundColor: COLORS.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconTitleContainer}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
              <Ionicons name={icon} size={24} color={COLORS.primary} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={[styles.cardTitle, { color: COLORS.text }]}>{title}</Text>
              <Text style={[styles.cardSubtitle, { color: COLORS.textSecondary }]}>{description}</Text>
            </View>
          </View>
          
          {image ? (
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={() => clearImage(type)}
            >
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.requiredBadge, { backgroundColor: COLORS.error + '20' }]}>
              {type === 'front' && (
                <Text style={[styles.requiredText, { color: COLORS.error }]}>Requis</Text>
              )}
            </View>
          )}
        </View>
        
        {image ? (
          <View style={styles.selectedImageContainer}>
            <Image
              source={{ uri: image.uri }}
              style={[
                styles.selectedImage,
                dimensions && {
                  width: dimensions.width,
                  height: dimensions.height,
                  maxHeight: 400,
                }
              ]}
              resizeMode="contain"
            />
            <View style={[styles.imageInfo, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
              <View style={styles.imageInfoLeft}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={[styles.imageInfoText, { color: COLORS.success }]}>
                  Image sélectionnée
                </Text>
              </View>
              <View style={styles.imageInfoRight}>
                <Text style={[styles.imageSizeText, { color: COLORS.textSecondary }]}>
                  {image.width}×{image.height}
                </Text>
                {image.fileSize && (
                  <Text style={[styles.imageSizeText, { color: COLORS.textSecondary }]}>
                    • {(image.fileSize / 1024).toFixed(0)}KB
                  </Text>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.selectionButtons}>
            <TouchableOpacity 
              style={[styles.selectionButton, styles.cameraButton, { backgroundColor: COLORS.primary }]}
              onPress={() => takePhoto(type)}
            >
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.selectionButtonText}>Prendre photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.selectionButton, styles.galleryButton, { backgroundColor: COLORS.secondary }]}
              onPress={() => pickImage(type)}
            >
              <Ionicons name="images" size={20} color="white" />
              <Text style={styles.selectionButtonText}>Choisir photo</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {type === 'front' && (
          <View style={[styles.tipsContainer, { backgroundColor: 'rgba(255,149,0,0.05)', borderLeftColor: COLORS.warning }]}>
            <Text style={[styles.tipsTitle, { color: COLORS.text }]}>💡 Conseils pour une bonne photo :</Text>
            <Text style={[styles.tipsText, { color: COLORS.textSecondary }]}>• Toutes les tailles d'image sont acceptées</Text>
            <Text style={[styles.tipsText, { color: COLORS.textSecondary }]}>• Format portrait recommandé (3:4)</Text>
            <Text style={[styles.tipsText, { color: COLORS.textSecondary }]}>• Bon éclairage, pas de contre-jour</Text>
            <Text style={[styles.tipsText, { color: COLORS.textSecondary }]}>• Photo de la tête aux pieds si possible</Text>
          </View>
        )}
      </View>
    );
  };

  const selectedCount = Object.values(selectedImages).filter(img => img !== null).length;
  const canAnalyze = selectedImages.front !== null;

  if (isAnalyzing) {
    return (
      <LoadingSpinner 
        message="Analyse IA en cours... Cette opération peut prendre 1 à 2 minutes." 
        subMessage="L'IA analyse votre posture, composition corporelle et développement musculaire..."
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: COLORS.background }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: COLORS.card }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: COLORS.text }]}>BodyVision AI</Text>
            <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>Analyse Corporelle Avancée</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${(selectedCount / 3) * 100}%`,
                  backgroundColor: COLORS.primary
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: COLORS.textSecondary }]}>
            {selectedCount}/3 photos sélectionnées
          </Text>
        </View>

        <View style={styles.content}>
          <View style={[styles.introCard, { backgroundColor: 'rgba(0,122,255,0.05)', borderColor: 'rgba(0,122,255,0.1)' }]}>
            <View style={[styles.introIcon, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
              <MaterialIcons name="precision-manufacturing" size={32} color={COLORS.primary} />
            </View>
            <Text style={[styles.introTitle, { color: COLORS.text }]}>
              Analyse Multidimensionnelle
            </Text>
            <Text style={[styles.introDescription, { color: COLORS.textSecondary }]}>
              Pour une analyse précise, ajoutez des photos sous différents angles.
              Toutes les tailles d'image sont acceptées.
            </Text>
            <View style={styles.benefitsGrid}>
              <View style={styles.benefitItem}>
                <Ionicons name="expand" size={20} color={COLORS.success} />
                <Text style={[styles.benefitText, { color: COLORS.textSecondary }]}>Taille flexible</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="warning" size={20} color={COLORS.warning} />
                <Text style={[styles.benefitText, { color: COLORS.textSecondary }]}>Avertissements</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="analytics" size={20} color={COLORS.secondary} />
                <Text style={[styles.benefitText, { color: COLORS.textSecondary }]}>Analyse précise</Text>
              </View>
            </View>
          </View>

          <ImageSelectionCard
            type="front"
            title="Vue Frontale"
            description="Face complète, posture naturelle"
            icon="person"
          />
          
          <ImageSelectionCard
            type="back"
            title="Vue Postérieure"
            description="Dos, épaules, colonne vertébrale"
            icon="person-outline"
          />
          
          <ImageSelectionCard
            type="side"
            title="Vue Latérale"
            description="Profil, cambrure, alignement"
            icon="person-remove"
          />

          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={[
                styles.analyzeButton,
                !canAnalyze && styles.analyzeButtonDisabled,
                { backgroundColor: canAnalyze ? COLORS.primary : COLORS.border }
              ]}
              onPress={uploadImages}
              disabled={!canAnalyze || isAnalyzing}
            >
              <View style={styles.analyzeButtonContent}>
                <Ionicons 
                  name="analytics" 
                  size={24} 
                  color={canAnalyze ? "white" : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.analyzeButtonText,
                  !canAnalyze && styles.analyzeButtonTextDisabled,
                  { color: canAnalyze ? "white" : COLORS.textSecondary }
                ]}>
                  {isAnalyzing ? 'Analyse en cours...' : 'Lancer l\'Analyse Complète'}
                </Text>
              </View>
              {selectedCount > 0 && (
                <View style={styles.badge}>
                  <Text style={[styles.badgeText, { color: COLORS.primary }]}>{selectedCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {!canAnalyze && (
              <Text style={[styles.requiredHint, { color: COLORS.error }]}>
                ⚠️ La photo frontale est obligatoire pour commencer l'analyse
              </Text>
            )}
          </View>

          <View style={[styles.infoSection, { backgroundColor: COLORS.card }]}>
            <View style={styles.infoHeader}>
              <Ionicons name="help-circle" size={20} color={COLORS.primary} />
              <Text style={[styles.infoTitle, { color: COLORS.text }]}>À propos des images</Text>
            </View>
            <View style={styles.infoItems}>
              <View style={styles.infoItem}>
                <View style={[styles.infoNumber, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                  <Text style={styles.infoNumberText}>✓</Text>
                </View>
                <Text style={[styles.infoItemText, { color: COLORS.text }]}>
                  <Text style={[styles.infoItemBold, { color: COLORS.primary }]}>Toutes les tailles</Text> sont acceptées
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoNumber, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
                  <Text style={styles.infoNumberText}>⚠️</Text>
                </View>
                <Text style={[styles.infoItemText, { color: COLORS.text }]}>
                  <Text style={[styles.infoItemBold, { color: COLORS.warning }]}>Avertissements</Text> pour images non optimales
                </Text>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoNumber, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                  <Text style={styles.infoNumberText}>📏</Text>
                </View>
                <Text style={[styles.infoItemText, { color: COLORS.text }]}>
                  <Text style={[styles.infoItemBold, { color: COLORS.primary }]}>Recommandé:</Text> portrait, bonne luminosité
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.footer, { backgroundColor: COLORS.card }]}>
          <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>
            🔒 Vos images sont analysées localement et supprimées après traitement
          </Text>
          <Text style={[styles.techInfo, { color: COLORS.textSecondary }]}>
            Toutes les tailles d'image acceptées • IA adaptative • Analyse complète
          </Text>
        </View>
      </ScrollView>

      <ImageWarningModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: ({ COLORS }) => isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontWeight: '500',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  introCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  introDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  benefitsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  benefitItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  benefitText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  imageCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  removeButton: {
    padding: 4,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  selectedImageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedImage: {
    width: '100%',
    maxWidth: 400,
    minHeight: 200,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  imageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 8,
  },
  imageInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageInfoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageInfoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imageSizeText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  selectionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  cameraButton: {
    backgroundColor: ({ COLORS }) => COLORS.primary,
  },
  galleryButton: {
    backgroundColor: ({ COLORS }) => COLORS.secondary,
  },
  selectionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tipsContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 12,
    marginBottom: 2,
    lineHeight: 16,
  },
  actionSection: {
    marginTop: 8,
    marginBottom: 32,
  },
  analyzeButton: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: ({ COLORS }) => COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  analyzeButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  analyzeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  analyzeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  analyzeButtonTextDisabled: {
    color: ({ COLORS }) => COLORS.textSecondary,
  },
  badge: {
    backgroundColor: 'white',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  requiredHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  infoSection: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoItems: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  infoNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoItemText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  infoItemBold: {
    fontWeight: 'bold',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  techInfo: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  warningModal: {
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: ({ COLORS }) => COLORS.border,
  },
  warningIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  warningContent: {
    maxHeight: 400,
    padding: 20,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
  },
  imageStats: {
    flexDirection: 'row',
    gap: 16,
  },
  imageStat: {
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  warningsList: {
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  warningMessage: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  warningMessageWarning: {
    fontWeight: '500',
  },
  recommendations: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  warningActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: ({ COLORS }) => COLORS.border,
    gap: 12,
  },
  warningButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: ({ COLORS }) => COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: ({ COLORS }) => COLORS.border,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CameraScreen;