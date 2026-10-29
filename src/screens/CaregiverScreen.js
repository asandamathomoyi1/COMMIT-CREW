import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { supabase } from '../services/supabase';
import { getUserFast } from '../services/currentUser';
import { colors } from '../theme/colors';

const DEFAULT_PERMISSIONS = {
  can_view_medications: false,
  can_view_adherence: true,
  can_view_missed_doses: true,
  receive_missed_dose_alerts: false,
};

export default function CaregiverScreen({ navigation }) {
  const [myCaregivers, setMyCaregivers] = useState([]);

  const [invitations, setInvitations] = useState([]);

  const [peopleICareFor, setPeopleICareFor] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);

  const [caregiverEmail, setCaregiverEmail] = useState('');

  const [relationshipName, setRelationshipName] = useState('Family Member');

  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  const [sendingInvite, setSendingInvite] = useState(false);

  const [editingRelationship, setEditingRelationship] = useState(null);

  const [editPermissions, setEditPermissions] = useState(DEFAULT_PERMISSIONS);

  const [savingPermissions, setSavingPermissions] = useState(false);

  const [respondingId, setRespondingId] = useState(null);

  const getCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await getUserFast();

    if (error) {
      throw error;
    }

    if (!user) {
      throw new Error('You must be signed in.');
    }

    return user;
  };

  const loadCaregiverData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const user = await getCurrentUser();

      const { error: claimError } = await supabase.rpc('claim_caregiver_invitations');

      if (claimError) {
        console.log('Claim caregiver invitations:', claimError.message);
      }

      const { data: ownerRows, error: ownerError } = await supabase
        .from('caregiver_relationships')
        .select('*')
        .eq('owner_user_id', user.id)
        .in('status', ['pending', 'accepted'])
        .order('created_at', {
          ascending: false,
        });

      if (ownerError) {
        throw ownerError;
      }

      const { data: caregiverRows, error: caregiverError } = await supabase
        .from('caregiver_relationships')
        .select('*')
        .eq('caregiver_user_id', user.id)
        .in('status', ['pending', 'accepted'])
        .order('created_at', {
          ascending: false,
        });

      if (caregiverError) {
        throw caregiverError;
      }

      const owned = ownerRows ?? [];

      const received = caregiverRows ?? [];

      setMyCaregivers(
        owned.filter((item) => item.status === 'pending' || item.status === 'accepted')
      );

      setInvitations(received.filter((item) => item.status === 'pending'));

      setPeopleICareFor(received.filter((item) => item.status === 'accepted'));
    } catch (error) {
      console.error('Caregiver load error:', error);

      Alert.alert(
        'Unable to load Caregiver & Family',
        error?.message || 'MedTrack could not load caregiver information.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCaregiverData();
    }, [loadCaregiverData])
  );

  const resetInviteForm = () => {
    setCaregiverEmail('');
    setRelationshipName('Family Member');

    setPermissions({
      ...DEFAULT_PERMISSIONS,
    });
  };

  const closeInviteModal = () => {
    if (sendingInvite) {
      return;
    }

    setShowInviteModal(false);
    resetInviteForm();
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const sendInvitation = async () => {
    const email = caregiverEmail.trim().toLowerCase();

    const relationship = relationshipName.trim() || 'Caregiver';

    if (!isValidEmail(email)) {
      Alert.alert('Check email', 'Enter a valid email address for the person you want to invite.');

      return;
    }

    try {
      setSendingInvite(true);

      const user = await getCurrentUser();

      if (user.email && email === user.email.trim().toLowerCase()) {
        Alert.alert(
          'Use another email',
          'You cannot invite your own MedTrack account as your caregiver.'
        );

        return;
      }

      const { error } = await supabase.from('caregiver_relationships').insert({
        owner_user_id: user.id,
        caregiver_email: email,
        relationship_name: relationship,

        can_view_medications: permissions.can_view_medications,

        can_view_adherence: permissions.can_view_adherence,

        can_view_missed_doses: permissions.can_view_missed_doses,

        receive_missed_dose_alerts: permissions.receive_missed_dose_alerts,

        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert(
            'Invitation already exists',
            'There is already an active invitation for this email address.'
          );

          return;
        }

        throw error;
      }

      /*
       * IMPORTANT FIX:
       * Do not call closeInviteModal() here because
       * sendingInvite is still true.
       */

      setShowInviteModal(false);
      resetInviteForm();

      await loadCaregiverData(true);

      Alert.alert(
        'Invitation created',
        `An invitation has been created for ${email}.\n\nWhen that person signs in to MedTrack using the same email address, the invitation will appear in Caregiver & Family.`
      );
    } catch (error) {
      console.error('Invite caregiver error:', error);

      Alert.alert('Unable to create invitation', error?.message || 'Please try again.');
    } finally {
      setSendingInvite(false);
    }
  };

  const respondToInvitation = async (relationship, accept) => {
    try {
      setRespondingId(relationship.id);

      const { error } = await supabase.rpc('respond_to_caregiver_invitation', {
        p_relationship_id: relationship.id,

        p_accept: accept,
      });

      if (error) {
        throw error;
      }

      await loadCaregiverData(true);

      Alert.alert(
        accept ? 'Invitation accepted' : 'Invitation declined',

        accept
          ? 'You are now connected as an approved caregiver.'
          : 'The caregiver invitation has been declined.'
      );
    } catch (error) {
      console.error('Respond invitation error:', error);

      Alert.alert('Unable to update invitation', error?.message || 'Please try again.');
    } finally {
      setRespondingId(null);
    }
  };

  const openPermissions = (relationship) => {
    setEditingRelationship(relationship);

    setEditPermissions({
      can_view_medications: relationship.can_view_medications,

      can_view_adherence: relationship.can_view_adherence,

      can_view_missed_doses: relationship.can_view_missed_doses,

      receive_missed_dose_alerts: relationship.receive_missed_dose_alerts,
    });
  };

  const savePermissionChanges = async () => {
    if (!editingRelationship) {
      return;
    }

    try {
      setSavingPermissions(true);

      const { error } = await supabase
        .from('caregiver_relationships')
        .update({
          can_view_medications: editPermissions.can_view_medications,

          can_view_adherence: editPermissions.can_view_adherence,

          can_view_missed_doses: editPermissions.can_view_missed_doses,

          receive_missed_dose_alerts: editPermissions.receive_missed_dose_alerts,
        })
        .eq('id', editingRelationship.id);

      if (error) {
        throw error;
      }

      setEditingRelationship(null);

      await loadCaregiverData(true);

      Alert.alert('Permissions updated', 'The caregiver permissions have been saved.');
    } catch (error) {
      Alert.alert('Unable to save permissions', error?.message || 'Please try again.');
    } finally {
      setSavingPermissions(false);
    }
  };

  const confirmRevoke = (relationship) => {
    Alert.alert(
      relationship.status === 'pending' ? 'Cancel invitation?' : 'Revoke caregiver access?',

      relationship.status === 'pending'
        ? `Cancel the invitation sent to ${relationship.caregiver_email}?`
        : `${relationship.caregiver_email} will no longer have caregiver access to your MedTrack information.`,

      [
        {
          text: 'Keep',
          style: 'cancel',
        },

        {
          text: relationship.status === 'pending' ? 'Cancel Invitation' : 'Revoke Access',

          style: 'destructive',

          onPress: () => revokeRelationship(relationship),
        },
      ]
    );
  };

  const revokeRelationship = async (relationship) => {
    try {
      const { error } = await supabase
        .from('caregiver_relationships')
        .update({
          status: 'revoked',

          receive_missed_dose_alerts: false,
        })
        .eq('id', relationship.id);

      if (error) {
        throw error;
      }

      await loadCaregiverData(true);
    } catch (error) {
      Alert.alert('Unable to revoke access', error?.message || 'Please try again.');
    }
  };

  const openSupportedPerson = (relationship) => {
    navigation.navigate('CaregiverPatient', {
      relationshipId: relationship.id,
    });
  };

  const statusDetails = (status) => {
    switch (status) {
      case 'accepted':
        return {
          text: 'Connected',
          icon: 'checkmark-circle',
          color: colors.success,
          background: '#EAFBF2',
        };

      case 'pending':
        return {
          text: 'Pending',
          icon: 'time',
          color: colors.warning,
          background: '#FFF7E8',
        };

      case 'declined':
        return {
          text: 'Declined',
          icon: 'close-circle',
          color: colors.danger,
          background: '#FFF0EE',
        };

      default:
        return {
          text: 'Revoked',
          icon: 'remove-circle',
          color: colors.textSecondary,
          background: colors.surfaceSoft,
        };
    }
  };

  const renderPermissionSummary = (relationship) => {
    const active = [];

    if (relationship.can_view_medications) {
      active.push('Medications');
    }

    if (relationship.can_view_adherence) {
      active.push('Adherence');
    }

    if (relationship.can_view_missed_doses) {
      active.push('Missed doses');
    }

    if (relationship.receive_missed_dose_alerts) {
      active.push('Alerts');
    }

    if (active.length === 0) {
      return 'No health-data permissions';
    }

    return active.join(' • ');
  };

  const PermissionRow = ({ icon, title, description, value, onValueChange, disabled = false }) => {
    return (
      <View style={[styles.permissionRow, disabled && styles.permissionDisabled]}>
        <View style={styles.permissionIcon}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>

        <View style={styles.permissionTextContainer}>
          <Text style={styles.permissionTitle}>{title}</Text>

          <Text style={styles.permissionDescription}>{description}</Text>
        </View>

        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{
            false: colors.border,
            true: colors.primaryLight,
          }}
          thumbColor={value ? colors.primary : colors.textLight}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="people-outline" size={34} color={colors.primary} />
          </View>

          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={styles.loadingText}>Loading Caregiver & Family...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCaregiverData(true)}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={23} color={colors.text} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Caregiver & Family</Text>

            <Text style={styles.headerSubtitle}>Share only what you choose</Text>
          </View>

          <Pressable
            onPress={() => setShowInviteModal(true)}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Ionicons name="person-add-outline" size={21} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="people" size={28} color={colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Your support circle</Text>

            <Text style={styles.heroText}>
              Give trusted people limited access to the information you choose. You can change or
              revoke access at any time.
            </Text>
          </View>
        </View>

        {invitations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Invitations</Text>

                <Text style={styles.sectionSubtitle}>
                  People asking you to become their caregiver
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>{invitations.length}</Text>
              </View>
            </View>

            {invitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationCard}>
                <View style={styles.invitationTop}>
                  <View style={styles.invitationIcon}>
                    <Ionicons name="mail-unread-outline" size={23} color={colors.primary} />
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text style={styles.invitationTitle}>Caregiver invitation</Text>

                    <Text style={styles.invitationText}>
                      You have been invited as a {invitation.relationship_name.toLowerCase()}.
                    </Text>
                  </View>
                </View>

                <View style={styles.invitationPermissions}>
                  <Text style={styles.invitationPermissionsLabel}>Requested access</Text>

                  <Text style={styles.invitationPermissionsText}>
                    {renderPermissionSummary(invitation)}
                  </Text>
                </View>

                <View style={styles.invitationButtons}>
                  <Pressable
                    disabled={respondingId === invitation.id}
                    onPress={() => respondToInvitation(invitation, false)}
                    style={({ pressed }) => [styles.declineButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </Pressable>

                  <Pressable
                    disabled={respondingId === invitation.id}
                    onPress={() => respondToInvitation(invitation, true)}
                    style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}
                  >
                    {respondingId === invitation.id ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color={colors.white} />

                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>My Caregivers</Text>

              <Text style={styles.sectionSubtitle}>People you have invited</Text>
            </View>

            <Pressable
              onPress={() => setShowInviteModal(true)}
              style={({ pressed }) => [styles.smallAddButton, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={18} color={colors.primary} />

              <Text style={styles.smallAddText}>Invite</Text>
            </Pressable>
          </View>

          {myCaregivers.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="person-add-outline" size={31} color={colors.primary} />
              </View>

              <Text style={styles.emptyTitle}>No caregivers yet</Text>

              <Text style={styles.emptyText}>
                Invite someone you trust to support your medication routine.
              </Text>

              <Pressable
                onPress={() => setShowInviteModal(true)}
                style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
              >
                <Ionicons name="person-add-outline" size={17} color={colors.white} />

                <Text style={styles.emptyButtonText}>Invite Caregiver</Text>
              </Pressable>
            </View>
          ) : (
            myCaregivers.map((item) => {
              const status = statusDetails(item.status);

              return (
                <View key={item.id} style={styles.personCard}>
                  <View style={styles.personTop}>
                    <View style={styles.personIcon}>
                      <Ionicons name="person-outline" size={22} color={colors.primary} />
                    </View>

                    <View style={styles.personDetails}>
                      <Text style={styles.relationshipName}>{item.relationship_name}</Text>

                      <Text style={styles.email} numberOfLines={1}>
                        {item.caregiver_email}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: status.background,
                        },
                      ]}
                    >
                      <Ionicons name={status.icon} size={13} color={status.color} />

                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: status.color,
                          },
                        ]}
                      >
                        {status.text}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.permissionSummary}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color={colors.textSecondary}
                    />

                    <Text style={styles.permissionSummaryText}>
                      {renderPermissionSummary(item)}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      onPress={() => openPermissions(item)}
                      style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="options-outline" size={17} color={colors.primary} />

                      <Text style={styles.manageButtonText}>Permissions</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => confirmRevoke(item)}
                      style={({ pressed }) => [styles.revokeButton, pressed && styles.pressed]}
                    >
                      <Ionicons
                        name={item.status === 'pending' ? 'close-outline' : 'person-remove-outline'}
                        size={17}
                        color={colors.danger}
                      />

                      <Text style={styles.revokeButtonText}>
                        {item.status === 'pending' ? 'Cancel' : 'Revoke'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {peopleICareFor.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>People I Support</Text>

                <Text style={styles.sectionSubtitle}>
                  Tap a person to view the information they shared
                </Text>
              </View>

              <View style={styles.supportCountBadge}>
                <Text style={styles.supportCountText}>{peopleICareFor.length}</Text>
              </View>
            </View>

            {peopleICareFor.map((relationship) => (
              <Pressable
                key={relationship.id}
                onPress={() => openSupportedPerson(relationship)}
                style={({ pressed }) => [styles.supportCard, pressed && styles.supportCardPressed]}
              >
                <View style={styles.supportIcon}>
                  <Ionicons name="heart-outline" size={22} color={colors.secondary} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.supportTitleRow}>
                    <Text style={styles.supportTitle}>MedTrack Member</Text>

                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  </View>

                  <Text style={styles.supportSubtitle}>{relationship.relationship_name}</Text>

                  <Text style={styles.supportPermission} numberOfLines={1}>
                    {renderPermissionSummary(relationship)}
                  </Text>
                </View>

                <View style={styles.supportArrow}>
                  <Ionicons name="chevron-forward" size={19} color={colors.primary} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}>
            <Ionicons name="lock-closed-outline" size={21} color={colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>Your account stays private</Text>

            <Text style={styles.privacyText}>
              Caregivers do not receive your password or unrestricted account access. MedTrack only
              shares information covered by permissions you approve.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeInviteModal}
      >
        <SafeAreaView style={styles.modalPage}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <Pressable
                disabled={sendingInvite}
                onPress={closeInviteModal}
                style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>

              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>Invite Caregiver</Text>

                <Text style={styles.modalSubtitle}>Choose exactly what they can access</Text>
              </View>

              <View style={{ width: 42 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inviteGraphic}>
                <View style={styles.inviteGraphicCircle}>
                  <Ionicons name="person-add-outline" size={34} color={colors.primary} />
                </View>

                <Text style={styles.inviteGraphicTitle}>Add someone you trust</Text>

                <Text style={styles.inviteGraphicText}>
                  They must use the same email address when signing in to MedTrack.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Caregiver email</Text>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={19} color={colors.textSecondary} />

                <TextInput
                  value={caregiverEmail}
                  onChangeText={setCaregiverEmail}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>

              <Text style={styles.inputLabel}>Relationship</Text>

              <View style={styles.inputContainer}>
                <Ionicons name="people-outline" size={19} color={colors.textSecondary} />

                <TextInput
                  value={relationshipName}
                  onChangeText={setRelationshipName}
                  placeholder="e.g. Mother, Brother, Partner"
                  placeholderTextColor={colors.textLight}
                  maxLength={50}
                  style={styles.input}
                />
              </View>

              <Text style={styles.permissionHeading}>Permissions</Text>

              <Text style={styles.permissionIntro}>These permissions can be changed later.</Text>

              <PermissionRow
                icon="medical-outline"
                title="View medications"
                description="See medication names, dosage and other shared medication information."
                value={permissions.can_view_medications}
                onValueChange={(value) =>
                  setPermissions((current) => ({
                    ...current,
                    can_view_medications: value,
                  }))
                }
              />

              <PermissionRow
                icon="analytics-outline"
                title="View adherence"
                description="See medication adherence progress and recent dose history."
                value={permissions.can_view_adherence}
                onValueChange={(value) =>
                  setPermissions((current) => ({
                    ...current,
                    can_view_adherence: value,
                  }))
                }
              />

              <PermissionRow
                icon="alert-circle-outline"
                title="View missed doses"
                description="See doses that MedTrack recorded as missed."
                value={permissions.can_view_missed_doses}
                onValueChange={(value) =>
                  setPermissions((current) => ({
                    ...current,

                    can_view_missed_doses: value,

                    receive_missed_dose_alerts: value ? current.receive_missed_dose_alerts : false,
                  }))
                }
              />

              <PermissionRow
                icon="notifications-outline"
                title="Missed-dose alerts"
                description="Allow caregiver alerts when MedTrack detects a missed dose."
                value={permissions.receive_missed_dose_alerts}
                disabled={!permissions.can_view_missed_doses}
                onValueChange={(value) =>
                  setPermissions((current) => ({
                    ...current,

                    receive_missed_dose_alerts: value,
                  }))
                }
              />

              <View style={styles.modalSafety}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />

                <Text style={styles.modalSafetyText}>
                  Creating an invitation does not immediately expose health data. The invited person
                  must first sign in and accept the invitation.
                </Text>
              </View>

              <Pressable
                onPress={sendInvitation}
                disabled={sendingInvite || !caregiverEmail.trim()}
                style={({ pressed }) => [
                  styles.primaryButton,

                  (sendingInvite || !caregiverEmail.trim()) && styles.disabled,

                  pressed && !sendingInvite && styles.pressed,
                ]}
              >
                {sendingInvite ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Ionicons name="send-outline" size={19} color={colors.white} />
                )}

                <Text style={styles.primaryButtonText}>
                  {sendingInvite ? 'Creating Invitation...' : 'Create Invitation'}
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={!!editingRelationship}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!savingPermissions) {
            setEditingRelationship(null);
          }
        }}
      >
        <SafeAreaView style={styles.modalPage}>
          <View style={styles.modalHeader}>
            <Pressable
              disabled={savingPermissions}
              onPress={() => setEditingRelationship(null)}
              style={({ pressed }) => [styles.modalClose, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>

            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Caregiver Permissions</Text>

              <Text style={styles.modalSubtitle}>Control what this person can access</Text>
            </View>

            <View style={{ width: 42 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {editingRelationship && (
              <View style={styles.editPersonCard}>
                <View style={styles.personIcon}>
                  <Ionicons name="person-outline" size={22} color={colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.relationshipName}>
                    {editingRelationship.relationship_name}
                  </Text>

                  <Text style={styles.email}>{editingRelationship.caregiver_email}</Text>
                </View>
              </View>
            )}

            <PermissionRow
              icon="medical-outline"
              title="View medications"
              description="Medication names, dosage and other shared medication information."
              value={editPermissions.can_view_medications}
              onValueChange={(value) =>
                setEditPermissions((current) => ({
                  ...current,

                  can_view_medications: value,
                }))
              }
            />

            <PermissionRow
              icon="analytics-outline"
              title="View adherence"
              description="Medication adherence progress and recent dose history."
              value={editPermissions.can_view_adherence}
              onValueChange={(value) =>
                setEditPermissions((current) => ({
                  ...current,

                  can_view_adherence: value,
                }))
              }
            />

            <PermissionRow
              icon="alert-circle-outline"
              title="View missed doses"
              description="Doses recorded as missed."
              value={editPermissions.can_view_missed_doses}
              onValueChange={(value) =>
                setEditPermissions((current) => ({
                  ...current,

                  can_view_missed_doses: value,

                  receive_missed_dose_alerts: value ? current.receive_missed_dose_alerts : false,
                }))
              }
            />

            <PermissionRow
              icon="notifications-outline"
              title="Missed-dose alerts"
              description="Allow alerts about missed doses."
              value={editPermissions.receive_missed_dose_alerts}
              disabled={!editPermissions.can_view_missed_doses}
              onValueChange={(value) =>
                setEditPermissions((current) => ({
                  ...current,

                  receive_missed_dose_alerts: value,
                }))
              }
            />

            <View style={styles.modalSafety}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />

              <Text style={styles.modalSafetyText}>
                Turning a permission off removes that category from the caregiver's health dashboard
                the next time it refreshes.
              </Text>
            </View>

            <Pressable
              onPress={savePermissionChanges}
              disabled={savingPermissions}
              style={({ pressed }) => [
                styles.primaryButton,

                savingPermissions && styles.disabled,

                pressed && !savingPermissions && styles.pressed,
              ]}
            >
              {savingPermissions ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
              )}

              <Text style={styles.primaryButtonText}>
                {savingPermissions ? 'Saving...' : 'Save Permissions'}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 17,
    paddingBottom: 50,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    padding: 17,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    marginBottom: 24,
  },

  heroIcon: {
    width: 53,
    height: 53,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  heroText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  section: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
    gap: 10,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  countBadge: {
    minWidth: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },

  supportCountBadge: {
    minWidth: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  supportCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
  },

  smallAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },

  smallAddText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },

  personCard: {
    padding: 15,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },

  personTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  personIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  personDetails: {
    flex: 1,
  },

  relationshipName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },

  email: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textSecondary,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },

  permissionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 13,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
  },

  permissionSummaryText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },

  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  manageButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  manageButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },

  revokeButton: {
    minWidth: 95,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: '#FFF0EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  revokeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.danger,
  },

  invitationCard: {
    padding: 17,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },

  invitationTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  invitationIcon: {
    width: 47,
    height: 47,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  invitationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },

  invitationText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  invitationPermissions: {
    marginTop: 13,
    padding: 11,
    borderRadius: 13,
    backgroundColor: colors.surfaceSoft,
  },

  invitationPermissionsLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },

  invitationPermissionsText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text,
  },

  invitationButtons: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },

  declineButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  declineButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },

  acceptButton: {
    flex: 1.4,
    minHeight: 45,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  acceptButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },

  supportCard: {
    padding: 14,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  supportCardPressed: {
    opacity: 0.72,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  supportIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  supportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  supportTitle: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },

  supportSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },

  supportPermission: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textLight,
  },

  supportArrow: {
    width: 34,
    height: 34,
    marginLeft: 8,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#EAFBF2',
  },

  activeBadgeText: {
    fontSize: 6,
    fontWeight: '900',
    color: colors.success,
  },

  emptyCard: {
    padding: 25,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 65,
    height: 65,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 13,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },

  emptyText: {
    marginTop: 5,
    maxWidth: 270,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  emptyButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },

  privacyCard: {
    padding: 15,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 10,
  },

  privacyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  privacyTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },

  privacyText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    width: 68,
    height: 68,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },

  modalPage: {
    flex: 1,
    backgroundColor: colors.background,
  },

  modalHeader: {
    minHeight: 70,
    paddingHorizontal: 17,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalClose: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalHeaderText: {
    flex: 1,
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  modalSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },

  modalContent: {
    padding: 18,
    paddingBottom: 45,
  },

  inviteGraphic: {
    alignItems: 'center',
    marginBottom: 25,
  },

  inviteGraphicCircle: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inviteGraphicTitle: {
    marginTop: 13,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },

  inviteGraphicText: {
    marginTop: 5,
    maxWidth: 290,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },

  inputLabel: {
    marginTop: 13,
    marginBottom: 7,
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },

  inputContainer: {
    minHeight: 53,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    color: colors.text,
  },

  permissionHeading: {
    marginTop: 25,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  permissionIntro: {
    marginTop: 3,
    marginBottom: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },

  permissionRow: {
    minHeight: 78,
    marginBottom: 9,
    padding: 12,
    borderRadius: 17,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  permissionDisabled: {
    opacity: 0.5,
  },

  permissionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  permissionTextContainer: {
    flex: 1,
    paddingRight: 8,
  },

  permissionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },

  permissionDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  modalSafety: {
    marginTop: 12,
    padding: 14,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    gap: 9,
  },

  modalSafetyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },

  primaryButton: {
    minHeight: 55,
    marginTop: 18,
    borderRadius: 17,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  primaryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },

  disabled: {
    opacity: 0.45,
  },

  editPersonCard: {
    padding: 14,
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  pressed: {
    opacity: 0.65,
  },
});
