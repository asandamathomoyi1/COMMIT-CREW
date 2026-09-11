import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const App = () => {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [cloudBackupEnabled, setCloudBackupEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>AB</Text>
              </View>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Alex Botha</Text>
              <Text style={styles.userEmail}>alex.botha@students.uj.ac.za</Text>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>Student · UJ</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="pencil-outline" size={20} color="#4A6FA5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Public Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Public Profile</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="share-social-outline" size={22} color="#4A6FA5" />
              <Text style={styles.menuText}>Share adherence data with your doctor</Text>
              <Ionicons name="chevron-forward-outline" size={20} color="#C0C0C0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Health & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HEALTH & SECURITY</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="medical-outline" size={22} color="#4A6FA5" />
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Emergency Info Card</Text>
                <Text style={styles.menuSubtitle}>Edit lock-screen emergency data</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#C0C0C0" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="key-outline" size={22} color="#4A6FA5" />
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Change PIN</Text>
                <Text style={styles.menuSubtitle}>Update your 6-digit app lock</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#C0C0C0" />
            </TouchableOpacity>
            
            <View style={styles.menuItem}>
              <Ionicons name="finger-print-outline" size={22} color="#4A6FA5" />
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Biometric Unlock</Text>
                <Text style={styles.menuSubtitle}>Face ID / Fingerprint enabled</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: '#D0D0D0', true: '#4A6FA5' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D0D0D0"
              />
            </View>
          </View>
        </View>

        {/* Data & Sync Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA & SYNC</Text>
          <View style={styles.card}>
            <View style={styles.menuItem}>
              <Ionicons name="cloud-outline" size={22} color="#4A6FA5" />
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Cloud Backup</Text>
                <Text style={styles.menuSubtitle}>Sync to Firebase when online</Text>
              </View>
              <Switch
                value={cloudBackupEnabled}
                onValueChange={setCloudBackupEnabled}
                trackColor={{ false: '#D0D0D0', true: '#4A6FA5' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D0D0D0"
              />
            </View>
            
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="download-outline" size={22} color="#4A6FA5" />
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Export my data</Text>
                <Text style={styles.menuSubtitle}>Download health data as CSV</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#C0C0C0" />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.menuItem, styles.lastMenuItem]}>
              <Ionicons name="trash-outline" size={22} color="#E74C3C" />
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuText, styles.dangerText]}>Delete all data</Text>
                <Text style={[styles.menuSubtitle, styles.dangerText]}>Permanently erase all local data</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#C0C0C0" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Header Styles
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A6FA5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  userEmail: {
    fontSize: 14,
    color: '#888888',
    marginTop: 2,
  },
  badgeContainer: {
    marginTop: 4,
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    color: '#4A6FA5',
    fontWeight: '500',
  },
  editButton: {
    padding: 8,
  },

  // Section Styles
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  
  // Card Styles
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
  
  // Menu Item Styles
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  dangerText: {
    color: '#E74C3C',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default App;