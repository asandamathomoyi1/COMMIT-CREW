import React, { useCallback, useEffect, useState } from 'react';

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
import { getUserFast } from '../services/currentUser';
import { useAuth } from '../context/AuthContext';
import ScreenHeader from '../components/ScreenHeader';
import { colors } from '../theme/colors';

const MAX_NAME_LENGTH = 80;

export default function EditProfileScreen({ navigation }) {
  const { refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setErrorMessage('');

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const name = data?.full_name ?? user.user_metadata?.full_name ?? '';

      setFullName(name);
      setOriginalName(name);
      setEmail(data?.email ?? user.email ?? '');
    } catch (error) {
      console.error('Edit profile loading error:', error);

      setErrorMessage(error?.message ?? 'We could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const cleanName = fullName.trim().replace(/\s+/g, ' ');

  const hasChanges = cleanName !== originalName.trim();

  const handleSave = async () => {
    if (saving) {
      return;
    }

    if (cleanName.length < 2) {
      Alert.alert('Name required', 'Please enter your full name (at least 2 characters).');
      return;
    }

    try {
      setSaving(true);

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: cleanName })
        .eq('id', user.id)
        .select('id');

      if (updateError) {
        throw updateError;
      }

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(
          'Your profile record could not be found. Please log out and back in, then try again.'
        );
      }

      // Keep the sign-in account details in step with the profile row.
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: cleanName },
      });

      if (metadataError) {
        console.log('Auth metadata update error:', metadataError.message);
      }

      await refreshProfile();

      setOriginalName(cleanName);

      Alert.alert('Profile updated', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Profile update error:', error);

      Alert.alert('Unable to save', error?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials =
    cleanName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase() || 'M';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Edit Profile"
        subtitle="Update your account details"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />

                <Text style={styles.errorText}>{errorMessage}</Text>

                <Pressable onPress={loadProfile}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.label}>Full name</Text>

            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={19} color={colors.textSecondary} />

              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor={colors.textLight}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={MAX_NAME_LENGTH}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                style={styles.input}
              />
            </View>

            <Text style={styles.label}>Email address</Text>

            <View style={[styles.inputRow, styles.inputDisabled]}>
              <Ionicons name="mail-outline" size={19} color={colors.textSecondary} />

              <Text style={styles.readOnlyText} numberOfLines={1}>
                {email || 'No email available'}
              </Text>

              <Ionicons name="lock-closed-outline" size={16} color={colors.textLight} />
            </View>

            <Text style={styles.helper}>
              Your email is your sign-in and caregiver-invitation address, so it can't be changed
              here.
            </Text>

            <Pressable
              onPress={handleSave}
              disabled={saving || !hasChanges || Boolean(errorMessage && !originalName)}
              style={({ pressed }) => [
                styles.saveButton,
                (!hasChanges || saving) && styles.saveButtonDisabled,
                pressed && hasChanges && !saving && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={21} color={colors.white} />
              )}

              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 48 },

  avatarWrap: { alignItems: 'center', marginTop: 10, marginBottom: 22 },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: { color: colors.white, fontSize: 30, fontWeight: '900' },

  label: {
    marginTop: 8,
    marginBottom: 8,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  inputRow: {
    height: 54,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  inputDisabled: { backgroundColor: colors.surfaceSoft },

  input: { flex: 1, color: colors.text, fontSize: 15 },

  readOnlyText: { flex: 1, color: colors.textSecondary, fontSize: 15 },

  helper: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  saveButton: {
    marginTop: 28,
    height: 56,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  saveButtonDisabled: { opacity: 0.45 },

  saveText: { color: colors.white, fontSize: 15, fontWeight: '800' },

  pressed: { opacity: 0.8 },

  errorCard: {
    marginBottom: 14,
    padding: 13,
    borderRadius: 15,
    backgroundColor: '#FFF4F3',
    borderWidth: 1,
    borderColor: '#FFD7D3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorText: { flex: 1, marginHorizontal: 9, color: colors.textSecondary, fontSize: 12 },

  retryText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
});
