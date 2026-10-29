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
import { useAuth } from '../context/AuthContext';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme/colors';

const MIN_PASSWORD_LENGTH = 8;

function PasswordField({ label, value, onChangeText, placeholder, show, onToggleShow }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputRow}>
        <Ionicons name="lock-closed-outline" size={19} color={colors.textSecondary} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <Pressable onPress={onToggleShow} hitSlop={10}>
          <Ionicons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>
    </>
  );
}

export default function PrivacySecurityScreen({ navigation }) {
  const { user } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (saving) {
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Password too short', `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please type the same new password twice.');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw error;
      }

      setNewPassword('');
      setConfirmPassword('');

      Alert.alert('Password updated', 'Your password has been changed.');
    } catch (error) {
      console.error('Password update error:', error);

      Alert.alert('Unable to change password', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOutEverywhere = () => {
    Alert.alert(
      'Sign out of all devices',
      'You will be signed out of MedTrack on every phone where you are logged in, including this one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out Everywhere',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut({ scope: 'global' });

              if (error) {
                throw error;
              }
            } catch (error) {
              console.error('Global sign-out error:', error);

              Alert.alert('Unable to sign out', error?.message ?? 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const canSave = newPassword.length > 0 && confirmPassword.length > 0 && !saving;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Privacy & Security"
        subtitle="Protect your account and health data"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change password</Text>

            <Text style={styles.cardText}>
              Signed in as {user?.email ?? 'your account'}. Choose a password you don't use anywhere
              else.
            </Text>

            <PasswordField
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              show={showPasswords}
              onToggleShow={() => setShowPasswords((value) => !value)}
            />

            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Type it again"
              show={showPasswords}
              onToggleShow={() => setShowPasswords((value) => !value)}
            />

            <Pressable
              onPress={handleChangePassword}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.primaryButton,
                !canSave && styles.disabled,
                pressed && canSave && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.white} />
              )}

              <Text style={styles.primaryText}>{saving ? 'Updating...' : 'Update Password'}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sessions</Text>

            <Text style={styles.cardText}>
              Lost a phone or signed in on a shared device? Sign out everywhere to protect your
              medication information.
            </Text>

            <Pressable
              onPress={handleSignOutEverywhere}
              style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />

              <Text style={styles.dangerText}>Sign Out of All Devices</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>How your data is handled</Text>

            <View style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.bulletText}>
                Your medications, doses and emergency contacts are private to your account.
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.bulletText}>
                Caregivers only see what you choose to share, and you can remove them at any time
                from Caregiver & Family.
              </Text>
            </View>

            <View style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.bulletText}>
                Your location is used only while you search for pharmacies and is never stored.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 18, paddingBottom: 48 },

  card: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },

  cardText: { marginTop: 6, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },

  label: { marginTop: 14, marginBottom: 8, color: colors.text, fontSize: 13, fontWeight: '800' },

  inputRow: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  input: { flex: 1, color: colors.text, fontSize: 15 },

  primaryButton: {
    marginTop: 20,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  primaryText: { color: colors.white, fontSize: 15, fontWeight: '800' },

  dangerButton: {
    marginTop: 16,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F7C7C3',
    backgroundColor: '#FFF8F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  dangerText: { color: colors.danger, fontSize: 14, fontWeight: '800' },

  bulletRow: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },

  bulletText: { flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },

  disabled: { opacity: 0.45 },

  pressed: { opacity: 0.8 },
});
