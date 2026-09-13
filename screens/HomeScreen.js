import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MEDICATIONS = [
  {
    id: '1',
    name: 'Metformin',
    dosage: '500mg',
    due: '20:00',
    color: '#4a90d9',
    icon: '💊',
  },
  {
    id: '2',
    name: 'Salbutamol',
    dosage: '100mcg',
    due: 'As needed',
    color: '#8e5fd9',
    icon: '💊',
  },
  {
    id: '3',
    name: 'Levetiracetam',
    dosage: '500mg',
    due: '19:00',
    color: '#e0932c',
    icon: '💊',
  },
  {
    id: '4',
    name: 'Vitamin D3',
    dosage: '1000IU',
    due: 'Tomorrow 08:00',
    color: '#2ea86b',
    icon: '💊',
  },
];

const TABS = [
  { key: 'Home', label: 'Home', icon: '🏠' },
  { key: 'Medications', label: 'Meds', icon: '💗' },
  { key: 'History', label: 'History', icon: '🗓️' },
  { key: 'Pharmacy', label: 'Pharmacy', icon: '📍' },
  { key: 'Profile', label: 'Profile', icon: '👤' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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
            <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
              {tab.icon}
            </Text>
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
  const [takenMap, setTakenMap] = useState({});
  const [activeTab, setActiveTab] = useState('Home');

  const totalCount = MEDICATIONS.length;
  const takenCount = useMemo(
    () => Object.values(takenMap).filter(Boolean).length,
    [takenMap]
  );
  const adherencePct = totalCount === 0 ? 0 : Math.round((takenCount / totalCount) * 100);

  const handleTake = (id) => {
    setTakenMap((prev) => ({ ...prev, [id]: true }));
  };

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
              <Text style={styles.userName}>{userName} 👋</Text>
            </View>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={() => navigation.navigate('Emergency')}
            >
              <Text style={styles.emergencyIcon}>🆘</Text>
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
              <View
                style={[styles.progressFill, { width: `${adherencePct}%` }]}
              />
            </View>
            <Text style={styles.adherenceSubtext}>
              {takenCount} of {totalCount} medications taken today
            </Text>
          </View>
        </View>

        {/* Next doses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>NEXT DOSES</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Medications')}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          {MEDICATIONS.map((med) => {
            const isTaken = !!takenMap[med.id];
            return (
              <View key={med.id} style={styles.doseCard}>
                <View
                  style={[styles.doseIconWrap, { backgroundColor: med.color }]}
                >
                  <Text style={styles.doseIconText}>{med.icon}</Text>
                </View>
                <View style={styles.doseInfo}>
                  <Text style={styles.doseName}>{med.name}</Text>
                  <Text style={styles.doseMeta}>
                    {med.dosage} · Due {med.due}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.takeButton,
                    isTaken && styles.takeButtonDone,
                  ]}
                  onPress={() => handleTake(med.id)}
                  disabled={isTaken}
                >
                  <Text
                    style={[
                      styles.takeButtonText,
                      isTaken && styles.takeButtonTextDone,
                    ]}
                  >
                    {isTaken ? 'Taken' : 'Take'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('AddMedication')}
            >
              <Text style={styles.quickActionIcon}>➕</Text>
              <Text style={styles.quickActionText}>Add Medication</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionCard, styles.quickActionCardAlt]}
              onPress={() => navigation.navigate('Pharmacy')}
            >
              <Text style={styles.quickActionIcon}>📍</Text>
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
  emergencyIcon: {
    fontSize: 14,
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
  doseIconText: {
    fontSize: 20,
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
  },
  quickActionCardAlt: {
    backgroundColor: '#f2eafb',
  },
  quickActionIcon: {
    fontSize: 26,
    marginBottom: 8,
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
  tabIcon: {
    fontSize: 20,
    opacity: 0.45,
  },
  tabIconActive: {
    opacity: 1,
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