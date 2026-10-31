import React, { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const sendResetEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert(
        'Email required',
        'Please enter the email address connected to your MedTrack account.'
      );
      return;
    }

    if (!cleanEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

      if (error) {
        Alert.alert('Unable to send email', error.message);
        return;
      }

      Alert.alert(
        'Check your email',
        'If an account is associated with this email address, password reset instructions have been sent.',
        [
          {
            text: 'Back to Sign In',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Something went wrong',
        error?.message ?? 'We could not send the password reset email.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>

            <Text style={styles.headerTitle}>Password Recovery</Text>

            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="key-outline" size={32} color={colors.primary} />
            </View>

            <Text style={styles.title}>Forgot your password?</Text>

            <Text style={styles.subtitle}>
              Enter the email address connected to your MedTrack account and we'll send you password
              reset instructions.
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>Email address</Text>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <Pressable
                disabled={loading}
                onPress={sendResetEmail}
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && !loading && styles.buttonPressed,
                  loading && styles.disabledButton,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={19} color={colors.white} />

                    <Text style={styles.resetButtonText}>Send Reset Email</Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.helpCard}>
              <Ionicons name="information-circle-outline" size={21} color={colors.secondary} />

              <Text style={styles.helpText}>
                Check your spam or junk folder if the email does not appear in your inbox.
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    paddingHorizontal: 22,
  },

  header: {
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  headerSpacer: {
    width: 44,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 70,
  },

  iconContainer: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    marginTop: 22,
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 10,
    alignSelf: 'center',
    maxWidth: 315,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },

  card: {
    marginTop: 28,
    padding: 18,
    borderRadius: 23,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  label: {
    marginBottom: 8,
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },

  inputContainer: {
    height: 56,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    height: 55,
    marginLeft: 10,
    color: colors.text,
    fontSize: 13,
  },

  resetButton: {
    marginTop: 18,
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  resetButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  helpCard: {
    marginTop: 17,
    padding: 13,
    borderRadius: 15,
    backgroundColor: colors.secondaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  helpText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  disabledButton: {
    opacity: 0.65,
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  pressed: {
    opacity: 0.7,
  },
});
