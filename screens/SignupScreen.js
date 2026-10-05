import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const C = {
  deep: '#1B0A3D',
  violet: '#4C1D95',
  magenta: '#A21CAF',
  rose: '#F43F5E',
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  ink: '#0B1220',
  inkSoft: '#475569',
  inkMuted: '#64748B',
  inkFaint: '#94A3B8',
  line: '#EDE9FE',
  surface: '#FFFFFF',
  bg: '#F8F7FC',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
};

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerRise = useRef(new Animated.Value(16)).current;
  const formFade = useRef(new Animated.Value(0)).current;
  const formRise = useRef(new Animated.Value(20)).current;
  const bloom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 500, delay: 40, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(headerRise, { toValue: 0, duration: 500, delay: 40, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(formFade, { toValue: 1, duration: 600, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(formRise, { toValue: 0, duration: 600, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bloom, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bloom, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const bloomX = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const bloomY = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });

  const validate = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = 'Full name is required.';
    else if (fullName.trim().length < 2) e.fullName = 'Name is too short.';

    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address.';

    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.';

    if (!confirmPassword) e.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) e.confirmPassword = "Passwords don't match.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // 🔌 TODO: Replace this block with real auth (Firebase, Supabase, etc.)
      // Example with Firebase:
      //   import { createUserWithEmailAndPassword } from 'firebase/auth';
      //   import { auth } from '../firebase/config';
      //   await createUserWithEmailAndPassword(auth, email.trim(), password);
      await new Promise((r) => setTimeout(r, 900));
      navigation.replace('Home');
    } catch (err) {
      setErrors({ form: err.message || 'Signup failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: headerFade, transform: [{ translateY: headerRise }] }}>
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
                  style={[styles.bloom, { transform: [{ translateX: bloomX }, { translateY: bloomY }] }]}
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
                  <Text style={styles.title}>Create account</Text>
                  <Text style={styles.subtitle}>Join MedTrack and take control of your medications.</Text>
                </SafeAreaView>
              </LinearGradient>
            </View>
          </Animated.View>

          <Animated.View style={[styles.formWrap, { opacity: formFade, transform: [{ translateY: formRise }] }]}>
            <View style={styles.formCard}>
              {errors.form ? (
                <View style={styles.formError}>
                  <Ionicons name="alert-circle" size={16} color={C.danger} />
                  <Text style={styles.formErrorText}>{errors.form}</Text>
                </View>
              ) : null}

              {/* Full name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full name</Text>
                <View style={[styles.inputWrap, errors.fullName && styles.inputWrapError]}>
                  <Ionicons name="person-outline" size={18} color={errors.fullName ? C.danger : C.inkFaint} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={C.inkFaint}
                    value={fullName}
                    onChangeText={(t) => { setFullName(t); clearError('fullName'); }}
                    autoCapitalize="words"
                  />
                </View>
                {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputWrap, errors.email && styles.inputWrapError]}>
                  <Ionicons name="mail-outline" size={18} color={errors.email ? C.danger : C.inkFaint} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={C.inkFaint}
                    value={email}
                    onChangeText={(t) => { setEmail(t); clearError('email'); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputWrap, errors.password && styles.inputWrapError]}>
                  <Ionicons name="lock-closed-outline" size={18} color={errors.password ? C.danger : C.inkFaint} />
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 characters"
                    placeholderTextColor={C.inkFaint}
                    value={password}
                    onChangeText={(t) => { setPassword(t); clearError('password'); }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={C.inkFaint} />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>

              {/* Confirm password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm password</Text>
                <View style={[styles.inputWrap, errors.confirmPassword && styles.inputWrapError]}>
                  <Ionicons name="lock-closed-outline" size={18} color={errors.confirmPassword ? C.danger : C.inkFaint} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor={C.inkFaint}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); clearError('confirmPassword'); }}
                    secureTextEntry={!showPassword}
                  />
                </View>
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
              </View>

              <TouchableOpacity
                style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.signupButtonText}>Create account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.termsText}>
                By continuing, you agree to MedTrack's Terms & Privacy Policy.
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.loginLink}>Sign in</Text>
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
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#22D3EE', opacity: 0.18, top: -80, right: -90,
  },
  headerSafe: { paddingHorizontal: 24, paddingTop: 8 },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 22,
  },
  title: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.6 },
  subtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.78)',
    marginTop: 8, lineHeight: 20, fontWeight: '500', paddingRight: 12,
  },

  formWrap: { paddingHorizontal: 20, marginTop: -22 },
  formCard: {
    backgroundColor: C.surface, borderRadius: 22, padding: 20,
    borderWidth: 1, borderColor: C.line,
    shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  formError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.dangerSoft, padding: 12, borderRadius: 12,
    marginBottom: 14,
  },
  formErrorText: { color: C.danger, fontSize: 13, fontWeight: '600', flex: 1 },

  inputContainer: { marginBottom: 16 },
  label: { fontSize: 12.5, fontWeight: '800', color: C.inkSoft, marginBottom: 7, letterSpacing: 0.2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: C.line, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: C.bg,
  },
  inputWrapError: { borderColor: C.danger, backgroundColor: C.dangerSoft },
  input: { flex: 1, fontSize: 14.5, color: C.ink, padding: 0, fontWeight: '500' },
  errorText: { color: C.danger, fontSize: 12, marginTop: 6, fontWeight: '600', marginLeft: 4 },

  signupButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, marginTop: 6,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32, shadowRadius: 14, elevation: 5,
  },
  signupButtonDisabled: { opacity: 0.75 },
  signupButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

  termsText: {
    fontSize: 11.5, color: C.inkFaint, textAlign: 'center',
    lineHeight: 16, marginTop: 16,
  },
  footer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingVertical: 24,
  },
  footerText: { fontSize: 14, color: C.inkMuted, fontWeight: '500' },
  loginLink: { fontSize: 14, color: C.primary, fontWeight: '800' },
});