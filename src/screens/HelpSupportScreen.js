import React, { useState } from 'react';

import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import Constants from 'expo-constants';

import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme/colors';

// Put your team's support address here to show an "Email support" button.
const SUPPORT_EMAIL = '';

const FAQS = [
  {
    question: 'How do I add a medication?',
    answer:
      'Tap the + button in the middle of the bottom bar, enter the medication details, choose the times you take it and save. MedTrack will remind you at those times.',
  },
  {
    question: 'I am not getting reminders',
    answer:
      'Open Profile > Medication Reminders and make sure reminders are switched on, then use the test notification. Also check that notifications are allowed for MedTrack in your phone settings and that battery saver is not stopping the app.',
  },
  {
    question: 'What counts as a missed dose?',
    answer:
      'A dose is recorded as missed when 60 minutes have passed since its scheduled time and you have not marked it as taken or skipped.',
  },
  {
    question: 'How do caregivers work?',
    answer:
      'Go to Profile > Caregiver & Family and invite someone by email. They sign in to MedTrack with that same email address and accept your invitation. You can remove them at any time.',
  },
  {
    question: 'How do I find a pharmacy?',
    answer:
      'Open Find Pharmacy, allow location access and MedTrack will list pharmacies near you with their distance, opening hours and directions.',
  },
  {
    question: 'Is MedTrack a replacement for medical advice?',
    answer:
      'No. MedTrack helps you organise medication and reminders. Always follow your doctor or pharmacist for medical decisions, and call your local emergency number in an emergency.',
  },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);

  return (
    <Pressable
      onPress={() => setOpen((value) => !value)}
      style={({ pressed }) => [styles.faq, pressed && styles.pressed]}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.question}</Text>

        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </View>

      {open ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
    </Pressable>
  );
}

function ActionRow({ icon, title, subtitle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>

      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </Pressable>
  );
}

export default function HelpSupportScreen({ navigation }) {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const emailSupport = async () => {
    try {
      await Linking.openURL(
        `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`MedTrack support (v${version})`)}`
      );
    } catch (error) {
      Alert.alert('Unable to open email', `Please email us at ${SUPPORT_EMAIL}.`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Help & Support"
        subtitle="Answers to common questions"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Quick help</Text>

        <View style={styles.card}>
          <ActionRow
            icon="notifications-outline"
            title="Reminder settings"
            subtitle="Fix missing or silent reminders"
            onPress={() => navigation.navigate('Settings')}
          />

          <View style={styles.divider} />

          <ActionRow
            icon="call-outline"
            title="Emergency contacts"
            subtitle="People to reach quickly in an emergency"
            onPress={() => navigation.navigate('Emergency')}
          />

          <View style={styles.divider} />

          <ActionRow
            icon="medical-outline"
            title="Find a pharmacy"
            subtitle="Pharmacies near your location"
            onPress={() => navigation.navigate('Pharmacies')}
          />

          {SUPPORT_EMAIL ? (
            <>
              <View style={styles.divider} />

              <ActionRow
                icon="mail-outline"
                title="Email support"
                subtitle={SUPPORT_EMAIL}
                onPress={emailSupport}
              />
            </>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Frequently asked questions</Text>

        <View style={styles.card}>
          {FAQS.map((item, index) => (
            <View key={item.question}>
              {index > 0 ? <View style={styles.divider} /> : null}

              <FaqItem item={item} />
            </View>
          ))}
        </View>

        <Text style={styles.version}>MedTrack v{version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 48 },

  sectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  card: {
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  divider: { height: 1, backgroundColor: colors.border },

  actionRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center' },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionContent: { flex: 1, marginLeft: 12, marginRight: 8 },

  actionTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },

  actionSubtitle: { marginTop: 3, color: colors.textSecondary, fontSize: 12 },

  faq: { paddingVertical: 16 },

  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  faqQuestion: { flex: 1, marginRight: 10, color: colors.text, fontSize: 14, fontWeight: '700' },

  faqAnswer: { marginTop: 10, color: colors.textSecondary, fontSize: 13, lineHeight: 20 },

  version: {
    marginTop: 14,
    textAlign: 'center',
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },

  pressed: { opacity: 0.7 },
});
