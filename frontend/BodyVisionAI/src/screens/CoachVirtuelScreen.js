// src/screens/CoachVirtuelScreen.js - Version améliorée (typing + swipe delete)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  FlatList,
  Dimensions,
  Animated,
  PanResponder,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
// react-native-gesture-handler — GestureHandlerRootView déjà dans App.js
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors, SHADOWS } from '../utils/constants';
import { coachAPI } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Composant TypingText : affichage progressif mot par mot ───
const TypingText = ({ text, style, onComplete, speed = 35 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const wordsRef = useRef([]);

  useEffect(() => {
    if (!text) return;
    wordsRef.current = text.split(/(\s+)/); // garder les espaces
    indexRef.current = 0;
    setDisplayedText('');

    const timer = setInterval(() => {
      if (indexRef.current < wordsRef.current.length) {
        const nextChunk = wordsRef.current.slice(0, indexRef.current + 1).join('');
        setDisplayedText(nextChunk);
        indexRef.current += 1;
      } else {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text]);

  return <Text style={style}>{displayedText}</Text>;
};

// ─── SwipeableHistoryItem — PanResponder pur, iOS + Android ─────────────────
const SWIPE_DELETE_W = 84;

const SwipeableHistoryItem = React.memo(({ item, isActive, isDeleting, COLORS, onPress, onDelete }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opened = useRef(false);

  // Visible uniquement quand on glisse à gauche
  const deleteOpacity = translateX.interpolate({
    inputRange: [-SWIPE_DELETE_W, -12, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const spring = (toValue) =>
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      tension: 65,
      friction: 9,
      overshootClamping: true,
    }).start(() => { opened.current = toValue < 0; });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.4,
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2,
      onPanResponderMove: (_, gs) => {
        const base = opened.current ? -SWIPE_DELETE_W : 0;
        translateX.setValue(Math.max(-SWIPE_DELETE_W, Math.min(0, base + gs.dx)));
      },
      onPanResponderRelease: (_, gs) => {
        const shouldOpen = gs.dx < -(SWIPE_DELETE_W / 2.5) || gs.vx < -0.3;
        const shouldClose = gs.dx > SWIPE_DELETE_W / 3 || gs.vx > 0.3;
        if (opened.current) { shouldClose ? spring(0) : spring(-SWIPE_DELETE_W); }
        else { shouldOpen ? spring(-SWIPE_DELETE_W) : spring(0); }
      },
      onPanResponderTerminate: () => { opened.current ? spring(-SWIPE_DELETE_W) : spring(0); },
    })
  ).current;

  return (
    <View style={swipeRowStyles.wrapper}>
      {/* Bouton supprimer — visible uniquement pendant le glissement */}
      <Animated.View style={[swipeRowStyles.deleteBack, { width: SWIPE_DELETE_W, opacity: deleteOpacity }]}>
        <TouchableOpacity
          style={swipeRowStyles.deleteBtn}
          onPress={() => { spring(0); setTimeout(onDelete, 200); }}
          activeOpacity={0.85}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={swipeRowStyles.deleteTxt}>Supprimer</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Contenu principal */}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={[
            swipeRowStyles.item,
            {
              backgroundColor: isActive ? 'rgba(79,70,229,0.10)' : COLORS.card,
              borderLeftWidth: isActive ? 3 : 0,
              borderLeftColor: COLORS.primary,
            },
          ]}
          onPress={() => { spring(0); setTimeout(onPress, 150); }}
          activeOpacity={0.75}
        >
          <View style={swipeRowStyles.itemHeader}>
            <View style={swipeRowStyles.dateRow}>
              <Ionicons name="calendar" size={14} color={COLORS.primary} />
              <Text style={[swipeRowStyles.dateTxt, { color: COLORS.primary }]}>
                {item.date} • {item.time}
              </Text>
            </View>
            <View style={swipeRowStyles.badge}>
              <Ionicons name="chatbubble" size={12} color={COLORS.text} />
              <Text style={[swipeRowStyles.badgeTxt, { color: COLORS.text }]}>{item.message_count}</Text>
            </View>
          </View>
          <Text style={[swipeRowStyles.preview, { color: COLORS.text }]} numberOfLines={2}>
            {item.preview || 'Nouvelle conversation'}
          </Text>
          <Text style={[swipeRowStyles.hint, { color: COLORS.textSecondary }]}>
            ← Glisser à gauche pour supprimer
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const swipeRowStyles = StyleSheet.create({
  wrapper: { marginBottom: 10, overflow: 'hidden', borderRadius: 16 },
  deleteBack: { position: 'absolute', right: 0, top: 0, bottom: 0, borderRadius: 16, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', gap: 3 },
  deleteTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  item: { borderRadius: 16, padding: 16 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateTxt: { fontSize: 12, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  preview: { fontSize: 13, lineHeight: 19 },
  hint: { fontSize: 10, marginTop: 6, textAlign: 'right', fontStyle: 'italic', opacity: 0.4 },
});

const CoachVirtuelScreen = () => {
  const { isDarkMode } = useTheme();
  const COLORS = getThemeColors(isDarkMode);
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  // rf() — adapte les tailles selon l'écran (ref: 390px largeur)
  const rf = useCallback((size) => {
    const scale = SCREEN_W / 390;
    return Math.round(PixelRatio.roundToNearestPixel(size * Math.min(Math.max(scale, 0.82), 1.18)));
  }, [SCREEN_W]);

  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isTextMode, setIsTextMode] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversationsList, setConversationsList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [typingMessageId, setTypingMessageId] = useState(null);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const scrollViewRef = useRef();
  const swipeableRefs = useRef({});

  // Initialiser la session
  useEffect(() => {
    const newSessionId = `sess_${Date.now()}`;
    setSessionId(newSessionId);
    setActiveSession(newSessionId);
  }, []);

  // Scroll automatique
  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 150);
  }, []);

  useEffect(() => {
    if (conversationHistory.length > 0) {
      scrollToBottom();
    }
  }, [conversationHistory, scrollToBottom]);

  // Charger l'historique quand le modal s'ouvre
  useEffect(() => {
    if (showHistory) {
      loadConversationHistory();
    }
  }, [showHistory]);

  // Charger l'historique
  const loadConversationHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await coachAPI.getConversationHistory(30);
      setConversationsList(response.data.conversations || []);
    } catch (error) {
      console.log('Historique non disponible:', error.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Charger une session
  const loadSession = async (sessionIdToLoad) => {
    try {
      const response = await coachAPI.getSessionDetails(sessionIdToLoad);
      const messages = response.data.messages || [];
      
      setConversationHistory(messages);
      setActiveSession(sessionIdToLoad);
      setSessionId(sessionIdToLoad);
      setShowHistory(false); // Fermer le modal après chargement
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger cette conversation');
      setShowHistory(false); // Fermer le modal même en cas d'erreur
    }
  };

  // Nouvelle conversation
  const startNewConversation = () => {
    const newSessionId = `sess_${Date.now()}`;
    setSessionId(newSessionId);
    setActiveSession(newSessionId);
    setConversationHistory([]);
    setTextInput('');
    setTypingMessageId(null);
  };

  // Supprimer une conversation (swipe)
  const deleteConversation = async (sessionIdToDelete) => {
    setDeletingSessionId(sessionIdToDelete);
    try {
      await coachAPI.deleteSession(sessionIdToDelete);
      // Retirer de la liste locale
      setConversationsList(prev => prev.filter(c => c.session_id !== sessionIdToDelete));
      // Si c'est la session active, on la nettoie aussi
      if (sessionIdToDelete === activeSession) {
        startNewConversation();
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      Alert.alert('Erreur', 'Impossible de supprimer cette conversation');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const confirmDeleteConversation = (sessionIdToDelete) => {
    Alert.alert(
      'Supprimer la conversation',
      'Cette conversation sera définitivement supprimée. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteConversation(sessionIdToDelete),
        },
      ]
    );
  };

  // Enregistrement audio
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Accès au microphone nécessaire');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
      
    } catch (error) {
      console.error('Erreur enregistrement:', error);
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      // Message temporaire
      const tempMessageId = Date.now();
      setConversationHistory(prev => [...prev, {
        id: tempMessageId,
        type: 'user',
        text: "🎤 Transcription en cours...",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      // Transcription
      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      });

      const transcribeRes = await coachAPI.transcribe(formData);
      const { text: userText, language } = transcribeRes.data;

      // Mettre à jour le message temporaire
      setConversationHistory(prev => prev.map(msg => 
        msg.id === tempMessageId ? {
          ...msg,
          text: userText
        } : msg
      ));

      // Obtenir la réponse
      const interactRes = await coachAPI.interact({ 
        query: userText, 
        lang: language,
        session_id: sessionId
      });
      
      const { response: coachResponse } = interactRes.data;
      
      const coachMsgId = Date.now() + 1;
      setConversationHistory(prev => [...prev, {
        id: coachMsgId,
        type: 'coach',
        text: coachResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setTypingMessageId(coachMsgId);

    } catch (error) {
      console.error('Erreur interaction:', error);
      setConversationHistory(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        text: 'Erreur de connexion au serveur',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Envoyer un message texte
  const sendTextMessage = async () => {
    const userText = textInput.trim();
    if (!userText) return;

    setTextInput('');
    Keyboard.dismiss();

    // Ajouter le message utilisateur
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setConversationHistory(prev => [...prev, userMessage]);

    setIsProcessing(true);

    try {
      const textRes = await coachAPI.textInteract(userText, sessionId);
      const { response: coachResponse } = textRes.data;
      
      // Ajouter la réponse du coach avec typing
      const coachMsgId = Date.now() + 1;
      setConversationHistory(prev => [...prev, {
        id: coachMsgId,
        type: 'coach',
        text: coachResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setTypingMessageId(coachMsgId);
      
    } catch (error) {
      console.error('Erreur envoi texte:', error);
      setConversationHistory(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        text: 'Erreur de communication',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Basculer entre modes
  const toggleMode = () => {
    setIsTextMode(!isTextMode);
    if (isTextMode) {
      setTextInput('');
      Keyboard.dismiss();
    }
  };

  // Suggestions rapides
  const quickSuggestions = [
    { id: 1, text: "Analyse mon profil et propose-moi des objectifs", icon: "trophy" },
    { id: 2, text: "Crée-moi un plan nutrition personnalisé", icon: "nutrition" },
    { id: 3, text: "Programme de musculation pour cette semaine", icon: "barbell" },
    { id: 4, text: "Comment améliorer ma posture ?", icon: "body" },
    { id: 5, text: "Quels exercices pour perdre du gras ?", icon: "fitness" },
    { id: 6, text: "Fais le point sur mes progrès", icon: "trending-up" },
  ];

  const handleQuickSuggestion = (text) => {
    if (isTextMode) {
      setTextInput(text);
      setTimeout(() => sendTextMessage(), 100);
    } else {
      setIsTextMode(true);
      setTextInput(text);
      setTimeout(() => sendTextMessage(), 300);
    }
  };

  // Rendu du modal d'historique
  const renderHistoryModal = () => (
    <Modal
      visible={showHistory}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      onRequestClose={() => setShowHistory(false)}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop — ferme le modal au tap sans bloquer les gestes dans le contenu */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={() => setShowHistory(false)}
        />
        <View style={[styles.modalContent, { backgroundColor: COLORS.background, maxHeight: SCREEN_H * 0.82 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>
              Historique des conversations
            </Text>
            <TouchableOpacity 
              onPress={() => setShowHistory(false)}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {loadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : conversationsList.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="chatbubbles-outline" size={50} color={COLORS.textSecondary} />
              <Text style={[styles.emptyText, { color: COLORS.textSecondary }]}>
                Aucune conversation récente
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversationsList}
              keyExtractor={(item, index) => `${item.session_id}_${index}`}
              contentContainerStyle={styles.historyList}
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => (
                <SwipeableHistoryItem
                  item={item}
                  isActive={item.session_id === activeSession}
                  isDeleting={deletingSessionId === item.session_id}
                  COLORS={COLORS}
                  onPress={() => loadSession(item.session_id)}
                  onDelete={() => confirmDeleteConversation(item.session_id)}
                />
              )}
            />
          )}

          <TouchableOpacity
            style={[styles.newConversationButton, { backgroundColor: COLORS.primary }]}
            onPress={() => {
              startNewConversation();
              setShowHistory(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.newConversationText}>Nouvelle conversation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        {/* Header */}
        <View style={[styles.header, SHADOWS.sm]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.title, { color: COLORS.text, fontSize: rf(24) }]}>
                Coach Virtuel
              </Text>
              <Text style={[styles.subtitle, { color: COLORS.textSecondary, fontSize: rf(13) }]}>
                Ton expert fitness, nutrition & posture
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.historyIcon, { backgroundColor: COLORS.primary + '12' }]}
                onPress={() => setShowHistory(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="time-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.newIcon, { backgroundColor: COLORS.success + '12' }]}
                onPress={startNewConversation}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="add-circle-outline" size={22} color={COLORS.success} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Suggestions */}
        {conversationHistory.length === 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={[styles.suggestionsTitle, { color: COLORS.textSecondary }]}>
              Questions rapides :
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsContainer}
            >
              {quickSuggestions.map((item) => (
                <TouchableOpacity
                  key={`suggestion_${item.id}`}
                  style={[styles.suggestionCard, { backgroundColor: COLORS.card }]}
                  onPress={() => handleQuickSuggestion(item.text)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={item.icon} size={18} color={COLORS.primary} />
                  <Text style={[styles.suggestionText, { color: COLORS.text }]} numberOfLines={2}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Conversation */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.conversationArea}
          contentContainerStyle={styles.conversationContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToBottom()}
          onLayout={() => scrollToBottom(false)}
        >
          {conversationHistory.length === 0 ? (
            <View style={styles.welcomeContainer}>
              <Ionicons name="fitness-outline" size={60} color={COLORS.primary + '50'} />
              <Text style={[styles.welcomeTitle, { color: COLORS.text }]}>
                Ton coach personnel t'attend
              </Text>
              <Text style={[styles.welcomeText, { color: COLORS.textSecondary }]}>
                Fitness, nutrition, posture, objectifs… Je connais ton profil et tes analyses. Pose-moi n'importe quelle question !
              </Text>
              <Text style={[styles.welcomeHint, { color: COLORS.textSecondary + '80' }]}>
                Je garde en mémoire nos échanges et je suis tes progrès 📈
              </Text>
            </View>
          ) : (
            conversationHistory.map((item, index) => (
              <View 
                key={`msg_${item.id}_${index}`}
                style={[
                  styles.messageContainer,
                  item.type === 'user' 
                    ? styles.userMessageContainer
                    : item.type === 'coach'
                    ? styles.coachMessageContainer
                    : styles.errorMessageContainer
                ]}
              >
                <View style={styles.messageHeader}>
                  <View style={[
                    styles.avatar,
                    {
                      backgroundColor:
                        item.type === 'user' ? 'rgba(79,70,229,0.15)'
                        : item.type === 'coach' ? 'rgba(16,185,129,0.15)'
                        : 'rgba(239,68,68,0.15)',
                    }
                  ]}>
                    <Ionicons
                      name={item.type === 'user' ? 'person-outline'
                            : item.type === 'coach' ? 'fitness' : 'warning-outline'}
                      size={16}
                      color={item.type === 'user' ? COLORS.primary
                            : item.type === 'coach' ? COLORS.success : COLORS.error}
                    />
                  </View>
                  <View style={styles.messageInfo}>
                    <Text style={[
                      styles.senderName,
                      { 
                        color: item.type === 'user' ? COLORS.primary : 
                              item.type === 'coach' ? COLORS.success : COLORS.error
                      }
                    ]}>
                      {item.type === 'user' ? 'Vous' : 
                       item.type === 'coach' ? 'Coach' : 'Erreur'}
                    </Text>
                    <Text style={[styles.messageTime, { color: COLORS.textSecondary }]}>
                      {item.time}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.messageBubble,
                  item.type === 'user' ? styles.userBubble : null,
                  {
                    backgroundColor: item.type === 'error'
                      ? isDarkMode ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.08)'
                      : item.type === 'user' && Platform.OS === 'ios'
                      ? isDarkMode ? 'rgba(79,70,229,0.22)' : 'rgba(79,70,229,0.10)'
                      : COLORS.card,
                  }
                ]}>
                  {item.type === 'coach' && item.id === typingMessageId ? (
                    <TypingText
                      text={item.text}
                      style={[styles.messageText, { color: COLORS.text, fontSize: rf(15), lineHeight: rf(22) }]}
                      speed={35}
                      onComplete={() => setTypingMessageId(null)}
                    />
                  ) : (
                    <Text style={[
                      styles.messageText,
                      { color: item.type === 'error' ? COLORS.error : COLORS.text, fontSize: rf(15), lineHeight: rf(22) }
                    ]}>
                      {item.text}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Zone de saisie */}
        <View style={[styles.inputSection, { backgroundColor: COLORS.background }]}>
          {isTextMode ? (
            <View style={styles.textInputWrapper}>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: COLORS.card,
                    color: COLORS.text,
                    borderColor: COLORS.border,
                    fontSize: rf(15),
                  }
                ]}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Posez votre question..."
                placeholderTextColor={COLORS.textSecondary}
                multiline
                maxLength={300}
                editable={!isProcessing}
                onSubmitEditing={sendTextMessage}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { 
                    backgroundColor: textInput.trim() && !isProcessing ? COLORS.primary : COLORS.textSecondary,
                    opacity: textInput.trim() && !isProcessing ? 1 : 0.6
                  }
                ]}
                onPress={sendTextMessage}
                disabled={!textInput.trim() || isProcessing}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="send" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.voiceSection}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  {
                    backgroundColor: isRecording ? COLORS.error : COLORS.primary,
                    transform: [{ scale: isRecording ? 1.1 : 1 }]
                  },
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <ActivityIndicator size="large" color="white" />
                ) : isRecording ? (
                  <>
                    <View style={styles.recordingIndicator}>
                      <View style={styles.recordingDot} />
                    </View>
                    <Text style={styles.recordButtonText}>Parlez...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="mic" size={32} color="white" />
                    <Text style={styles.recordButtonText}>Parler</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.modeToggle, { backgroundColor: COLORS.card }]}
            onPress={toggleMode}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isTextMode ? "mic-outline" : "chatbubble-outline"} 
              size={18} 
              color={COLORS.primary} 
            />
            <Text style={[styles.modeToggleText, { color: COLORS.primary }]}>
              {isTextMode ? 'Passer au vocal' : 'Passer au texte'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {renderHistoryModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  suggestionsContainer: {
    gap: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 10,
    marginRight: 8,
    minWidth: 170,
    ...SHADOWS.sm,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  conversationArea: {
    flex: 1,
  },
  conversationContent: {
    padding: 16,
    paddingBottom: 20,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 21,
  },
  welcomeHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  messageContainer: {
    marginBottom: 18,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  coachMessageContainer: {
    alignItems: 'flex-start',
  },
  errorMessageContainer: {
    alignItems: 'center',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.6,
  },
  messageBubble: {
    padding: 14,
    borderRadius: 18,
    maxWidth: '85%',
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 1 },
      ios: { ...SHADOWS.sm },
    }),
  },
  userBubble: {
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 100,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1.5,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  voiceSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  recordingIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
    ...SHADOWS.sm,
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHistory: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  historyList: {
    paddingBottom: 20,
  },
  historyItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyPreview: {
    fontSize: 13,
    lineHeight: 19,
  },
  swipeHint: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'right',
    fontStyle: 'italic',
    opacity: 0.4,
  },
  swipeDeleteContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 10,
    borderRadius: 16,
  },
  swipeDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 16,
    paddingVertical: 8,
  },
  swipeDeleteText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  newConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
    ...SHADOWS.sm,
  },
  newConversationText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default CoachVirtuelScreen;