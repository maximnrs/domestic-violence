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
import { register } from '@/services/api';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+()\d\s.-]{7,}$/;
const LOGIN_ROUTE = '/login' as Href;

type RegisterErrors = {
  email?: string;
  firstName?: string;
  form?: string;
  lastName?: string;
  password?: string;
  phoneNumber?: string;
};

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const nextErrors: RegisterErrors = {};
    const normalizedEmail = email.trim();
    const normalizedPhoneNumber = phoneNumber.trim();

    if (!firstName.trim()) {
      nextErrors.firstName = 'First name is required.';
    }

    if (!lastName.trim()) {
      nextErrors.lastName = 'Last name is required.';
    }

    if (!normalizedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!emailPattern.test(normalizedEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.';
    }

    if (normalizedPhoneNumber && !phonePattern.test(normalizedPhoneNumber)) {
      nextErrors.phoneNumber = 'Enter a valid phone number.';
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
      await register({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
        phone_number: phoneNumber.trim() || null,
      });

      router.replace(LOGIN_ROUTE);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Unable to create account. Please try again.',
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
              <View style={styles.topRow}>
                <Pressable
                  accessibilityLabel="Back to login"
                  accessibilityRole="button"
                  onPress={() => router.replace(LOGIN_ROUTE)}
                  style={styles.backButton}>
                  <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
                </Pressable>
                <View style={styles.brandRow}>
                  <Ionicons name="moon-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.brandName}>nura</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>Create account</Text>
              <Text style={styles.heroSubtitle}>
                Keep your evidence private, encrypted, and close.
              </Text>
            </SafeAreaView>
          </View>

          <View style={styles.formCard}>
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <AuthInput
                  autoCapitalize="words"
                  autoComplete="given-name"
                  error={errors.firstName}
                  icon="person-outline"
                  label="First name"
                  onChangeText={setFirstName}
                  placeholder="Sarah"
                  textContentType="givenName"
                  value={firstName}
                />
              </View>
              <View style={styles.nameField}>
                <AuthInput
                  autoCapitalize="words"
                  autoComplete="family-name"
                  error={errors.lastName}
                  icon="person-outline"
                  label="Last name"
                  onChangeText={setLastName}
                  placeholder="Miller"
                  textContentType="familyName"
                  value={lastName}
                />
              </View>
            </View>

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
                autoComplete="new-password"
                error={errors.password}
                icon="lock-closed-outline"
                label="Password"
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                textContentType="newPassword"
                value={password}
              />
              <AuthInput
                autoComplete="tel"
                error={errors.phoneNumber}
                icon="call-outline"
                keyboardType="phone-pad"
                label="Phone number"
                onChangeText={setPhoneNumber}
                placeholder="+31 6 1234 5678"
                textContentType="telephoneNumber"
                value={phoneNumber}
              />
            </View>

            {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

            <Pressable
              accessibilityLabel="Register a new account"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={styles.primaryButton}
              testID="register-submit-button">
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Register</Text>
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already registered?</Text>
              <Pressable accessibilityRole="link" onPress={() => router.replace(LOGIN_ROUTE)}>
                <Text style={styles.switchLink}>Log in</Text>
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
    paddingBottom: 58,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandName: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    marginLeft: 7,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 34,
    lineHeight: 40,
    marginTop: 38,
  },
  heroSubtitle: {
    color: '#B8E1DB',
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 290,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 5,
    marginHorizontal: 20,
    marginTop: -36,
    padding: 20,
    shadowColor: '#143431',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
    minWidth: 0,
  },
  fields: {
    gap: 16,
    marginTop: 16,
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
