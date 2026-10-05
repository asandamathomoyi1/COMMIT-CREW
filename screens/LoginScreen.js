import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const C = {
  deep: '#1B0A3D',
  violet: '#4C1D95',
  magenta: '#A21CAF',
  rose: '#F43F5E',
  coral: '#FB923C',

  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  primarySoft: '#F3E8FF',
  magentaSoft: '#FAE8FF',
  magenta: '#A21CAF',
  mint: '#5EEAD4',

  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',

  ink: '#0B1220',
  inkSoft: '#475569',
  inkMuted: '#64748B',
  inkFaint: '#94A3B8',
  line: '#EDE9FE',
  surface: '#FFFFFF',
  bg: '#F8F7FC',
};

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerRise = useRef(new Animated.Value(16)).current;
  const formFade = useRef(new Animated.Value(0)).current;
  const formRise = useRef(new Animated.Value(20)).current;
  const bloom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1, duration: 500, delay: 40,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(headerRise, {
        toValue: 0, duration: 500, delay: 40,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(formFade, {
        toValue: 1, duration: 600, delay: 200,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(formRise, {
        toValue: 0, duration: 600, delay: 200,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bloom, {
          toValue: 1, duration: 7000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(bloom, {
          toValue: 0, duration: 7000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const bloomX = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const bloomY = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation.replace('Home');
    }, 900);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{ opacity: headerFade, transform: [{ translateY: headerRise }] }}
          >
            <View style={styles.headerWrap}>
              <LinearGradient
                colors={[C.deep, C.violet, C.magenta, C.rose]}
                locations={[0, 0.35, 0.7, 1]}
                start={{ x: 0.05, y: 0 }}
                end={{ x: 0.95, y: 1 }}
                style={styles.headerGradient}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.bloom,
                    { transform: [{ translateX: bloomX }, { translateY: bloomY }] },
                  ]}
                />

                <SafeAreaView edges={['top']} style={styles.headerSafe}>
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                    accessibilityLabel="Go back"
                  >
                    <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                  </TouchableOpacity>

                  <Text style={styles.title}>Welcome back</Text>
                  <Text style={styles.subtitle}>
                    Sign in to pick up where you left off.
                  </Text>
                </SafeAreaView>
              </LinearGradient>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.formWrap,
              { opacity: formFade, transform: [{ translateY: formRise }] },
            ]}
          >
            <View style={styles.formCard}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={C.inkFaint} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={C.inkFaint}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={C.inkFaint} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={C.inkFaint}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={C.inkFaint}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => navigation.navigate('ForgotPassword')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign in</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },

  headerWrap: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#1B0A3D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
  headerGradient: {
    paddingBottom: 36,
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  bloom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#22D3EE',
    opacity: 0.18,
    top: -80,
    right: -90,
  },
  headerSafe: { paddingHorizontal: 24, paddingTop: 8 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '500',
    paddingRight: 12,
  },

  formWrap: {
    paddingHorizontal: 20,
    marginTop: -22,
  },
  formCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  inputContainer: { marginBottom: 16 },
  label: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.inkSoft,
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: C.bg,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: C.ink,
    padding: 0,
    fontWeight: '500',
  },

  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '700',
  },

  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 5,
  },
  loginButtonDisabled: { opacity: 0.75 },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  footerText: { fontSize: 14, color: C.inkMuted, fontWeight: '500' },
  signupLink: { fontSize: 14, color: C.primary, fontWeight: '800' },
});