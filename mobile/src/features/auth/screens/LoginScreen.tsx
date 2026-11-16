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
import { getButtonForegroundColor } from '@/components/ui/Button';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

interface LoginScreenProps {
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
  onNavigateToResetPassword?: (token?: string) => void;
}

export function LoginScreen({
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onNavigateToResetPassword,
}: LoginScreenProps) {
  const { colors, isDark } = useAppTheme();
  const { login, isAuthenticating, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
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
              <ThemedText
                style={[
                  styles.brandLetter,
                  { color: getButtonForegroundColor('primary', colors, isDark) },
                ]}
              >
                L
              </ThemedText>
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
                <View style={{ flex: 1 }}>
                  <ThemedText
                    style={[
                      styles.errorText,
                      { color: isDark ? '#FCA5A5' : '#B91C1C' },
                    ]}
                  >
                    {activeError}
                  </ThemedText>
                  {activeError.toLowerCase().includes('invalid email or password') && onNavigateToForgotPassword && (
                    <Pressable
                      onPress={onNavigateToForgotPassword}
                      hitSlop={8}
                      style={{ marginTop: Spacing.one }}
                    >
                      <ThemedText
                        style={{
                          fontSize: Typography.fontSize.xs,
                          fontFamily: Typography.fontFamilies.sansSemiBold,
                          color: isDark ? '#93C5FD' : '#1D4ED8',
                          textDecorationLine: 'underline',
                        }}
                      >
                        Forgot your password? Reset it here &rarr;
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
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
                  onPress={() => {
                    if (onNavigateToForgotPassword) {
                      onNavigateToForgotPassword();
                    } else {
                      setIsForgotModalVisible(true);
                    }
                  }}
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
              disabled={isAuthenticating}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary },
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
                    Sign In
                  </ThemedText>
                  <SymbolView
                    name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' } as any}
                    size={16}
                    tintColor={getButtonForegroundColor('primary', colors, isDark)}
                  />
                </View>
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
    fontSize: 26,
    fontFamily: Typography.fontFamilies.editorial,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamilies.editorial,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.five,
    borderWidth: 1,
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
    fontFamily: Typography.fontFamilies.sansSemiBold,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: Spacing.four,
  },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansSemiBold,
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
    fontFamily: Typography.fontFamilies.sansSemiBold,
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
    fontFamily: Typography.fontFamilies.sans,
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
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.base,
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
    fontFamily: Typography.fontFamilies.sansBold,
  },
});
export default LoginScreen;
