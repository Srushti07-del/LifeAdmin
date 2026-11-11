/**
 * LifeAdmin Mobile — Explicit Account Deletion Confirmation Bottom Sheet
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ModalSheet, Input, Button } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';

export interface DeleteAccountModalProps {
  isOpen: boolean;
  userName: string;
  userEmail: string;
  isDeleting: boolean;
  error: string | null;
  onConfirmDelete: () => Promise<void>;
  onClose: () => void;
}

export function DeleteAccountModal({
  isOpen,
  userName,
  userEmail,
  isDeleting,
  error,
  onConfirmDelete,
  onClose,
}: DeleteAccountModalProps) {
  const { colors, isDark } = useAppTheme();
  const [confirmationText, setConfirmationText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setConfirmationText('');
    }
  }, [isOpen]);

  const isConfirmed = confirmationText.trim() === 'DELETE';

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      title="Delete Account"
      description="This action permanently deletes your LifeAdmin account and cannot be undone."
    >
      <View style={styles.container}>
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
            },
          ]}
        >
          <SymbolView
            name={{
              ios: 'exclamationmark.triangle.fill',
              android: 'warning',
              web: 'warning',
            } as any}
            size={20}
            tintColor={Colors.status.danger}
          />
          <View style={styles.warningTextCol}>
            <ThemedText style={[styles.warningTitle, { color: Colors.status.danger }]}>
              Permanent data erasure for {userName || userEmail}
            </ThemedText>
            <ThemedText style={[styles.warningDesc, { color: colors.textSecondary }]}>
              All tasks, bills, appointments, reminders, uploaded vault documents, calendar
              entries, AI history, and LifeBuddy companion records will be erased immediately.
            </ThemedText>
          </View>
        </View>

        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2',
                borderColor: Colors.status.danger,
              },
            ]}
          >
            <ThemedText style={[styles.errorText, { color: Colors.status.danger }]}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        <Input
          label='Type "DELETE" to confirm permanent deletion'
          placeholder="DELETE"
          value={confirmationText}
          onChangeText={setConfirmationText}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!isDeleting}
        />

        <View style={styles.actionsRow}>
          <View style={styles.actionFlex}>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              disabled={isDeleting}
              onPress={onClose}
            >
              Cancel
            </Button>
          </View>
          <View style={styles.actionFlex}>
            <Button
              variant="danger"
              size="lg"
              fullWidth
              loading={isDeleting}
              disabled={!isConfirmed || isDeleting}
              onPress={onConfirmDelete}
            >
              Delete Forever
            </Button>
          </View>
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  warningTextCol: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontFamily: Typography.fontFamilies.sansSemiBold,
    fontSize: Typography.fontSize.sm,
  },
  warningDesc: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  errorText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionFlex: {
    flex: 1,
  },
});

export default DeleteAccountModal;
