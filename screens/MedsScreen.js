import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MEDICATIONS = [
  {
    id: '1',
    name: 'Metformin',
    dosage: '500mg',
    schedule: '08:00 · 20:00',
    frequency: 'Twice daily',
    color: '#4a90d9',
    icon: '💊',
    takenDoses: 5,
    totalDoses: 7,
  },
  {
    id: '2',
    name: 'Salbutamol',
    dosage: '100mcg',
    schedule: 'As needed',
    frequency: 'PRN inhaler',
    color: '#8e5fd9',
    icon: '💊',
    takenDoses: 2,
    totalDoses: 7,
  },
  {
    id: '3',
    name: 'Levetiracetam',
    dosage: '500mg',
    schedule: '19:00',
    frequency: 'Once daily',
    color: '#e0932c',
    icon: '💊',
    takenDoses: 7,
    totalDoses: 7,
  },
  {
    id: '4',
    name: 'Vitamin D3',
    dosage: '1000IU',
    schedule: '08:00',
    frequency: 'Once daily',
    color: '#2ea86b',
    icon: '💊',
    takenDoses: 6,
    totalDoses: 7,
  },
];

const TABS = [
  { key: 'Home', label: 'Home', icon: '🏠' },
  { key: 'Medications', label: 'Meds', icon: '💗' },
  { key: 'History', label: 'History', icon: '🗓️' },
  { key: 'Pharmacy', label: 'Pharmacy', icon: '📍' },
  { key: 'Profile', label: 'Profile', icon: '👤' },
];

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

            <Text
              style={[styles.tabLabel, isActive && styles.tabLabelActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const MedicationsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Medications');
  const [query, setQuery] = useState('');

  const totalMeds = MEDICATIONS.length;

  const overallPct = useMemo(() => {
    const taken = MEDICATIONS.reduce(
      (sum, m) => sum + m.takenDoses,
      0
    );

    const total = MEDICATIONS.reduce(
      (sum, m) => sum + m.totalDoses,
      0
    );

    return total === 0
      ? 0
      : Math.round((taken / total) * 100);
  }, []);

  const filteredMeds = useMemo(() => {
    if (!query.trim()) return MEDICATIONS;

    return MEDICATIONS.filter((m) =>
      m.name
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    );
  }, [query]);

  const handleTabPress = (tabKey) => {
    setActiveTab(tabKey);

    if (tabKey !== 'Medications') {
      navigation.navigate(tabKey);
    }
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'bottom']}
    >
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
              <Text style={styles.headerTitle}>
                Medications
              </Text>

              <Text style={styles.headerSubtitle}>
                {totalMeds} active medication
                {totalMeds !== 1 ? 's' : ''}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                navigation.navigate('AddMedication')
              }
            >
              <Text style={styles.addButtonIcon}>
                ➕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weekly adherence card */}
          <View style={styles.adherenceCard}>
            <View style={styles.adherenceRow}>
              <Text style={styles.adherenceLabel}>
                Weekly adherence
              </Text>

              <Text style={styles.adherencePct}>
                {overallPct}%
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${overallPct}%` },
                ]}
              />
            </View>

            <Text style={styles.adherenceSubtext}>
              Across all medications this week
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>
              🔍
            </Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Search medications"
              placeholderTextColor="#9aa5b1"
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>

        {/* Medication list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ALL MEDICATIONS
          </Text>

          {filteredMeds.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No medications found
              </Text>
            </View>
          ) : (
            filteredMeds.map((med) => {
              const pct = Math.round(
                (med.takenDoses / med.totalDoses) * 100
              );

              return (
                <TouchableOpacity
                  key={med.id}
                  style={styles.medCard}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate(
                      'MedicationDetail',
                      { id: med.id }
                    )
                  }
                >
                  <View style={styles.medCardTop}>
                    <View
                      style={[
                        styles.medIconWrap,
                        {
                          backgroundColor: med.color,
                        },
                      ]}
                    >
                      <Text style={styles.medIconText}>
                        {med.icon}
                      </Text>
                    </View>

                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>
                        {med.name}
                      </Text>

                      <Text style={styles.medMeta}>
                        {med.dosage} · {med.frequency}
                      </Text>

                      <Text style={styles.medSchedule}>
                        {med.schedule}
                      </Text>
                    </View>

                    <Text style={styles.medChevron}>
                      ›
                    </Text>
                  </View>

                  <View style={styles.medProgressRow}>
                    <View style={styles.medProgressTrack}>
                      <View
                        style={[
                          styles.medProgressFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: med.color,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.medProgressLabel}>
                      {med.takenDoses}/{med.totalDoses} this week
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <BottomTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />
    </SafeAreaView>
  );
};

export default MedicationsScreen;

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

  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },

  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonIcon: {
    fontSize: 16,
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

  searchWrap: {
    paddingHorizontal: 24,
    marginTop: 20,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a2a3a',
    padding: 0,
  },

  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7f8c8d',
    letterSpacing: 0.5,
    marginBottom: 14,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyStateText: {
    fontSize: 14,
    color: '#9aa5b1',
  },

  medCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  medCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  medIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  medIconText: {
    fontSize: 20,
  },

  medInfo: {
    flex: 1,
  },

  medName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2a3a',
  },

  medMeta: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },

  medSchedule: {
    fontSize: 12,
    color: '#9aa5b1',
    marginTop: 2,
  },

  medChevron: {
    fontSize: 22,
    color: '#c7cdd3',
    marginLeft: 6,
  },

  medProgressRow: {
    marginTop: 14,
  },

  medProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#eceff1',
    overflow: 'hidden',
    marginBottom: 6,
  },

  medProgressFill: {
    height: '100%',
    borderRadius: 3,
  },

  medProgressLabel: {
    fontSize: 12,
    color: '#9aa5b1',
    textAlign: 'right',
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