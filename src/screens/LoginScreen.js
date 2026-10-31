import React, { useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
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

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }

    if (!password) {
      Alert.alert('Password required', 'Please enter your password.');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const notConfirmed =
          error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message ?? '');

        if (notConfirmed) {
          Alert.alert(
            'Confirm your email first',
            'We sent a confirmation link to your email address. Open it, then sign in again. Check your spam folder if you cannot find it.',
            [
              { text: 'OK', style: 'cancel' },
              {
                text: 'Resend email',
                onPress: async () => {
                  const { error: resendError } = await supabase.auth.resend({
                    type: 'signup',
                    email: cleanEmail,
                  });

                  Alert.alert(
                    resendError ? 'Could not resend' : 'Email sent',
                    resendError
                      ? resendError.message
                      : 'A new confirmation email is on its way. It can take a minute to arrive.'
                  );
                },
              },
            ]
          );
          return;
        }

        Alert.alert('Unable to sign in', error.message);
        return;
      }

      // No navigation command is needed here.
      // AuthContext detects the new Supabase session
      // and AppNavigator automatically opens Main.
    } catch (error) {
      Alert.alert('Something went wrong', error?.message ?? 'We could not sign you in.');
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
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/medtrack.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.welcomeTitle}>Welcome back</Text>

            <Text style={styles.welcomeSubtitle}>
              Sign in to manage your medication schedule and health routine.
            </Text>
          </View>

          <View style={styles.formCard}>
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

            <Text style={styles.label}>Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={styles.input}
              />

              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={21}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={signIn}
              style={({ pressed }) => [
                styles.signInButton,
                pressed && !loading && styles.buttonPressed,
                loading && styles.disabledButton,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.signInButtonText}>Sign In</Text>

                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </>
              )}
            </Pressable>

            <View style={styles.securityCard}>
              <Ionicons name="shield-checkmark-outline" size={19} color={colors.secondary} />

              <Text style={styles.securityText}>
                Your MedTrack account protects access to your private medication information.
              </Text>
            </View>
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>New to MedTrack?</Text>

            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupText}>Create account</Text>
            </Pressable>
          </View>

          <Text style={styles.disclaimer}>
            MedTrack supports medication organisation and reminders. It does not replace
            professional medical advice.
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
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 25,
    paddingBottom: 35,
  },

  brandSection: {
    alignItems: 'center',
  },

  logoContainer: {
    width: 115,
    height: 115,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 300,
    height: 300,
  },

  welcomeTitle: {
    marginTop: 13,
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },

  welcomeSubtitle: {
    marginTop: 8,
    maxWidth: 310,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },

  formCard: {
    marginTop: 28,
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,

    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },

  label: {
    marginTop: 11,
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

  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingVertical: 3,
  },

  forgotText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  signInButton: {
    marginTop: 19,
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,

    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },

  signInButtonText: {
    color: colors.white,
    fontSize: 14,
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

  securityCard: {
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

  signupRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },

  signupPrompt: {
    color: colors.textSecondary,
    fontSize: 11,
  },

  signupText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  disclaimer: {
    marginTop: 26,
    paddingHorizontal: 20,
    color: colors.textLight,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
