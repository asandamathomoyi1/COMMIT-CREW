import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMedications } from '../context/MedicationsContext';
import { useEmergencyInfo } from './Emergencyinfocontext';

function InfoBlock({ label, children, icon, iconColor }) {
  return (
    <View style={styles.infoBlock}>
      <View style={styles.infoLabelRow}>
        {icon && <Ionicons name={icon} size={13} color={iconColor || 'rgba(255,255,255,0.75)'} />}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

export default function EmergencyScreen({ navigation }) {
  const { medications } = useMedications();
  const { emergencyInfo } = useEmergencyInfo();
  const { name, dob, bloodType, conditions, allergies, contactName, contactPhone } = emergencyInfo;

  function handleCallContact() {
    const dialable = contactPhone.replace(/\s+/g, '');
    Linking.openURL(`tel:${dialable}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color="#4a90d9" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarLabel}>EMERGENCY INFO</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#e0453a', '#8f1f1f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.card}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.sosBadge}>
              <Text style={styles.sosBadgeText}>SOS</Text>
            </View>
            <View>
              <Text style={styles.cardTitle}>MedTrack — Emergency</Text>
              <Text style={styles.cardSubtitle}>Accessible without PIN</Text>
            </View>
          </View>

          <InfoBlock label="PATIENT">
            <Text style={styles.primaryValue}>{name}</Text>
            <Text style={styles.secondaryValue}>
              DOB: {dob} · Blood type: {bloodType}
            </Text>
          </InfoBlock>

          <InfoBlock label="CONDITIONS">
            <Text style={styles.primaryValue}>
              {conditions.length > 0 ? conditions.join(', ') : 'None on record'}
            </Text>
          </InfoBlock>

          <InfoBlock label="ALLERGIES" icon="warning" iconColor="#ffd166">
            <Text style={styles.primaryValue}>
              {allergies.length > 0 ? allergies.join(' · ').toUpperCase() : 'NONE ON RECORD'}
            </Text>
          </InfoBlock>

          <InfoBlock label="CURRENT MEDICATIONS">
            {medications.length === 0 ? (
              <Text style={styles.secondaryValue}>No medications on record</Text>
            ) : (
              medications.map((med) => (
                <Text key={med.id} style={styles.medicationLine}>
                  •  {med.name} {med.dosage}
                  {med.condition ? ` — ${med.condition}` : ''}
                </Text>
              ))
            )}
          </InfoBlock>

          <TouchableOpacity
            style={styles.contactBlock}
            onPress={handleCallContact}
            activeOpacity={0.85}
          >
            <View style={styles.infoLabelRow}>
              <Ionicons name="call-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.infoLabel}>EMERGENCY CONTACT</Text>
            </View>
            <Text style={styles.primaryValue}>
              {contactName} — {contactPhone}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.footerText}>
          This card is also accessible from the lock screen.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditEmergencyInfo')}>
          <Text style={styles.footerLink}>Edit in Profile → Emergency Info Card</Text>
        </TouchableOpacity>

        <Text style={styles.footerCaption}>MEDTRACK · INTERACTIVE PREVIEW</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12141c',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    color: '#4a90d9',
    fontSize: 15,
    fontWeight: '600',
  },
  topBarLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  card: {
    borderRadius: 26,
    padding: 22,
    marginTop: 6,
    shadowColor: '#8f1f1f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  sosBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBadgeText: {
    color: '#c0392b',
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12.5,
    marginTop: 2,
  },
  infoBlock: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primaryValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryValue: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
  },
  medicationLine: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  contactBlock: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 0,
  },
  footerText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 22,
  },
  footerLink: {
    color: '#4a90d9',
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  footerCaption: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginTop: 22,
  },
});