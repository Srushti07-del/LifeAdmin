/**
 * LifeAdmin Mobile Reset Password Screen
 * Secure native password reset screen with token input, password validation,
 * visibility toggles, and clear feedback.
 */

import React, { useState, useEffect } from 'react';
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
import { getButtonForegroundColor } from '@/components/ui/Button';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

interface ResetPasswordScreenProps {
  token?: string;
  onNavigateToLogin: () => void;
  onNavigateToForgotPassword?: () => void;
}

export function ResetPasswordScreen({
  token: initialToken = '',
  onNavigateToLogin,
  onNavigateToForgotPassword,
}: ResetPasswordScreenProps) {
  const { colors, isDark } = useAppTheme();
  const { resetPassword, isAuthenticating, error, clearError } = useAuth();

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
    }
  }, [initialToken]);

  const activeError = localError || error;
  const isPasswordValid = password.length >= 8;

  const handleSubmit = async () => {
    setLocalError(null);
    clearError();

    const cleanToken = token.trim();
    if (!cleanToken) {
      setLocalError('Please enter your password reset token.');
      return;
    }

    if (!isPasswordValid) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      await resetPassword(cleanToken, password, confirmPassword);
      setIsSuccess(true);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                  backgroundColor: isSuccess ? '#10B981' : colors.primary,
                  shadowColor: isSuccess ? '#10B981' : colors.primary,
                },
              ]}
            >
              <SymbolView
                name={
                  isSuccess
                    ? ({ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' } as any)
                    : ({ ios: 'key.fill', android: 'vpn_key', web: 'vpn_key' } as any)
                }
                size={24}
                tintColor={
                  isSuccess
                    ? '#FFFFFF'
                    : getButtonForegroundColor('primary', colors, isDark)
                }
              />
            </View>

            <ThemedText style={[styles.title, { color: colors.text }]}>
              {isSuccess ? 'Password Reset' : 'Reset Password'}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isSuccess
                ? 'Your password has been changed successfully. You can now sign in.'
                : 'Enter your reset token and choose a new secure password.'}
            </ThemedText>
          </View>

          {/* Card */}
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
            {activeError && !isSuccess && (
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
                  {activeError?.toLowerCase().includes('expired') && onNavigateToForgotPassword && (
                    <Pressable
                      onPress={onNavigateToForgotPassword}
                      style={{ marginTop: Spacing.one }}
                    >
                      <ThemedText
                        style={[
                          styles.requestNewTokenLink,
                          { color: colors.primary },
                        ]}
                      >
                        Request a fresh reset link &rarr;
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {isSuccess ? (
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
                  All set!
                </ThemedText>

                <ThemedText style={[styles.successDescription, { color: colors.textSecondary }]}>
                  Your password has been successfully updated and your reset token has been invalidated.
                </ThemedText>

                <Pressable
                  onPress={onNavigateToLogin}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    { backgroundColor: colors.primary, marginTop: Spacing.four },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.submitBtnContent}>
                    <ThemedText
                      style={[
                        styles.submitBtnText,
                        { color: getButtonForegroundColor('primary', colors, isDark) },
                      ]}
                    >
                      Proceed to Sign In
                    </ThemedText>
                    <SymbolView
                      name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as any}
                      size={16}
                      tintColor={getButtonForegroundColor('primary', colors, isDark)}
                    />
                  </View>
                </Pressable>
              </View>
            ) : (
              <>
                {/* Token Field */}
                <View style={styles.inputGroup}>
                  <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                    Reset Token
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
                      name={{ ios: 'key.fill', android: 'key', web: 'key' } as any}
                      size={18}
                      tintColor={colors.textSecondary}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Paste your reset token"
                      placeholderTextColor={colors.textMuted}
                      value={token}
                      onChangeText={(val) => {
                        setToken(val);
                        if (localError) setLocalError(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* New Password Field */}
                <View style={styles.inputGroup}>
                  <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                    New password
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
                </View>

                {/* Confirm Password Field */}
                <View style={styles.inputGroup}>
                  <ThemedText style={[styles.inputLabel, { color: colors.text }]}>
                    Confirm new password
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
                      placeholder="Re-enter your new password"
                      placeholderTextColor={colors.textMuted}
                      value={confirmPassword}
                      onChangeText={(val) => {
                        setConfirmPassword(val);
                        if (localError) setLocalError(null);
                      }}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
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

                {/* Password hint indicator */}
                <View style={styles.rulesRow}>
                  <SymbolView
                    name={
                      isPasswordValid
                        ? ({ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } as any)
                        : ({ ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' } as any)
                    }
                    size={14}
                    tintColor={isPasswordValid ? '#10B981' : colors.textMuted}
                  />
                  <ThemedText
                    style={[
                      styles.ruleText,
                      { color: isPasswordValid ? colors.text : colors.textMuted },
                    ]}
                  >
                    At least 8 characters
                  </ThemedText>
                </View>

                {/* Submit Button */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={isAuthenticating}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    { backgroundColor: colors.primary, marginTop: Spacing.four },
                    (pressed || isAuthenticating) && { opacity: 0.85 },
                  ]}
                >
                  {isAuthenticating ? (
                    <ActivityIndicator
                      color={getButtonForegroundColor('primary', colors, isDark)}
                      size="small"
                    />
                  ) : (
                    <View style={styles.submitBtnContent}>
                      <ThemedText
                        style={[
                          styles.submitBtnText,
                          { color: getButtonForegroundColor('primary', colors, isDark) },
                        ]}
                      >
                        Update Password
                      </ThemedText>
                      <SymbolView
                        name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as any}
                        size={16}
                        tintColor={getButtonForegroundColor('primary', colors, isDark)}
                      />
                    </View>
                  )}
                </Pressable>
              </>
            )}
          </View>

          {/* Footer Navigation */}
          <View style={styles.footerRow}>
            <ThemedText style={[styles.footerText, { color: colors.textSecondary }]}>
              Remembered your password?{' '}
            </ThemedText>
            <Pressable onPress={onNavigateToLogin} hitSlop={8}>
              <ThemedText style={[styles.footerLink, { color: colors.primary }]}>
                Back to Sign In
              </ThemedText>
            </Pressable>
          </View>

          {onNavigateToForgotPassword && !isSuccess && (
            <View style={[styles.footerRow, { marginTop: Spacing.two }]}>
              <Pressable onPress={onNavigateToForgotPassword} hitSlop={8}>
                <ThemedText style={[styles.footerLink, { color: colors.textSecondary, fontSize: Typography.fontSize.xs - 1 }]}>
                  Need to request a new token?
                </ThemedText>
              </Pressable>
            </View>
          )}

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
  requestNewTokenLink: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
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
  eyeToggle: {
    padding: Spacing.one,
  },
  rulesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: -Spacing.two,
    marginBottom: Spacing.two,
  },
  ruleText: {
    fontSize: Typography.fontSize.xs,
  },
  submitBtn: {
    height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  submitBtnText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
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
    fontFamily: Typography.fontFamilies.editorial,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  successDescription: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
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

export default ResetPasswordScreen;
