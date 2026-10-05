import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

// ─── Real data (this is what was breaking the build) ──────────────
const FEATURES = [
  { icon: 'bell-ring-outline', label: 'Smart\nReminders' },
  { icon: 'chart-timeline-variant', label: 'Dose\nTracking' },
  { icon: 'map-marker-radius-outline', label: 'Nearby\nPharmacies' },
];

export default function SplashScreen({ navigation }) {
  const { width, height } = useWindowDimensions();

  /* ── Animation values ─────────────────────────────────────────── */
  const bgPan     = useRef(new Animated.Value(0)).current;
  const orbPink   = useRef(new Animated.Value(0)).current;
  const orbCyan   = useRef(new Animated.Value(0)).current;
  const orbOrange = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(0)).current;
  const logoSpin  = useRef(new Animated.Value(0)).current;

  const heroFade  = useRef(new Animated.Value(0)).current;
  const heroRise  = useRef(new Animated.Value(30)).current;
  const cardFade  = useRef(new Animated.Value(0)).current;
  const cardRise  = useRef(new Animated.Value(30)).current;
  const btnFade   = useRef(new Animated.Value(0)).current;
  const btnRise   = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const pingPong = (val, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    pingPong(bgPan, 9000).start();
    pingPong(orbPink, 5200).start();
    pingPong(orbCyan, 6800).start();
    pingPong(orbOrange, 7400).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(logoSpin, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    const enter = (fade, rise, delay) =>
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 650,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 650,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

    Animated.sequence([
      enter(heroFade, heroRise, 150),
      enter(cardFade, cardRise, 350),
      enter(btnFade, btnRise, 550),
    ]).start();
  }, []);

  /* ── Interpolations ───────────────────────────────────────────── */
  const bgWidth = width * 1.6;
  const bgHeight = height * 1.6;
  const bgTranslateX = bgPan.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.35] });
  const bgTranslateY = bgPan.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.20] });

  const pinkX   = orbPink.interpolate({ inputRange: [0, 1], outputRange: [0, 60] });
  const pinkY   = orbPink.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const cyanX   = orbCyan.interpolate({ inputRange: [0, 1], outputRange: [0, -50] });
  const cyanY   = orbCyan.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
  const orangeX = orbOrange.interpolate({ inputRange: [0, 1], outputRange: [0, 45] });
  const orangeY = orbOrange.interpolate({ inputRange: [0, 1], outputRange: [0, -55] });

  const logoScale   = logoPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const logoRotate  = logoSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ringScale   = logoPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = logoPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.bgWrap,
          {
            width: bgWidth,
            height: bgHeight,
            marginLeft: -width * 0.3,
            marginTop: -height * 0.3,
            transform: [
              { translateX: bgTranslateX },
              { translateY: bgTranslateY },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#1B0A3D', '#4C1D95', '#A21CAF', '#F43F5E', '#FB923C']}
          locations={[0, 0.28, 0.55, 0.8, 1]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <LinearGradient
        colors={['rgba(56,189,248,0.42)', 'rgba(56,189,248,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.7 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Animated.View
        pointerEvents="none"
        style={[styles.glowPink, { transform: [{ translateX: pinkX }, { translateY: pinkY }] }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.glowCyan, { transform: [{ translateX: cyanX }, { translateY: cyanY }] }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.glowOrange, { transform: [{ translateX: orangeX }, { translateY: orangeY }] }]}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(15,3,35,0.55)']}
        start={{ x: 0.5, y: 0.35 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View
          style={[
            styles.hero,
            { opacity: heroFade, transform: [{ translateY: heroRise }] },
          ]}
        >
          <View style={styles.logoWrap}>
            <Animated.View
              style={[
                styles.logoRing,
                { opacity: ringOpacity, transform: [{ scale: ringScale }] },
              ]}
            />
            <Animated.View style={[styles.logoMark, { transform: [{ scale: logoScale }] }]}>
              <Animated.View style={[styles.logoHalo, { transform: [{ rotate: logoRotate }] }]} />
              <View style={styles.plusH} />
              <View style={styles.plusV} />
            </Animated.View>
          </View>

          <Text style={styles.appName}>MedTrack</Text>
          <Text style={styles.tagline}>
            Medication reminders, dose tracking and{'\n'}
            nearby pharmacies — even when you're offline.
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.glassCard,
            { opacity: cardFade, transform: [{ translateY: cardRise }] },
          ]}
        >
          {FEATURES.map((f, i) => (
            <React.Fragment key={f.label}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons name={f.icon} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </Animated.View>

        <Animated.View
          style={[
            styles.actions,
            { opacity: btnFade, transform: [{ translateY: btnRise }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.primaryButton}
            onPress={() => navigation.navigate('SignUp', { role: 'patient' })}
          >
            <Text style={styles.primaryText}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login', { role: 'patient' })}
          >
            <Text style={styles.secondaryText}>Sign in</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>MEDTRACK · INTERACTIVE PREVIEW</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1B0A3D', overflow: 'hidden' },
  safe: { flex: 1, paddingHorizontal: 24 },

  bgWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },

  glowPink: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#FF2E93',
    opacity: 0.30,
    top: -120,
    left: -100,
  },
  glowCyan: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#22D3EE',
    opacity: 0.24,
    top: 80,
    right: -110,
  },
  glowOrange: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FF7A45',
    opacity: 0.24,
    bottom: -140,
    left: -80,
  },

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 20 },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  logoRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoHalo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(94,234,212,0.18)',
    top: -28,
    left: -28,
  },
  plusH: { position: 'absolute', width: 34, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  plusV: { position: 'absolute', width: 8, height: 34, borderRadius: 4, backgroundColor: '#FFFFFF' },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 14,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingVertical: 20,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: 28,
  },
  featureItem: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.18)' },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  actions: { marginBottom: 12 },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryText: { color: '#3B0764', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  secondaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  footer: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 18,
  },
});