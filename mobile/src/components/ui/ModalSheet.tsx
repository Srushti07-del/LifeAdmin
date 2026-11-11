import { SymbolView } from 'expo-symbols';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  ModalProps,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createShadow } from '@/constants/shadows';
import { Radius, Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useIsDark, useTheme } from '@/hooks/use-theme';

export interface ModalSheetProps extends Omit<ModalProps, 'visible' | 'children'> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
}

export function ModalSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  scrollable = true,
  containerStyle,
  sheetStyle,
  titleStyle,
  descriptionStyle,
  ...props
}: ModalSheetProps) {
  const colors = useTheme();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Spacing.four);

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      {...props}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.overlay}>
          {/* Backdrop Tap to Dismiss */}
          <Pressable
            style={[
              styles.backdrop,
              { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(24, 59, 61, 0.45)' },
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          />

          {/* Bottom Sheet Card */}
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              createShadow(isDark, 'modal'),
              sheetStyle,
            ]}
          >
            {/* Drag Handle Indicator */}
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>

            {/* Header */}
            {title || description ? (
              <View
                style={[
                  styles.header,
                  { borderBottomColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.headerTitles}>
                  {title ? (
                    <Text
                      style={[
                        styles.title,
                        { color: colors.text },
                        titleStyle,
                      ]}
                    >
                      {title}
                    </Text>
                  ) : null}
                  {description ? (
                    <Text
                      style={[
                        styles.description,
                        { color: colors.textSecondary },
                        descriptionStyle,
                      ]}
                    >
                      {description}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { backgroundColor: colors.surfaceSecondary },
                    pressed && styles.closePressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                    size={16}
                    weight="semibold"
                    tintColor={colors.textSecondary}
                  />
                </Pressable>
              </View>
            ) : null}

            {/* Sheet Body Content */}
            {scrollable ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: footer ? Spacing.four : bottomPad + Spacing.three },
                  containerStyle,
                ]}
              >
                {children}
              </ScrollView>
            ) : (
              <View
                style={[
                  styles.staticContent,
                  { paddingBottom: footer ? Spacing.four : bottomPad + Spacing.three },
                  containerStyle,
                ]}
              >
                {children}
              </View>
            )}

            {footer ? (
              <View
                style={[
                  styles.footer,
                  {
                    borderTopColor: colors.borderSubtle,
                    backgroundColor: colors.surface,
                    paddingBottom: bottomPad,
                  },
                ]}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '92%',
    width: '100%',
    overflow: 'hidden',
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
  },
  headerTitles: {
    flex: 1,
    marginRight: Spacing.three,
  },
  title: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.xl,
    lineHeight: 26,
  },
  description: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
    marginTop: 2,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
  },
  staticContent: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
  },
});

export default ModalSheet;

