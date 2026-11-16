/**
 * LifeAdmin Mobile — Password Reset & Account Recovery Bottom Sheet
 * Simplified email-based recovery flow matching web feature parity.
 * LifeAdmin sends a secure password reset link to the registered email address.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ModalSheet, Input, Button, getButtonForegroundColor } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

export interface PasswordSecurityModalProps {
  isOpen: boolean;
  email: string;
  isGuest?: boolean;
  onRequestResetEmail: (email: string) => Promise<{ message: string }>;
  onApplyResetToken?: (
    token: string,
    password: string,
    confirmPassword: string
  ) => Promise<{ message: string }>;
  onClose: () => void;
}

export function PasswordSecurityModal({
  isOpen,
  email,
  isGuest = false,
  onRequestResetEmail,
  onClose,
}: PasswordSecurityModalProps) {
  const { colors, isDark } = useAppTheme();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (!isOpen) {
      setFeedback(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSendEmail = async () => {
    if (isGuest || !email) return;
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await onRequestResetEmail(email);
      setFeedback({
        type: 'success',
        text:
          res.message ||
          'Reset instructions have been sent. Please check your inbox for your 30-minute reset link.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text:
          err?.message ||
          'Unable to dispatch password reset email right now. Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Password & Recovery"
      description="LifeAdmin sends a secure password reset link to your registered email address. The link is valid for 30 minutes."
    >
      <View style={styles.container}>
        {feedback ? (
          <View
            style={[
              styles.banner,
              {
                backgroundColor:
                  feedback.type === 'success'
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.16)'
                      : '#ECFDF5'
                    : isDark
                    ? 'rgba(239, 68, 68, 0.16)'
                    : '#FEF2F2',
                borderColor:
                  feedback.type === 'success' ? Colors.status.success : Colors.status.danger,
              },
            ]}
          >
            <SymbolView
              name={{
                ios:
                  feedback.type === 'success'
                    ? 'checkmark.circle.fill'
                    : 'exclamationmark.triangle.fill',
                android: feedback.type === 'success' ? 'check_circle' : 'error',
                web: feedback.type === 'success' ? 'check_circle' : 'error',
              } as any}
              size={18}
              tintColor={
                feedback.type === 'success' ? Colors.status.success : Colors.status.danger
              }
            />
            <ThemedText
              style={[
                styles.bannerText,
                {
                  color:
                    feedback.type === 'success' ? Colors.status.success : Colors.status.danger,
                },
              ]}
            >
              {feedback.text}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.section}>
          <Input
            label="Account Email"
            value={email || 'Your registered email'}
            editable={false}
            helperText="A secure reset link valid for 30 minutes will be sent to this email."
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isGuest || isSubmitting || !email}
            onPress={handleSendEmail}
            icon={
              <SymbolView
                name={{ ios: 'envelope.badge', android: 'mail', web: 'mail' } as any}
                size={17}
                tintColor={getButtonForegroundColor('primary', colors, isDark)}
              />
            }
          >
            Send Password Reset Email
          </Button>
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  bannerText: {
    flex: 1,
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  section: {
    gap: Spacing.three,
  },
});

export default PasswordSecurityModal;
