import React, { useEffect } from 'react';
import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <View style={styles.logoContainer}>
        <View style={styles.logoCard}>
          <Image
            source={require('../../assets/medtrack.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>MedTrack</Text>

        <Text style={styles.subtitle}>Smarter Medication. Better Living.</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.loading}>
          <View style={styles.loadingFill} />
        </View>

        <Text style={styles.footerText}>Your medication companion</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },

  logoContainer: {
    alignItems: 'center',
  },

  logoCard: {
    width: 145,
    height: 145,
    borderRadius: 38,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },

  logo: {
    width: 125,
    height: 125,
  },

  title: {
    marginTop: 26,
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#D8E8FF',
    letterSpacing: 0.4,
  },

  footer: {
    position: 'absolute',
    bottom: 55,
    alignItems: 'center',
  },

  loading: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    overflow: 'hidden',
  },

  loadingFill: {
    width: '65%',
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 10,
  },

  footerText: {
    marginTop: 13,
    fontSize: 12,
    color: '#AFCBF1',
  },
});
