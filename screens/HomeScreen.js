import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMedications } from '../context/MedicationsContext';

const TABS = [
  { key: 'Home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: 'Medications', label: 'Meds', icon: 'medkit-outline', iconActive: 'medkit' },
  { key: 'History', label: 'History', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { key: 'Pharmacy', label: 'Pharmacy', icon: 'location-outline', iconActive: 'location' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

// ---------------------------------------------------------------------------
// TEMPORARY MOCK DATA — replace with the same source PharmacyDealsScreen
// uses (DB fetch / shared context) so both screens stay in sync. Only the
// top promoted deal is shown here as a teaser.
// ---------------------------------------------------------------------------
const FEATURED_DEAL = {
  id: '1',
  pharmacyName: 'Clicks Pharmacy',
  discount: '10% off selected medication',
  distanceKm: 2.3,
  isPromoted: true,
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatTimeLabel(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getNextDoseLabel(med) {
  if (!med.times || med.times.length === 0) return 'As needed';
  const now = new Date();
  const todaysTimes = [...med.times]
    .map((t) => {
      const [h, m] = t.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return { raw: t, date: d };
    })
    .sort((a, b) => a.date - b.date);

  const upcoming = todaysTimes.find((entry) => entry.date > now);
  if (upcoming) return `Due ${formatTimeLabel(upcoming.raw)}`;
  return `Tomorrow ${formatTimeLabel(todaysTimes[0].raw)}`;
}

function BottomTabBar({ activeTab, onTabPress }) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={21}
              color={isActive ? '#4a90d9' : '#9aa5b1'}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function HomeScreen({ navigation, userName = 'Alex' }) {
  const { medications, toggleTaken } = useMedications();
  const [activeTab, setActiveTab] = useState('Home');

  const totalCount = medications.length;
  const takenCount = useMemo(
    () => medications.filter((m) => m.takenToday).length,
    [medications]
  );
  const adherencePct = totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100);

  const handleTabPress = (tabKey) => {
    setActiveTab(tabKey);
    if (tabKey !== 'Home') {
      navigation.navigate(tabKey);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={() => navigation.navigate('Emergency')}
            >
              <Ionicons name="alert-circle-outline" size={15} color="#ffffff" />
              <Text style={styles.emergencyText}>Emergency</Text>
            </TouchableOpacity>
          </View>

          {/* Adherence card */}
          <View style={styles.adherenceCard}>
            <View style={styles.adherenceRow}>
              <Text style={styles.adherenceLabel}>Today's adherence</Text>
              <Text style={styles.adherencePct}>{adherencePct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${adherencePct}%` }]} />
            </View>
            <Text style={styles.adherenceSubtext}>
              {totalCount === 0
                ? 'Add a medication to start tracking'
                : `${takenCount} of ${totalCount} medications taken today`}
            </Text>
          </View>
        </View>

        {/* Next doses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>NEXT DOSES</Text>
            {totalCount > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Medications')}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            )}
          </View>

          {totalCount === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medkit-outline" size={30} color="#c3cdd8" />
              <Text style={styles.emptyStateTitle}>No medications yet</Text>
              <Text style={styles.emptyStateText}>
                Add your first medication to see it here and get reminders.
              </Text>
              <TouchableOpacity
                style={styles.emptyStateBtn}
                onPress={() => navigation.navigate('AddMedication')}
              >
                <Text style={styles.emptyStateBtnText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          ) : (
            medications.map((med) => {
              const isTaken = !!med.takenToday;
              return (
                <View key={med.id} style={styles.doseCard}>
                  <View style={[styles.doseIconWrap, { backgroundColor: med.color }]}>
                    <Ionicons name={med.icon || 'medkit-outline'} size={20} color="#ffffff" />
                  </View>
                  <View style={styles.doseInfo}>
                    <Text style={styles.doseName}>{med.name}</Text>
                    <Text style={styles.doseMeta}>
                      {med.dosage} · {getNextDoseLabel(med)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.takeButton, isTaken && styles.takeButtonDone]}
                    onPress={() => toggleTaken(med.id)}
                  >
                    <Text style={[styles.takeButtonText, isTaken && styles.takeButtonTextDone]}>
                      {isTaken ? 'Taken' : 'Take'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Nearby Pharmacy Deals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>NEARBY DEALS</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Pharmacy')}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.dealCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Pharmacy')}
          >
            {FEATURED_DEAL.isPromoted && (
              <View style={styles.dealPromotedBadge}>
                <Text style={styles.dealPromotedBadgeText}>PROMOTED</Text>
              </View>
            )}
            <View style={styles.dealIconWrap}>
              <Text style={styles.dealIconText}>💊</Text>
            </View>
            <View style={styles.dealInfo}>
              <Text style={styles.dealPharmacyName}>{FEATURED_DEAL.pharmacyName}</Text>
              <Text style={styles.dealDiscount}>{FEATURED_DEAL.discount}</Text>
              <Text style={styles.dealDistance}>{FEATURED_DEAL.distanceKm} km away</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#c3cdd8" />
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('AddMedication')}
            >
              <Ionicons name="add-circle-outline" size={24} color="#4a90d9" />
              <Text style={styles.quickActionText}>Add Medication</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionCard, styles.quickActionCardAlt]}
              onPress={() => navigation.navigate('Pharmacy')}
            >
              <Ionicons name="location-outline" size={24} color="#8e5fd9" />
              <Text style={[styles.quickActionText, styles.quickActionTextAlt]}>
                Find Pharmacy
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  headerSection: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  emergencyText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  adherenceCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    padding: 20,
  },
  adherenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  adherenceLabel: {
    fontSize: 15,
    color: '#ffffff',
  },
  adherencePct: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  adherenceSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 10,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7f8c8d',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4a90d9',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#43505e',
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#8a94a3',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyStateBtn: {
    marginTop: 16,
    backgroundColor: '#4a90d9',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 20,
  },
  emptyStateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  doseIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  doseInfo: {
    flex: 1,
  },
  doseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2a3a',
  },
  doseMeta: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  takeButton: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  takeButtonDone: {
    backgroundColor: '#e8f5ee',
  },
  takeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  takeButtonTextDone: {
    color: '#2ea86b',
  },
  dealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  dealPromotedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4a90d9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dealPromotedBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dealIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dealIconText: {
    fontSize: 20,
  },
  dealInfo: {
    flex: 1,
  },
  dealPharmacyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2a3a',
  },
  dealDiscount: {
    fontSize: 13,
    color: '#2ecc71',
    fontWeight: '600',
    marginTop: 2,
  },
  dealDistance: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#eaf2fb',
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickActionCardAlt: {
    backgroundColor: '#f2eafb',
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a90d9',
  },
  quickActionTextAlt: {
    color: '#8e5fd9',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#eceff1',
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9aa5b1',
  },
  tabLabelActive: {
    color: '#4a90d9',
    fontWeight: '700',
  },
});