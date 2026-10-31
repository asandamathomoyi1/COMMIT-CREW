import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';
import { colors } from '../theme/colors';

export default function EmergencyScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);

  const [editingContact, setEditingContact] = useState(null);

  const [contactName, setContactName] = useState('');

  const [relationship, setRelationship] = useState('');

  const [phoneNumber, setPhoneNumber] = useState('');

  const [isPrimary, setIsPrimary] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const loadContacts = useCallback(async () => {
    try {
      setErrorMessage('');

      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        throw new Error('Your session has expired.');
      }

      const { data, error } = await supabase
        .from('emergency_contacts')
        .select(
          `
            id,
            user_id,
            contact_name,
            relationship,
            phone_number,
            is_primary,
            created_at
          `
        )
        .eq('user_id', user.id)
        .order('is_primary', {
          ascending: false,
        })
        .order('created_at', {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setContacts(data ?? []);
    } catch (error) {
      console.error('Emergency contacts error:', error);

      setErrorMessage(error?.message ?? 'Unable to load emergency contacts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const refreshContacts = async () => {
    setRefreshing(true);
    await loadContacts();
  };

  const resetForm = () => {
    setEditingContact(null);
    setContactName('');
    setRelationship('');
    setPhoneNumber('');
    setIsPrimary(false);
  };

  const openAddContact = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditContact = (contact) => {
    setEditingContact(contact);
    setContactName(contact.contact_name);
    setRelationship(contact.relationship ?? '');
    setPhoneNumber(contact.phone_number);
    setIsPrimary(contact.is_primary);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
    resetForm();
  };

  const validateForm = () => {
    if (!contactName.trim()) {
      Alert.alert('Contact name required', 'Please enter the name of your emergency contact.');

      return false;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Phone number required', 'Please enter a phone number.');

      return false;
    }

    const cleaned = phoneNumber.replace(/[\s()-]/g, '');

    if (!/^\+?[0-9]{7,15}$/.test(cleaned)) {
      Alert.alert('Check phone number', 'Please enter a valid phone number.');

      return false;
    }

    return true;
  };

  const saveContact = async () => {
    if (!validateForm()) {
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
        throw new Error('Your session has expired.');
      }

      const cleanedPhone = phoneNumber.trim().replace(/[\s()-]/g, '');

      if (isPrimary) {
        const { error: primaryError } = await supabase
          .from('emergency_contacts')
          .update({
            is_primary: false,
          })
          .eq('user_id', user.id);

        if (primaryError) {
          throw primaryError;
        }
      }

      if (editingContact) {
        const { error } = await supabase
          .from('emergency_contacts')
          .update({
            contact_name: contactName.trim(),

            relationship: relationship.trim() || null,

            phone_number: cleanedPhone,

            is_primary: isPrimary,
          })
          .eq('id', editingContact.id)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from('emergency_contacts').insert({
          user_id: user.id,

          contact_name: contactName.trim(),

          relationship: relationship.trim() || null,

          phone_number: cleanedPhone,

          is_primary: isPrimary,
        });

        if (error) {
          throw error;
        }
      }

      setModalVisible(false);
      resetForm();

      await loadContacts();
    } catch (error) {
      console.error('Save emergency contact error:', error);

      Alert.alert(
        'Unable to save contact',
        error?.message ?? 'Something went wrong while saving this contact.'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = (contact) => {
    Alert.alert(
      'Delete emergency contact?',
      `${contact.contact_name} will be removed from MedTrack.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              const { data: userData, error: userError } = await getUserFast();

              if (userError) {
                throw userError;
              }

              const user = userData.user;

              if (!user) {
                throw new Error('Your session has expired.');
              }

              const { error } = await supabase
                .from('emergency_contacts')
                .delete()
                .eq('id', contact.id)
                .eq('user_id', user.id);

              if (error) {
                throw error;
              }

              await loadContacts();
            } catch (error) {
              Alert.alert(
                'Unable to delete',
                error?.message ?? 'The contact could not be deleted.'
              );
            }
          },
        },
      ]
    );
  };

  const setPrimaryContact = async (contact) => {
    if (contact.is_primary) {
      return;
    }

    try {
      const { data: userData, error: userError } = await getUserFast();

      if (userError) {
        throw userError;
      }

      const user = userData.user;

      if (!user) {
        throw new Error('Your session has expired.');
      }

      const { error: resetError } = await supabase
        .from('emergency_contacts')
        .update({
          is_primary: false,
        })
        .eq('user_id', user.id);

      if (resetError) {
        throw resetError;
      }

      const { error } = await supabase
        .from('emergency_contacts')
        .update({
          is_primary: true,
        })
        .eq('id', contact.id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await loadContacts();
    } catch (error) {
      Alert.alert(
        'Unable to update contact',
        error?.message ?? 'Primary contact could not be updated.'
      );
    }
  };

  const callContact = async (contact) => {
    const number = contact.phone_number.replace(/[^0-9+]/g, '');

    const url = `tel:${number}`;

    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert('Calling unavailable', 'This device cannot start a phone call.');

        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert('Calling unavailable', 'MedTrack could not open the phone app.');
    }
  };

  const primaryContact = contacts.find((contact) => contact.is_primary) ?? null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="shield-checkmark-outline" size={31} color={colors.primary} />
          </View>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{
              marginTop: 18,
            }}
          />

          <Text style={styles.loadingText}>Loading emergency contacts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshContacts}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Emergency</Text>

            <Text style={styles.headerSubtitle}>Contacts & quick help</Text>
          </View>

          <Pressable
            onPress={openAddContact}
            style={({ pressed }) => [styles.addHeaderButton, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={23} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="shield-checkmark" size={28} color={colors.white} />
            </View>

            <View style={styles.heroTextContainer}>
              <Text style={styles.heroLabel}>MEDTRACK SAFETY</Text>

              <Text style={styles.heroTitle}>Emergency Support</Text>
            </View>
          </View>

          <Text style={styles.heroDescription}>
            Keep trusted contacts ready so you can reach someone quickly when you need help.
          </Text>

          {primaryContact ? (
            <Pressable
              onPress={() => callContact(primaryContact)}
              style={({ pressed }) => [styles.primaryCallButton, pressed && styles.pressed]}
            >
              <View style={styles.primaryCallIcon}>
                <Ionicons name="call" size={18} color={colors.primaryDark} />
              </View>

              <View style={styles.primaryCallContent}>
                <Text style={styles.primaryCallLabel}>CALL PRIMARY CONTACT</Text>

                <Text style={styles.primaryCallName} numberOfLines={1}>
                  {primaryContact.contact_name}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={19} color={colors.white} />
            </Pressable>
          ) : (
            <Pressable
              onPress={openAddContact}
              style={({ pressed }) => [styles.primaryCallButton, pressed && styles.pressed]}
            >
              <View style={styles.primaryCallIcon}>
                <Ionicons name="person-add-outline" size={19} color={colors.primaryDark} />
              </View>

              <View style={styles.primaryCallContent}>
                <Text style={styles.primaryCallLabel}>GET STARTED</Text>

                <Text style={styles.primaryCallName}>Add a trusted contact</Text>
              </View>

              <Ionicons name="chevron-forward" size={19} color={colors.white} />
            </Pressable>
          )}
        </View>

        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          </View>

          <Text style={styles.noticeText}>
            MedTrack stores your trusted contacts for quick access. It does not replace local
            emergency services or professional medical care.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Trusted Contacts</Text>

            <Text style={styles.sectionSubtitle}>
              {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} saved
            </Text>
          </View>

          <Pressable
            onPress={openAddContact}
            style={({ pressed }) => [styles.smallAddButton, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={17} color={colors.primary} />

            <Text style={styles.smallAddText}>Add</Text>
          </Pressable>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />

            <Text style={styles.errorText}>{errorMessage}</Text>

            <Pressable
              onPress={() => {
                setLoading(true);
                loadContacts();
              }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {contacts.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={31} color={colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>No emergency contacts</Text>

            <Text style={styles.emptyDescription}>
              Add someone you trust so their phone number is easy to reach from MedTrack.
            </Text>

            <Pressable
              onPress={openAddContact}
              style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.white} />

              <Text style={styles.emptyButtonText}>Add Emergency Contact</Text>
            </Pressable>
          </View>
        ) : (
          contacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactTop}>
                <View style={[styles.avatar, contact.is_primary && styles.primaryAvatar]}>
                  <Text style={[styles.avatarText, contact.is_primary && styles.primaryAvatarText]}>
                    {contact.contact_name.trim().charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.contactInfo}>
                  <View style={styles.contactNameRow}>
                    <Text style={styles.contactName} numberOfLines={1}>
                      {contact.contact_name}
                    </Text>

                    {contact.is_primary && (
                      <View style={styles.primaryBadge}>
                        <Ionicons name="star" size={9} color={colors.primary} />

                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.relationshipText}>
                    {contact.relationship || 'Trusted contact'}
                  </Text>

                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={13} color={colors.textSecondary} />

                    <Text style={styles.phoneText}>{contact.phone_number}</Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => openEditContact(contact)}
                  style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
                >
                  <Ionicons name="create-outline" size={19} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.contactActions}>
                <Pressable
                  onPress={() => callContact(contact)}
                  style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}
                >
                  <Ionicons name="call" size={16} color={colors.white} />

                  <Text style={styles.callButtonText}>Call</Text>
                </Pressable>

                {!contact.is_primary && (
                  <Pressable
                    onPress={() => setPrimaryContact(contact)}
                    style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                  >
                    <Ionicons name="star-outline" size={16} color={colors.primary} />

                    <Text style={styles.secondaryActionText}>Make Primary</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => deleteContact(contact)}
                  style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Ionicons name="heart-outline" size={20} color={colors.danger} />

            <Text style={styles.safetyTitle}>In an emergency</Text>
          </View>

          <Text style={styles.safetyText}>
            If you or someone else may be in immediate danger, contact the appropriate local
            emergency service rather than relying only on MedTrack or a saved contact.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />

          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingContact ? 'Edit Contact' : 'Add Contact'}
                </Text>

                <Text style={styles.modalSubtitle}>Trusted emergency contact</Text>
              </View>

              <Pressable
                onPress={closeModal}
                style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Contact Name</Text>

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} />

                <TextInput
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="e.g. Thabo Andani"
                  placeholderTextColor={colors.textLight}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.inputLabel}>Relationship</Text>

              <View style={styles.inputContainer}>
                <Ionicons name="people-outline" size={18} color={colors.textSecondary} />

                <TextInput
                  value={relationship}
                  onChangeText={setRelationship}
                  placeholder="e.g. Parent, Partner, Friend"
                  placeholderTextColor={colors.textLight}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>

              <Text style={styles.inputLabel}>Phone Number</Text>

              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={18} color={colors.textSecondary} />

                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="e.g. 0821234567"
                  placeholderTextColor={colors.textLight}
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.primarySwitchCard}>
                <View style={styles.primarySwitchIcon}>
                  <Ionicons name="star-outline" size={20} color={colors.primary} />
                </View>

                <View style={styles.primarySwitchContent}>
                  <Text style={styles.primarySwitchTitle}>Primary contact</Text>

                  <Text style={styles.primarySwitchDescription}>
                    Use this person as your main emergency contact.
                  </Text>
                </View>

                <Switch
                  value={isPrimary}
                  onValueChange={setIsPrimary}
                  trackColor={{
                    false: colors.border,
                    true: colors.primaryLight,
                  }}
                  thumbColor={isPrimary ? colors.primary : colors.textLight}
                />
              </View>

              <Pressable
                disabled={saving}
                onPress={saveContact}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                  saving && styles.disabledButton,
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name={editingContact ? 'checkmark-circle-outline' : 'person-add-outline'}
                      size={19}
                      color={colors.white}
                    />

                    <Text style={styles.saveButtonText}>
                      {editingContact ? 'Save Changes' : 'Add Emergency Contact'}
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 55,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },

  headerSubtitle: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },

  addHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    marginTop: 22,
    padding: 19,
    borderRadius: 25,
    backgroundColor: colors.primaryDark,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroTextContainer: {
    marginLeft: 13,
    flex: 1,
  },

  heroLabel: {
    color: '#8EB9EF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  heroTitle: {
    marginTop: 3,
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },

  heroDescription: {
    marginTop: 15,
    color: '#C9D9ED',
    fontSize: 13,
    lineHeight: 18,
  },

  primaryCallButton: {
    marginTop: 17,
    minHeight: 61,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.11)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  primaryCallIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryCallContent: {
    flex: 1,
    marginLeft: 11,
  },

  primaryCallLabel: {
    color: '#9BBCE4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  primaryCallName: {
    marginTop: 3,
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },

  noticeCard: {
    marginTop: 14,
    padding: 13,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  noticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noticeText: {
    flex: 1,
    marginLeft: 10,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  sectionHeader: {
    marginTop: 27,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  sectionSubtitle: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
  },

  smallAddButton: {
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  smallAddText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  contactCard: {
    marginBottom: 11,
    padding: 15,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  contactTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 49,
    height: 49,
    borderRadius: 17,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryAvatar: {
    backgroundColor: colors.primaryLight,
  },

  avatarText: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '900',
  },

  primaryAvatarText: {
    color: colors.primary,
  },

  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },

  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },

  contactName: {
    maxWidth: '65%',
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },

  primaryBadge: {
    paddingHorizontal: 7,
    height: 21,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  primaryBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },

  relationshipText: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
  },

  phoneRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  phoneText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  editButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contactActions: {
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  callButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  callButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },

  secondaryAction: {
    flex: 1,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  secondaryActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    padding: 26,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 14,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  emptyDescription: {
    marginTop: 6,
    maxWidth: 280,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
  },

  emptyButton: {
    marginTop: 18,
    height: 45,
    paddingHorizontal: 17,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  emptyButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },

  safetyCard: {
    marginTop: 25,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFDAD7',
    backgroundColor: '#FFF6F5',
  },

  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  safetyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  safetyText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  errorCard: {
    marginBottom: 12,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFD7D3',
    backgroundColor: '#FFF4F3',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorText: {
    flex: 1,
    marginHorizontal: 9,
    color: colors.textSecondary,
    fontSize: 12,
  },

  retryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(8, 20, 43, 0.52)',
  },

  modalSheet: {
    maxHeight: '86%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },

  modalHandle: {
    width: 43,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 21,
  },

  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  modalSubtitle: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 12,
  },

  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputLabel: {
    marginTop: 11,
    marginBottom: 7,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  inputContainer: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    marginLeft: 9,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 0,
  },

  primarySwitchCard: {
    marginTop: 19,
    padding: 13,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  primarySwitchIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primarySwitchContent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  primarySwitchTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  primarySwitchDescription: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },

  saveButton: {
    marginTop: 23,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  saveButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.65,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 13,
  },

  pressed: {
    opacity: 0.72,
  },
});
