import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthInput } from '@/components/auth-input';
import { login } from '@/services/api';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTER_ROUTE = '/register' as Href;
const TABS_ROUTE = '/(tabs)' as Href;

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const nextErrors: LoginErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!emailPattern.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login({ email: email.trim(), password });
      router.replace(TABS_ROUTE);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Unable to log in. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <SafeAreaView edges={['top']} style={styles.heroSafeArea}>
              <View style={styles.brandRow}>
                <Ionicons name="moon-outline" size={24} color="#FFFFFF" />
                <Text style={styles.brandName}>nura</Text>
              </View>
              <Text style={styles.heroEyebrow}>Your safety. Your evidence.</Text>
              <Text style={styles.heroTitle}>Welcome back</Text>
              <Text style={styles.heroSubtitle}>Sign in to continue documenting securely.</Text>
            </SafeAreaView>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Log in</Text>
            <Text style={styles.formSubtitle}>Use your Nura account details.</Text>

            <View style={styles.fields}>
              <AuthInput
                autoComplete="email"
                error={errors.email}
                icon="mail-outline"
                keyboardType="email-address"
                label="Email"
                onChangeText={setEmail}
                placeholder="sarah@email.com"
                textContentType="emailAddress"
                value={email}
              />
              <AuthInput
                autoComplete="password"
                error={errors.password}
                icon="lock-closed-outline"
                label="Password"
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                textContentType="password"
                value={password}
              />
            </View>

            {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

            <Pressable
              accessibilityLabel="Submit login request"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={[
                styles.primaryButton,
                isSubmitting && styles.primaryButtonDisabled,
              ]}
              testID="login-submit-button">
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Login</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>New to Nura?</Text>
              <Pressable accessibilityRole="link" onPress={() => router.push(REGISTER_ROUTE)}>
                <Text style={styles.switchLink}>Create account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F7F5',
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: '#1F5857',
  },
  heroSafeArea: {
    paddingBottom: 74,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandName: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    marginLeft: 8,
  },
  heroEyebrow: {
    color: '#9FD0C8',
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: 38,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 36,
    lineHeight: 43,
    marginTop: 8,
  },
  heroSubtitle: {
    color: '#B8E1DB',
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 270,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 5,
    marginHorizontal: 20,
    marginTop: -42,
    padding: 22,
    shadowColor: '#143431',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  formTitle: {
    color: '#102120',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
  },
  formSubtitle: {
    color: '#71807E',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    marginTop: 4,
  },
  fields: {
    gap: 16,
    marginTop: 24,
  },
  formError: {
    color: '#C9666B',
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    marginTop: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1F5857',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    height: 56,
    justifyContent: 'center',
    marginTop: 22,
  },
  primaryButtonPressed: {
    backgroundColor: '#184746',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  switchText: {
    color: '#71807E',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  },
  switchLink: {
    color: '#1F5857',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    marginLeft: 6,
  },
});
