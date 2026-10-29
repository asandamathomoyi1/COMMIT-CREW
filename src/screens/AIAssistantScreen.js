import React, { useCallback, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';
import { askMedTrackAI } from '../services/ai';
import { colors } from '../theme/colors';

const quickPrompts = [
  {
    id: 'medications',
    title: 'My medications',
    subtitle: 'See what I am taking',
    icon: 'medical-outline',
    prompt: 'What medications am I currently taking?',
  },
  {
    id: 'adherence',
    title: 'My adherence',
    subtitle: 'Check my recent progress',
    icon: 'analytics-outline',
    prompt: 'How is my medication adherence?',
  },
  {
    id: 'missed',
    title: 'Missed doses',
    subtitle: 'Review missed medication',
    icon: 'time-outline',
    prompt: 'Have I missed any doses?',
  },
  {
    id: 'instructions',
    title: 'Instructions',
    subtitle: 'Review medication directions',
    icon: 'help-circle-outline',
    prompt: 'Show my medication instructions.',
  },
];

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

function formatMessageTime(date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStartOfLastSevenDays() {
  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 6);

  return date.toISOString();
}

function createMessageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AIAssistantScreen({ navigation }) {
  const scrollViewRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const [input, setInput] = useState('');

  const [firstName, setFirstName] = useState('');

  const [medications, setMedications] = useState([]);

  const [doseLogs, setDoseLogs] = useState([]);

  const [messages, setMessages] = useState([]);

  const loadAssistantContext = useCallback(async () => {
    try {
      setLoading(true);

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const [profileResult, medicationResult, doseLogResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),

        supabase
          .from('medications')
          .select(
            `
              id,
              name,
              dosage,
              instructions,
              current_quantity
            `
          )
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', {
            ascending: true,
          }),

        supabase
          .from('dose_logs')
          .select(
            `
              id,
              medication_id,
              scheduled_for,
              status
            `
          )
          .eq('user_id', user.id)
          .gte('scheduled_for', getStartOfLastSevenDays())
          .order('scheduled_for', {
            ascending: false,
          }),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (medicationResult.error) {
        throw medicationResult.error;
      }

      if (doseLogResult.error) {
        throw doseLogResult.error;
      }

      const profileName = profileResult.data?.full_name?.trim() ?? '';

      const shortName = profileName.split(' ').filter(Boolean)[0] ?? '';

      setFirstName(shortName);

      setMedications(medicationResult.data ?? []);

      setDoseLogs(doseLogResult.data ?? []);

      setMessages((current) => {
        if (current.length > 0) {
          return current;
        }

        return [
          {
            id: 'welcome',
            role: 'assistant',
            text: shortName
              ? `${getGreeting()}, ${shortName}. I’m your MedTrack AI Assistant. I can help you understand your medications, recent adherence and general medication information. What would you like to ask?`
              : `${getGreeting()}. I’m your MedTrack AI Assistant. I can help you understand your medications, recent adherence and general medication information. What would you like to ask?`,
            time: new Date(),
          },
        ];
      });
    } catch (error) {
      console.error('AI Assistant context error:', error);

      Alert.alert(
        'Unable to load assistant',
        error?.message ?? 'MedTrack could not load your medication information.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAssistantContext();
    }, [loadAssistantContext])
  );

  const adherence = useMemo(() => {
    if (doseLogs.length === 0) {
      return 0;
    }

    const taken = doseLogs.filter((log) => log.status === 'taken').length;

    return Math.round((taken / doseLogs.length) * 100);
  }, [doseLogs]);

  const missedCount = useMemo(
    () => doseLogs.filter((log) => log.status === 'missed').length,
    [doseLogs]
  );

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  };

  const addConversation = async (question) => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || sending) {
      return;
    }

    const userMessage = {
      id: createMessageId('user'),
      role: 'user',
      text: cleanQuestion,
      time: new Date(),
    };

    setMessages((current) => [...current, userMessage]);

    setInput('');
    setSending(true);

    scrollToBottom();

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData.session) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      // Previous turns (without the welcome / error bubbles) give the AI conversation memory.
      const history = messages.filter(
        (item) => item.id !== 'welcome' && !item.id.startsWith('assistant-error')
      );

      const { reply, source } = await askMedTrackAI(cleanQuestion, {
        history,
        context: { firstName, medications, doseLogs },
      });

      const assistantMessage = {
        id: createMessageId('assistant'),
        role: 'assistant',
        text:
          source === 'local'
            ? `${reply}\n\n(Answered from your saved MedTrack data. The online AI is not reachable right now.)`
            : reply,
        time: new Date(),
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      console.error('MedTrack AI request error:', error);

      const errorMessage = {
        id: createMessageId('assistant-error'),
        role: 'assistant',
        text: 'I’m having trouble connecting to MedTrack AI right now. Please try again in a moment.',
        time: new Date(),
      };

      setMessages((current) => [...current, errorMessage]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  const clearConversation = () => {
    if (sending) {
      return;
    }

    Alert.alert(
      'Start a new conversation?',
      'The messages currently shown on this screen will be cleared.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([
              {
                id: createMessageId('welcome'),
                role: 'assistant',
                text: firstName
                  ? `${getGreeting()}, ${firstName}. What would you like to ask MedTrack AI?`
                  : `${getGreeting()}. What would you like to ask MedTrack AI?`,
                time: new Date(),
              },
            ]);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingLogo}>
            <Ionicons name="sparkles" size={29} color={colors.primary} />
          </View>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{
              marginTop: 18,
            }}
          />

          <Text style={styles.loadingTitle}>Preparing MedTrack AI</Text>

          <Text style={styles.loadingText}>Loading your medication context...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerIdentity}>
            <View style={styles.headerAssistantIcon}>
              <Ionicons name="sparkles" size={17} color={colors.white} />
            </View>

            <View>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerTitle}>MedTrack AI</Text>

                <View style={styles.onlineDot} />
              </View>

              <Text style={styles.headerSubtitle}>Secure AI medication companion</Text>
            </View>
          </View>

          <Pressable
            onPress={clearConversation}
            disabled={sending}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && !sending && styles.pressed,
              sending && styles.headerButtonDisabled,
            ]}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.contextStrip}>
          <View style={styles.contextItem}>
            <View style={styles.contextIcon}>
              <Ionicons name="medical-outline" size={14} color={colors.primary} />
            </View>

            <View>
              <Text style={styles.contextValue}>{medications.length}</Text>

              <Text style={styles.contextLabel}>Active meds</Text>
            </View>
          </View>

          <View style={styles.contextDivider} />

          <View style={styles.contextItem}>
            <View style={styles.contextIcon}>
              <Ionicons name="analytics-outline" size={14} color={colors.primary} />
            </View>

            <View>
              <Text style={styles.contextValue}>
                {doseLogs.length > 0 ? `${adherence}%` : '--'}
              </Text>

              <Text style={styles.contextLabel}>7-day adherence</Text>
            </View>
          </View>

          <View style={styles.contextDivider} />

          <View style={styles.contextItem}>
            <View style={styles.contextIcon}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
            </View>

            <View>
              <Text style={styles.contextValue}>{missedCount}</Text>

              <Text style={styles.contextLabel}>Missed</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({
              animated: true,
            });
          }}
        >
          <View style={styles.safetyNotice}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />

            <Text style={styles.safetyNoticeText}>
              MedTrack AI can explain and summarize information, but it does not replace your doctor
              or pharmacist.
            </Text>
          </View>

          {messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <View
                key={message.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.userMessageRow : styles.assistantMessageRow,
                ]}
              >
                {!isUser && (
                  <View style={styles.assistantAvatar}>
                    <Ionicons name="sparkles" size={15} color={colors.white} />
                  </View>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  {!isUser && <Text style={styles.assistantLabel}>MEDTRACK AI</Text>}

                  <Text style={[styles.messageText, isUser && styles.userMessageText]}>
                    {message.text}
                  </Text>

                  <Text style={[styles.messageTime, isUser && styles.userMessageTime]}>
                    {formatMessageTime(message.time)}
                  </Text>
                </View>
              </View>
            );
          })}

          {messages.length <= 1 && !sending && (
            <View style={styles.quickSection}>
              <Text style={styles.quickTitle}>Ask about your health routine</Text>

              <Text style={styles.quickSubtitle}>Try one of these MedTrack questions</Text>

              <View style={styles.quickGrid}>
                {quickPrompts.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => addConversation(item.prompt)}
                    style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
                  >
                    <View style={styles.quickIcon}>
                      <Ionicons name={item.icon} size={20} color={colors.primary} />
                    </View>

                    <Text style={styles.quickCardTitle}>{item.title}</Text>

                    <Text style={styles.quickCardSubtitle}>{item.subtitle}</Text>

                    <Ionicons
                      name="arrow-forward-outline"
                      size={15}
                      color={colors.textLight}
                      style={styles.quickArrow}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {sending && (
            <View style={[styles.messageRow, styles.assistantMessageRow]}>
              <View style={styles.assistantAvatar}>
                <Ionicons name="sparkles" size={15} color={colors.white} />
              </View>

              <View style={styles.typingBubble}>
                <View style={styles.typingDot} />

                <View style={styles.typingDot} />

                <View style={styles.typingDot} />
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask MedTrack AI..."
              placeholderTextColor={colors.textLight}
              style={styles.input}
              multiline
              maxLength={600}
              editable={!sending}
            />

            <Pressable
              disabled={sending || !input.trim()}
              onPress={() => addConversation(input)}
              style={({ pressed }) => [
                styles.sendButton,
                (!input.trim() || sending) && styles.sendButtonDisabled,
                pressed && input.trim() && !sending && styles.pressed,
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="arrow-up" size={19} color={colors.white} />
              )}
            </Pressable>
          </View>

          <Text style={styles.inputDisclaimer}>
            Do not use MedTrack AI for emergencies or to change a prescribed dose.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
  },

  header: {
    height: 66,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerButtonDisabled: {
    opacity: 0.5,
  },

  headerIdentity: {
    flex: 1,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerAssistantIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginLeft: 6,
  },

  headerSubtitle: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },

  contextStrip: {
    minHeight: 66,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  contextItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  contextIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  contextValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  contextLabel: {
    marginTop: 1,
    color: colors.textSecondary,
    fontSize: 6.5,
  },

  contextDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  chatScroll: {
    flex: 1,
  },

  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 15,
  },

  safetyNotice: {
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#D9E8FA',
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  safetyNoticeText: {
    flex: 1,
    marginLeft: 8,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  messageRow: {
    width: '100%',
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  assistantMessageRow: {
    justifyContent: 'flex-start',
  },

  userMessageRow: {
    justifyContent: 'flex-end',
  },

  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },

  assistantBubble: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 17,
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
  },

  userBubble: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
  },

  assistantLabel: {
    marginBottom: 5,
    color: colors.primary,
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  messageText: {
    color: colors.text,
    fontSize: 12.5,
    lineHeight: 17,
  },

  userMessageText: {
    color: colors.white,
  },

  messageTime: {
    marginTop: 6,
    color: colors.textLight,
    fontSize: 6.5,
  },

  userMessageTime: {
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'right',
  },

  quickSection: {
    marginTop: 4,
    marginBottom: 14,
  },

  quickTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  quickSubtitle: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
  },

  quickGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  quickCard: {
    width: '48.5%',
    minHeight: 122,
    marginBottom: 10,
    padding: 13,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickCardTitle: {
    marginTop: 10,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  quickCardSubtitle: {
    marginTop: 3,
    paddingRight: 17,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },

  quickArrow: {
    position: 'absolute',
    right: 11,
    bottom: 11,
  },

  typingBubble: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textLight,
  },

  bottomSpacer: {
    height: 10,
  },

  inputArea: {
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },

  inputContainer: {
    minHeight: 50,
    maxHeight: 110,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 100,
    paddingTop: 14,
    paddingBottom: 12,
    paddingRight: 8,
    color: colors.text,
    fontSize: 13,
  },

  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    marginBottom: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButtonDisabled: {
    backgroundColor: colors.textLight,
  },

  inputDisclaimer: {
    marginTop: 6,
    color: colors.textLight,
    textAlign: 'center',
    fontSize: 6.5,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingLogo: {
    width: 68,
    height: 68,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingTitle: {
    marginTop: 15,
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  loadingText: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 12,
  },

  pressed: {
    opacity: 0.72,
  },
});
