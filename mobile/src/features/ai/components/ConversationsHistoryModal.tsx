/**
 * LifeAdmin Mobile — AI Conversations History Modal Sheet
 * Displays recent saved chat conversations and allows switching or starting fresh.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ModalSheet, Button } from '@/components/ui';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { ConversationSummary } from '../types';

interface ConversationsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  isLoading: boolean;
  onSelectConversation: (id: string) => void;
  onStartNewChat: () => void;
}

export function ConversationsHistoryModal({
  isOpen,
  onClose,
  conversations,
  isLoading,
  onSelectConversation,
  onStartNewChat,
}: ConversationsHistoryModalProps) {
  const { colors, isDark } = useAppTheme();

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Chat History"
      description="Recent LifeBuddy conversations for your authenticated account."
    >
      <View style={styles.container}>
        {/* New Chat Button */}
        <Button
          variant="outline"
          onPress={() => {
            onStartNewChat();
            onClose();
          }}
          icon={
            <SymbolView
              name={{ ios: 'plus.circle.fill', android: 'add' }}
              size={16}
              tintColor={colors.primary}
            />
          }
          style={styles.newChatBtn}
        >
          Start New Conversation
        </Button>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading conversations...
            </ThemedText>
          </View>
        ) : conversations.length > 0 ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {conversations.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  onSelectConversation(c.id);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.itemCard,
                  {
                    backgroundColor: isDark ? '#1C292D' : colors.surface,
                    borderColor: isDark ? '#304247' : colors.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.itemHeader}>
                  <ThemedText
                    style={[styles.itemPreview, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {c.preview || 'Conversation'}
                  </ThemedText>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right' }}
                    size={14}
                    tintColor={colors.textSecondary}
                  />
                </View>

                <ThemedText
                  style={[styles.itemTimestamp, { color: colors.textSecondary }]}
                >
                  {new Date(c.updatedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyBox}>
            <SymbolView
              name={{ ios: 'bubble.left.and.bubble.right', android: 'forum' }}
              size={36}
              tintColor={colors.primary}
            />
            <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
              No Past Conversations
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              Start chatting with LifeBuddy to see your saved history here.
            </ThemedText>
          </View>
        )}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.four,
  },
  newChatBtn: {
    marginBottom: Spacing.four,
  },
  loadingBox: {
    paddingVertical: Spacing.eight,
    alignItems: 'center',
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  itemCard: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.one,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemPreview: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
    lineHeight: 18,
  },
  itemTimestamp: {
    fontSize: 10,
    fontFamily: Typography.fontFamilies.sans,
  },
  emptyBox: {
    paddingVertical: Spacing.eight,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamilies.sansBold,
    marginTop: Spacing.one,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamilies.sans,
    textAlign: 'center',
    paddingHorizontal: Spacing.six,
  },
});

