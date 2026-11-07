/**
 * Forgot Password Informational Dialog / Modal
 * Truthfully informs users about server email configuration status and provides actionable alternatives.
 */

import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onGoToRegister: () => void;
  onGoToGuest: () => void;
}

export function ForgotPasswordModal({
  visible,
  onClose,
  onGoToRegister,
  onGoToGuest,
}: ForgotPasswordModalProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header Icon */}
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <SymbolView
              name={{ ios: 'lock.slash', android: 'lock_reset', web: 'lock_reset' } as any}
              size={26}
              tintColor={colors.primary}
            />
          </View>

          <ThemedText style={[styles.title, { color: colors.text }]}>
            Password Recovery
          </ThemedText>

          <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
            Automated email password reset is not configured on this LifeAdmin backend instance.
          </ThemedText>

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: isDark ? colors.surfaceElevated || '#285968' : '#F1F7F7',
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <ThemedText style={[styles.bullet, { color: colors.text }]}>
              • <ThemedText style={{ fontWeight: '600' }}>Self-hosted instance:</ThemedText> Reset your password in your MongoDB cluster or contact your administrator.
            </ThemedText>
            <ThemedText style={[styles.bullet, { color: colors.text, marginTop: Spacing.two }]}>
              • <ThemedText style={{ fontWeight: '600' }}>Immediate access:</ThemedText> You can create a new free account or explore all features in Guest Demo mode.
            </ThemedText>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsColumn}>
            <Pressable
              onPress={() => {
                onClose();
                onGoToGuest();
              }}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <ThemedText style={styles.primaryBtnText}>
                Try Guest Demo Mode
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => {
                onClose();
                onGoToRegister();
              }}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <ThemedText style={[styles.secondaryBtnText, { color: colors.text }]}>
                Create New Account
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <ThemedText style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                Back to Sign In
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    padding: Spacing.six,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamilies.editorial,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.four,
  },
  infoBox: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.five,
  },
  bullet: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  actionsColumn: {
    width: '100%',
    gap: Spacing.two,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  cancelBtn: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
});
