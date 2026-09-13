import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Background Image/Design */}
      <View style={styles.heroSection}>
        <View style={styles.heroBackground}>
          <View style={styles.gradientCircle1} />
          <View style={styles.gradientCircle2} />
        </View>
        
        <View style={styles.heroContent}>
          <Text style={styles.appName}>MedTrack</Text>
          <Text style={styles.tagline}>
            Your medication companion,{'\n'}
            always reliable, always offline-ready.
          </Text>
        </View>
      </View>

      {/* Features */}
      <View style={styles.featuresSection}>
        <View style={styles.featureRow}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.iconText}>🔔</Text>
            </View>
            <Text style={styles.featureText}>Smart Reminders</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.iconText}>📊</Text>
            </View>
            <Text style={styles.featureText}>Dose Tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Text style={styles.iconText}>🏥</Text>
            </View>
            <Text style={styles.featureText}>Nearby Pharmacies</Text>
          </View>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonSection}>
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>MEDTRACK · INTERACTIVE PREVIEW</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  heroSection: {
    height: height * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a2a3a',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  gradientCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4a90d9',
    opacity: 0.3,
    top: -100,
    right: -50,
  },
  gradientCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#2ecc71',
    opacity: 0.2,
    bottom: -50,
    left: -50,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 18,
    color: '#b0c4de',
    textAlign: 'center',
    lineHeight: 26,
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconText: {
    fontSize: 22,
  },
  featureText: {
    fontSize: 12,
    color: '#4a5568',
    fontWeight: '500',
  },
  buttonSection: {
    paddingHorizontal: 30,
    paddingTop: 10,
    flex: 1,
    justifyContent: 'flex-start',
  },
  getStartedButton: {
    backgroundColor: '#4a90d9',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#4a90d9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  getStartedText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  signInButton: {
    borderWidth: 2,
    borderColor: '#4a90d9',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signInText: {
    color: '#4a90d9',
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    color: '#a0aec0',
    fontSize: 12,
    marginTop: 20,
    letterSpacing: 2,
  },
});