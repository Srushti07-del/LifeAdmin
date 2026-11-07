/**
 * LifeAdmin Mobile Login Screen
 * Native-feeling Android authentication with email/password, guest access,
 * password toggle, and error states following the Ocean Teal design system.
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
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

interface LoginScreenProps {
  onNavigateToRegister?: () => void;
}

export function LoginScreen({ onNavigateToRegister }: LoginScreenProps) {
  const { colors, isDark } = useAppTheme();
  const { login, loginAsGuest, isAuthenticating, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);

  const activeError = localError || error;

  const handleLogin = async () => {
    setLocalError(null);
    clearError();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setLocalError('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    try {
      await login(cleanEmail, password);
    } catch {
      // Error handled by AuthContext state
    }
  };

  const handleGuestLogin = async () => {
    setLocalError(null);
    clearError();
    setIsGuestLoading(true);
    try {
      await loginAsGuest();
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsGuestLoading(false);
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
          {/* Brand Header */}
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
              Welcome back
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your calm workspace for tasks, bills, and responsibilities.
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
                <ThemedText
                  style={[
                    styles.errorText,
                    { color: isDark ? '#FCA5A5' : '#B91C1C' },
                  ]}
                >
                  {activeError}
                </ThemedText>
              </View>
            )}

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
              <View style={styles.passwordLabelRow}>
                <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                  Password
                </ThemedText>
                <Pressable
                  onPress={() => setIsForgotModalVisible(true)}
                  hitSlop={8}
                >
                  <ThemedText
                    style={[styles.forgotText, { color: colors.primary }]}
                  >
                    Forgot?
                  </ThemedText>
                </Pressable>
              </View>

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
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (localError) setLocalError(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
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
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleLogin}
              disabled={isAuthenticating || isGuestLoading}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary },
                (pressed || isAuthenticating) && { opacity: 0.85 },
              ]}
            >
              {isAuthenticating && !isGuestLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <ThemedText style={styles.submitBtnText}>Sign In</ThemedText>
                  <SymbolView
                    name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as any}
                    size={16}
                    tintColor="#FFFFFF"
                  />
                </View>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
              <ThemedText style={[styles.dividerText, { color: colors.textMuted }]}>
                OR EXPLORE INSTANTLY
              </ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
            </View>

            {/* Guest Demo CTA Card */}
            <Pressable
              onPress={handleGuestLogin}
              disabled={isAuthenticating || isGuestLoading}
              style={({ pressed }) => [
                styles.guestCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.guestCardLeft}>
                <View
                  style={[
                    styles.guestIconCircle,
                    { backgroundColor: isDark ? colors.surfaceElevated || '#285968' : '#FFFFFF' },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
                    size={18}
                    tintColor={colors.primary}
                  />
                </View>
                <View style={styles.guestTextCol}>
                  <ThemedText style={[styles.guestTitle, { color: colors.text }]}>
                    Try Guest Demo
                  </ThemedText>
                  <ThemedText style={[styles.guestDesc, { color: colors.textSecondary }]}>
                    2-hr instant preview with pre-seeded data. No signup.
                  </ThemedText>
                </View>
              </View>

              {isGuestLoading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any}
                  size={18}
                  tintColor={colors.textSecondary}
                />
              )}
            </Pressable>
          </View>

          {/* Navigation to Register */}
          <View style={styles.footerRow}>
            <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
              Don't have an account?{' '}
            </ThemedText>
            <Pressable onPress={onNavigateToRegister} hitSlop={8}>
              <ThemedText style={[styles.footerLink, { color: colors.primary }]}>
                Create an account
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={isForgotModalVisible}
        onClose={() => setIsForgotModalVisible(false)}
        onGoToRegister={() => {
          setIsForgotModalVisible(false);
          onNavigateToRegister?.();
        }}
        onGoToGuest={() => {
          setIsForgotModalVisible(false);
          handleGuestLogin();
        }}
      />
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
    marginBottom: Spacing.six,
  },
  brandLogo: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  brandLetter: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    fontFamily: Typography.fontFamilies.editorial,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
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
    marginBottom: Spacing.six,
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
    marginBottom: Spacing.four,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.two,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  forgotText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 48,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.five,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginHorizontal: Spacing.three,
  },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  guestCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  guestIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestTextCol: {
    flex: 1,
  },
  guestTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 2,
  },
  guestDesc: {
    fontSize: 11,
    lineHeight: 15,
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
export default LoginScreen;
