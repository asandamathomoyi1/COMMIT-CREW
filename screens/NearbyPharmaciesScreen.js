import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function NearbyPharmaciesScreen({ navigation }) {
  const handleFindPharmacies = () => {
    // TODO: request location permission, then navigate to results / open maps
    console.log('Find Nearby Pharmacies pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2F8FF3', '#1F6FE0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Nearby Pharmacies</Text>
        <Text style={styles.headerSubtitle}>
          Requires location access · Uses mobile data
        </Text>
      </LinearGradient>

      {/* Body */}
      <View style={styles.body}>
        {/* Info banner */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>📡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>
              This is the only feature that requires internet.
            </Text>
            <Text style={styles.infoText}>
              All medication reminders and your emergency card work fully
              offline.
            </Text>
          </View>
        </View>

        {/* Center content */}
        <View style={styles.centerContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="location-outline" size={40} color="#3B82F6" />
          </View>

          <Text style={styles.question}>Running low on medication?</Text>
          <Text style={styles.subtext}>
            Find open pharmacies and clinics near you right now.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleFindPharmacies}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>📍 Find Nearby Pharmacies</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#DCEBFD',
    marginTop: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF3FE',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#CFE3FC',
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F6FE0',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#6C9AD9',
    lineHeight: 17,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E6F0FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  question: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 30,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2F8FF3',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});