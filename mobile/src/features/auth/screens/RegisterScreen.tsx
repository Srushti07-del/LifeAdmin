/**
 * LifeAdmin Mobile Registration Screen
 * Native-feeling Android user registration with validation, password confirmation,
 * visibility toggles, and Ocean Teal styling.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

interface RegisterScreenProps {
  onNavigateToLogin?: () => void;
  onNavigateToForgotPassword?: () => void;
}

export function RegisterScreen({ onNavigateToLogin, onNavigateToForgotPassword }: RegisterScreenProps) {
  const { colors, isDark } = useAppTheme();
  const { register, loginAsGuest, isAuthenticating, error, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeError = localError || error;
  const isPasswordLengthValid = password.length >= 8;

  const handleRegister = async () => {
    setLocalError(null);
    clearError();

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setLocalError('Please enter your full name.');
      return;
    }

    if (!cleanEmail) {
      setLocalError('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!isPasswordLengthValid) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      await register(cleanName, cleanEmail, password);
    } catch {
      // Error handled by AuthContext
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.brandLogo,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
            >
              <ThemedText style={styles.brandLetter}>L</ThemedText>
            </View>

            <ThemedText style={[styles.title, { color: colors.text }]}>
              Create account
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Join LifeAdmin to manage your life with calm productivity.
            </ThemedText>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Error Banner */}
            {activeError && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                    borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                  },
                ]}
              >
                <SymbolView
                  name={{ ios: 'exclamationmark.triangle.fill', android: 'error', web: 'error' } as any}
                  size={16}
                  tintColor={colors.notification}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      styles.errorText,
                      { color: isDark ? '#FCA5A5' : '#B91C1C' },
                    ]}
                  >
                    {activeError}
                  </ThemedText>
                  {activeError.toLowerCase().includes('already exists') && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one }}>
                      {onNavigateToLogin && (
                        <Pressable onPress={onNavigateToLogin} hitSlop={8}>
                          <ThemedText
                            style={{
                              fontSize: Typography.fontSize.xs,
                              fontWeight: '600',
                              color: isDark ? '#93C5FD' : '#1D4ED8',
                              textDecorationLine: 'underline',
                            }}
                          >
                            Sign In &rarr;
                          </ThemedText>
                        </Pressable>
                      )}
                      {onNavigateToForgotPassword && (
                        <>
                          <ThemedText style={{ color: colors.textMuted, fontSize: Typography.fontSize.xs }}>·</ThemedText>
                          <Pressable onPress={onNavigateToForgotPassword} hitSlop={8}>
                            <ThemedText
                              style={{
                                fontSize: Typography.fontSize.xs,
                                fontWeight: '600',
                                color: isDark ? '#93C5FD' : '#1D4ED8',
                                textDecorationLine: 'underline',
                              }}
                            >
                              Forgot Password?
                            </ThemedText>
                          </Pressable>
                        </>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Name Field */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                Full name
              </ThemedText>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <SymbolView
                  name={{ ios: 'person.fill', android: 'person', web: 'person' } as any}
                  size={18}
                  tintColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. Alex Sharma"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (localError) setLocalError(null);
                  }}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                Email address
              </ThemedText>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <SymbolView
                  name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' } as any}
                  size={18}
                  tintColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (localError) setLocalError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                Password
              </ThemedText>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <SymbolView
                  name={{ ios: 'lock.fill', android: 'lock', web: 'lock' } as any}
                  size={18}
                  tintColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (localError) setLocalError(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                  style={styles.eyeToggle}
                >
                  <SymbolView
                    name={
                      showPassword
                        ? ({ ios: 'eye.slash.fill', android: 'visibility_off', web: 'visibility_off' } as any)
                        : ({ ios: 'eye.fill', android: 'visibility', web: 'visibility' } as any)
                    }
                    size={20}
                    tintColor={colors.textSecondary}
                  />
                </Pressable>
              </View>

              {/* Password Hint */}
              <View style={styles.hintRow}>
                <SymbolView
                  name={
                    isPasswordLengthValid
                      ? ({ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as any)
                      : ({ ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' } as any)
                  }
                  size={12}
                  tintColor={isPasswordLengthValid ? colors.primary : colors.textMuted}
                />
                <ThemedText
                  style={[
                    styles.hintText,
                    {
                      color: isPasswordLengthValid
                        ? colors.primary
                        : colors.textMuted,
                    },
                  ]}
                >
                  At least 8 characters
                </ThemedText>
              </View>
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                Confirm password
              </ThemedText>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <SymbolView
                  name={{ ios: 'lock.fill', android: 'lock_outline', web: 'lock_outline' } as any}
                  size={18}
                  tintColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (localError) setLocalError(null);
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={8}
                  style={styles.eyeToggle}
                >
                  <SymbolView
                    name={
                      showConfirmPassword
                        ? ({ ios: 'eye.slash.fill', android: 'visibility_off', web: 'visibility_off' } as any)
                        : ({ ios: 'eye.fill', android: 'visibility', web: 'visibility' } as any)
                    }
                    size={20}
                    tintColor={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleRegister}
              disabled={isAuthenticating}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary },
                (pressed || isAuthenticating) && { opacity: 0.85 },
              ]}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <ThemedText style={styles.submitBtnText}>Create Account</ThemedText>
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' } as any}
                    size={16}
                    tintColor="#FFFFFF"
                  />
                </View>
              )}
            </Pressable>

            {/* Quick Guest Alternative */}
            <Pressable
              onPress={() => loginAsGuest()}
              disabled={isAuthenticating}
              style={({ pressed }) => [
                styles.guestLinkBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                size={14}
                tintColor={colors.primary}
              />
              <ThemedText style={[styles.guestLinkText, { color: colors.primary }]}>
                Or start right away with Guest Demo
              </ThemedText>
            </Pressable>
          </View>

          {/* Navigation to Login */}
          <View style={styles.footerRow}>
            <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </ThemedText>
            <Pressable onPress={onNavigateToLogin} hitSlop={8}>
              <ThemedText style={[styles.footerLink, { color: colors.primary }]}>
                Sign in
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandLetter: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Typography.fontFamilies.editorial,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 19,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.five,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: Spacing.five,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.one,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 46,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    height: '100%',
    paddingVertical: 0,
  },
  eyeToggle: {
    padding: Spacing.one,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginLeft: 2,
  },
  hintText: {
    fontSize: 11,
  },
  submitBtn: {
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  guestLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
    paddingVertical: Spacing.one,
  },
  guestLinkText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
  },
  footerLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
});
export default RegisterScreen;
