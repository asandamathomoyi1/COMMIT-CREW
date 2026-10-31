import React, { useState } from 'react';

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

import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const createAccount = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    if (!cleanEmail) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Your password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords are the same.');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      });

      if (error) {
        Alert.alert('Account creation failed', error.message);
        return;
      }

      // With email confirmation on, signing up an address that already exists returns no error
      // but a user with an empty identities list.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        Alert.alert(
          'Email already registered',
          'An account with this email already exists. Please sign in instead, or reset your password.'
        );
        return;
      }

      if (!data.session) {
        Alert.alert(
          'Check your email',
          'Your MedTrack account was created. Please check your email and confirm your account before signing in.',
          [
            {
              text: 'Go to Sign In',
              onPress: () => navigation.replace('Login'),
            },
          ]
        );

        return;
      }

      Alert.alert('Welcome to MedTrack', 'Your account has been created successfully.');
    } catch (error) {
      Alert.alert('Something went wrong', error?.message ?? 'We could not create your account.');
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>

            <View style={styles.brandBadge}>
              <Ionicons name="medical" size={20} color={colors.primary} />

              <Text style={styles.brandText}>MedTrack</Text>
            </View>

            <View style={styles.topSpacer} />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="person-add-outline" size={29} color={colors.primary} />
            </View>

            <Text style={styles.title}>Create your account</Text>

            <Text style={styles.subtitle}>
              Start building a safer and easier medication routine with MedTrack.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Full name</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={19} color={colors.textSecondary} />

              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textLight}
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>Email address</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={19} color={colors.textSecondary} />

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

            <Text style={styles.label}>Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={19} color={colors.textSecondary} />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 6 characters"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={styles.input}
              />

              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <Text style={styles.label}>Confirm password</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="shield-checkmark-outline" size={19} color={colors.textSecondary} />

              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                style={styles.input}
              />

              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={10}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={18} color={colors.secondary} />

              <Text style={styles.securityText}>
                Your private medication data will only be accessible through your authenticated
                account.
              </Text>
            </View>

            <Pressable
              disabled={loading}
              onPress={createAccount}
              style={({ pressed }) => [
                styles.createButton,
                pressed && !loading && styles.buttonPressed,
                loading && styles.disabledButton,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.createButtonText}>Create Account</Text>

                  <Ionicons name="arrow-forward" size={19} color={colors.white} />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.signInRow}>
            <Text style={styles.signInPrompt}>Already have an account?</Text>

            <Pressable onPress={() => navigation.replace('Login')}>
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
          </View>

          <Text style={styles.disclaimer}>
            MedTrack supports medication organisation and reminders. It does not replace advice from
            a qualified healthcare professional.
          </Text>
        </ScrollView>
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

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 35,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  brandText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  topSpacer: {
    width: 44,
  },

  hero: {
    alignItems: 'center',
    marginTop: 30,
  },

  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    marginTop: 18,
    color: colors.text,
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 9,
    maxWidth: 310,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },

  formCard: {
    marginTop: 27,
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  label: {
    marginTop: 14,
    marginBottom: 8,
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },

  inputContainer: {
    height: 55,
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
    height: 54,
    marginLeft: 10,
    color: colors.text,
    fontSize: 13,
  },

  securityNote: {
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.secondaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  securityText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  createButton: {
    marginTop: 20,
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  createButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
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

  signInRow: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },

  signInPrompt: {
    color: colors.textSecondary,
    fontSize: 11,
  },

  signInText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  disclaimer: {
    marginTop: 25,
    paddingHorizontal: 20,
    color: colors.textLight,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.7,
  },
});
