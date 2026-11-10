/**
 * LifeAdmin Mobile Forgot Password Screen
 * Clean, accessible native form for requesting password reset instructions,
 * with graceful handling of unconfigured email backends and token entry shortcut.
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

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
  onNavigateToResetPassword: (token?: string) => void;
}

export function ForgotPasswordScreen({
  onNavigateToLogin,
  onNavigateToResetPassword,
}: ForgotPasswordScreenProps) {
  const { colors, isDark } = useAppTheme();
  const { forgotPassword, isAuthenticating, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const activeError = localError || error;
  const isEmailServiceUnavailable = activeError?.toLowerCase().includes('email service is not configured');

  const handleSubmit = async () => {
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

    try {
      await forgotPassword(cleanEmail);
      setIsSubmitted(true);
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
              <SymbolView
                name={{ ios: 'lock.fill', android: 'lock', web: 'lock' } as any}
                size={24}
                tintColor="#FFFFFF"
              />
            </View>

            <ThemedText style={[styles.title, { color: colors.text }]}>
              {isSubmitted ? 'Reset Link Sent' : 'Forgot Password'}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isSubmitted
                ? 'Check your inbox for password reset instructions.'
                : 'Enter your registered email and we’ll send you a password reset link.'}
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
                <View style={styles.errorContent}>
                  <ThemedText
                    style={[
                      styles.errorText,
                      { color: isDark ? '#FCA5A5' : '#B91C1C' },
                    ]}
                  >
                    {activeError}
                  </ThemedText>
                  {isEmailServiceUnavailable && (
                    <ThemedText
                      style={[
                        styles.errorHelpText,
                        { color: isDark ? '#E5E7EB' : '#374151' },
                      ]}
                    >
                      If you have an admin or test token, you can still reset your password directly.
                    </ThemedText>
                  )}
                </View>
              </View>
            )}

            {isSubmitted ? (
              <View style={styles.successContainer}>
                <View
                  style={[
                    styles.successIconCircle,
                    { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5' },
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as any}
                    size={36}
                    tintColor="#10B981"
                  />
                </View>

                <ThemedText style={[styles.successTitle, { color: colors.text }]}>
                  Check your email
                </ThemedText>

                <ThemedText style={[styles.successDescription, { color: colors.textSecondary }]}>
                  If an account is associated with <ThemedText style={{ fontWeight: '600', color: colors.text }}>{email}</ThemedText>, a password reset link has been dispatched. The link expires in 30 minutes.
                </ThemedText>

                {/* Direct token entry CTA */}
                <Pressable
                  onPress={() => onNavigateToResetPassword()}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    { backgroundColor: colors.primary, marginTop: Spacing.four },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.submitBtnContent}>
                    <ThemedText style={styles.submitBtnText}>Have Token? Reset Password</ThemedText>
                    <SymbolView
                      name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as any}
                      size={16}
                      tintColor="#FFFFFF"
                    />
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: colors.border, marginTop: Spacing.three },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <ThemedText style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                    Try another email address
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <>
                {/* Email Field */}
                <View style={styles.inputGroup}>
                  <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                    Registered email
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
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <Pressable
                  onPress={handleSubmit}
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
                      <ThemedText style={styles.submitBtnText}>Send Reset Link</ThemedText>
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
                    ALREADY HAVE A TOKEN?
                  </ThemedText>
                  <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
                </View>

                {/* Direct Reset Token Shortcut */}
                <Pressable
                  onPress={() => onNavigateToResetPassword()}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.submitBtnContent}>
                    <SymbolView
                      name={{ ios: 'key.fill', android: 'key', web: 'key' } as any}
                      size={16}
                      tintColor={colors.primary}
                    />
                    <ThemedText style={[styles.secondaryBtnText, { color: colors.text, marginLeft: Spacing.two }]}>
                      Enter Reset Token
                    </ThemedText>
                  </View>
                </Pressable>
              </>
            )}
          </View>

          {/* Footer Navigation */}
          <View style={styles.footerRow}>
            <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
              Remembered your credentials?{' '}
            </ThemedText>
            <Pressable onPress={onNavigateToLogin} hitSlop={8}>
              <ThemedText style={[styles.footerLink, { color: colors.primary }]}>
                Back to Sign In
              </ThemedText>
            </Pressable>
          </View>

          {/* Brand Assurance */}
          <View style={styles.assuranceRow}>
            <SymbolView
              name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' } as any}
              size={12}
              tintColor={colors.primary}
            />
            <ThemedText style={[styles.assuranceText, { color: colors.textMuted }]}>
              100% Free · Editorial Workspace · Privacy-focused
            </ThemedText>
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
    maxWidth: 290,
    lineHeight: 20,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.five,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  errorContent: {
    flex: 1,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: 18,
  },
  errorHelpText: {
    fontSize: Typography.fontSize.xs - 1,
    marginTop: Spacing.one,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: Spacing.four,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.one + 2,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
  },
  submitBtn: {
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamilies.sansSemiBold,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.four,
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.8,
  },
  secondaryBtn: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  secondaryBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  successTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamilies.editorial,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  successDescription: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.two,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
  },
  footerLink: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  assuranceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.six,
    gap: Spacing.one,
  },
  assuranceText: {
    fontSize: Typography.fontSize.xs - 1,
  },
});

export default ForgotPasswordScreen;
