/**
 * LifeAdmin Mobile — Chat Message Bubble Component
 * Displays user & assistant messages, typing states, and embedded proposed action cards.
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { getButtonForegroundColor } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { CurrencyCode, DEFAULT_CURRENCY } from '@/utils/currency';
import { ChatMessage, ProposedAction } from '../types';
import {
  getActionTypeIcon,
  getActionTypeBadge,
  formatActionSubtitle,
} from '../services/aiCalculations';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onReviewAction: (action: ProposedAction) => void;
  preferredCurrency?: CurrencyCode;
}

export function ChatMessageBubble({
  message,
  onReviewAction,
  preferredCurrency = DEFAULT_CURRENCY,
}: ChatMessageBubbleProps) {
  const { colors, isDark } = useAppTheme();
  const isUser = message.role === 'user';
  const actions = message.proposedActions || message.suggestions || [];
  const primaryFg = getButtonForegroundColor('primary', colors, isDark);

  return (
    <View
      style={[
        styles.rowContainer,
        isUser ? styles.rowUser : styles.rowAssistant,
      ]}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <View
          style={[
            styles.avatarBox,
            { backgroundColor: colors.primary },
          ]}
        >
          <SymbolView
            name={{ ios: 'sparkles', android: 'smart_toy' }}
            size={16}
            tintColor={primaryFg}
          />
        </View>
      )}

      {/* Bubble Container */}
      <View
        style={[
          styles.bubbleWrapper,
          isUser ? styles.bubbleUserWrapper : styles.bubbleAssistantWrapper,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: colors.primary }]
              : [
                  styles.bubbleAssistant,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ],
          ]}
        >
          <ThemedText
            style={[
              styles.messageText,
              { color: isUser ? primaryFg : colors.text },
            ]}
            selectable
          >
            {message.content}
          </ThemedText>
        </View>

        {/* Embedded Proposed Actions List */}
        {!isUser && actions.length > 0 && (
          <View
            style={[
              styles.actionsContainer,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.actionsHeader}>
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome' }}
                size={13}
                tintColor={colors.primary}
              />
              <ThemedText style={[styles.actionsHeaderText, { color: colors.primary }]}>
                Proposed actions (confirmation required)
              </ThemedText>
            </View>

            {actions.map((item, idx) => {
              const badge = getActionTypeBadge(item.type, isDark);
              const icon = getActionTypeIcon(item.type);
              const subtitle = formatActionSubtitle(item, preferredCurrency);

              return (
                  <View
                  key={`${item.title}-${idx}`}
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.actionCardLeft}>
                    <View
                      style={[
                        styles.actionIconBox,
                        { backgroundColor: badge.bg, borderColor: badge.border },
                      ]}
                    >
                      <SymbolView
                        name={icon as any}
                        size={12}
                        tintColor={badge.color}
                      />
                    </View>

                    <View style={styles.actionTextCol}>
                      <ThemedText
                        style={[styles.actionTitle, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </ThemedText>
                      {subtitle ? (
                        <ThemedText
                          style={[styles.actionSubtitle, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {subtitle}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>

                  <Pressable
                    onPress={() => onReviewAction(item)}
                    hitSlop={6}
                    style={[styles.reviewBtn, { backgroundColor: colors.primary }]}
                  >
                    <ThemedText style={[styles.reviewBtnText, { color: primaryFg }]}>
                      Review
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}

            {actions.length > 1 && (
              <ThemedText
                style={[styles.safetyNote, { color: colors.textSecondary }]}
              >
                To keep records safe, review and confirm each action individually.
              </ThemedText>
            )}
          </View>
        )}

        {/* Timestamp & Source */}
        <ThemedText
          style={[
            styles.timestampText,
            { color: colors.textSecondary, alignSelf: isUser ? 'flex-end' : 'flex-start' },
          ]}
        >
          {message.timestamp}
          {message.source === 'fallback' ? ' · local summary' : ''}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    marginVertical: Spacing.two,
    gap: Spacing.two,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatarBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bubbleWrapper: {
    maxWidth: '85%',
    gap: Spacing.one,
  },
  bubbleUserWrapper: {
    alignItems: 'flex-end',
  },
  bubbleAssistantWrapper: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
  },
  bubbleUser: {
    borderBottomRightRadius: Radius.xs,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: Radius.xs,
    borderWidth: 1,
  },
  messageText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sans,
    lineHeight: 20,
  },
  actionsContainer: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing.one,
    gap: Spacing.two,
  },
  actionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionsHeaderText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  actionIconBox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  actionSubtitle: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sans,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  reviewBtn: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  reviewBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilies.sansBold,
  },
  safetyNote: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sans,
    fontStyle: 'italic',
  },
  timestampText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sans,
    paddingHorizontal: Spacing.one,
  },
});

