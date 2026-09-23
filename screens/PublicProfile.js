import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
 
const PROFILE_URL = 'medtrack.app/p/alex-botha-uj';
 
const WEEK = [
  { day: 'Mon', taken: true },
  { day: 'Tue', taken: true },
  { day: 'Wed', taken: true },
  { day: 'Thu', taken: false },
  { day: 'Fri', taken: true },
  { day: 'Sat', taken: true },
  { day: 'Sun', taken: true },
];
 
const MEDICATIONS = [
  { name: 'Metformin', dose: '500mg · Twice daily' },
  { name: 'Salbutamol', dose: '100mcg · As needed' },
  { name: 'Levetiracetam', dose: '500mg · Twice daily' },
  { name: 'Vitamin D3', dose: '1000IU · Once daily' },
];
 
const HIDDEN_ITEMS = [
  'Emergency contact details',
  'PIN / biometric settings',
  'Dose timestamps',
  'Email address',
];
 
const PublicProfileScreen = ({ navigation }) => {
  const [copied, setCopied] = useState(false);
 
  const handleCopy = async () => {
    await Clipboard.setStringAsync(`https://${PROFILE_URL}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
 
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
 
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color="#4A6FA5" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Public profile</Text>
        <View style={styles.backButton} />
      </View>
 
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>AB</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Alex Botha</Text>
              <Text style={styles.userSubtitle}>Student · UJ · Johannesburg</Text>
              <View style={styles.badgeContainer}>
                <Ionicons name="globe-outline" size={12} color="#4A6FA5" />
                <Text style={styles.badgeText}>Public profile</Text>
              </View>
            </View>
          </View>
        </View>
 
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SHARE WITH YOUR DOCTOR</Text>
          <View style={styles.card}>
            <View style={styles.shareRow}>
              <Text style={styles.shareLink} numberOfLines={1}>
                {PROFILE_URL}
              </Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
                <Ionicons
                  name={copied ? 'checkmark-outline' : 'copy-outline'}
                  size={15}
                  color="#4A6FA5"
                />
                <Text style={styles.copyButtonText}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
 
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ADHERENCE SUMMARY (VISIBLE)</Text>
          <View style={styles.card}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>82%</Text>
                <Text style={styles.statLabel}>30-day avg</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>24/30</Text>
                <Text style={styles.statLabel}>Days on track</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>4</Text>
                <Text style={styles.statLabel}>Medications</Text>
              </View>
            </View>
 
            <View style={styles.weekRow}>
              {WEEK.map((d) => (
                <View key={d.day} style={styles.weekItem}>
                  <View
                    style={[
                      styles.weekDot,
                      d.taken ? styles.weekDotTaken : styles.weekDotMissed,
                    ]}
                  />
                  <Text style={styles.weekLabel}>{d.day}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
 
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVE MEDICATIONS (VISIBLE)</Text>
          <View style={styles.card}>
            {MEDICATIONS.map((med, i) => (
              <View
                key={med.name}
                style={[
                  styles.menuItem,
                  i === MEDICATIONS.length - 1 && styles.lastMenuItem,
                ]}
              >
                <Ionicons name="medkit-outline" size={20} color="#4A6FA5" />
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuText}>{med.name}</Text>
                  <Text style={styles.menuSubtitle}>{med.dose}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
 
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HIDDEN FROM PUBLIC</Text>
          <View style={styles.card}>
            {HIDDEN_ITEMS.map((item, i) => (
              <View
                key={item}
                style={[
                  styles.menuItem,
                  i === HIDDEN_ITEMS.length - 1 && styles.lastMenuItem,
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color="#C0C0C0" />
                <Text style={styles.hiddenText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
 
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};
 
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { paddingBottom: 20 },
 
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
 
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A6FA5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { fontSize: 24, fontWeight: '600', color: '#FFFFFF' },
  userInfo: { flex: 1 },
  userName: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  userSubtitle: { fontSize: 14, color: '#888888', marginTop: 2 },
  badgeContainer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, color: '#4A6FA5', fontWeight: '500' },
 
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
 
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  shareLink: { flex: 1, fontSize: 14, color: '#4A6FA5' },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  copyButtonText: { fontSize: 13, color: '#4A6FA5', fontWeight: '500' },
 
  statsRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#F0F0F0' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#4A6FA5' },
  statLabel: { fontSize: 12, color: '#888888', marginTop: 2, textAlign: 'center' },
 
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 14,
  },
  weekItem: { alignItems: 'center' },
  weekDot: { width: 24, height: 24, borderRadius: 12, marginBottom: 4 },
  weekDotTaken: { backgroundColor: '#4A6FA5' },
  weekDotMissed: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#D0D0D0' },
  weekLabel: { fontSize: 10, color: '#888888' },
 
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastMenuItem: { borderBottomWidth: 0 },
  menuTextContainer: { flex: 1, marginLeft: 12 },
  menuText: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  menuSubtitle: { fontSize: 13, color: '#888888', marginTop: 2 },
  hiddenText: { flex: 1, marginLeft: 12, fontSize: 14, color: '#C0C0C0' },
 
  bottomSpacer: { height: 40 },
});
 
export default PublicProfileScreen;