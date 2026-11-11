/**
 * LifeAdmin Mobile — LifeBuddy AI Assistant Screen
 * Complete conversational AI, goal planning, and responsibility extraction:
 * - Conversational LifeBuddy Chat with context from user's tasks, bills, and schedule
 * - Goal Planner converting personal/professional ambitions into structured milestones & tasks
 * - Responsibility Detector extracting actionable items from unstructured text snippets
 * - Strict Confirmation Safeguards: never auto-creates records; enforces review in native modal
 * - Conversation persistence and history browsing
 * - Editorial Sanctuary styling (DM Serif Display, Ocean Teal palette, light/dark themes)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAppTheme } from '@/context/ThemeContext';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SegmentedControl, getButtonForegroundColor } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing, Radius } from '@/constants/spacing';
import { createShadow } from '@/constants/shadows';
import {
  aiService,
  ChatMessage,
  ProposedAction,
  ConversationSummary,
  PlanResponse,
  DetectResponse,
  ChatMessageBubble,
  ActionConfirmationModal,
  ConversationsHistoryModal,
  GoalPlannerView,
  ResponsibilityDetectorView,
  SUGGESTED_PROMPTS,
  formatMessageTime,
} from '@/features/ai';

type AITab = 'chat' | 'plan' | 'detect';

export default function AIAssistantScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const searchParams = useLocalSearchParams<{ tab?: string }>();

  // Active screen segment
  const [activeTab, setActiveTab] = useState<AITab>(
    (searchParams.tab as AITab) || 'chat'
  );

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Goal Planner state
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState<PlanResponse | null>(null);

  // Responsibility Detector state
  const [isDetectLoading, setIsDetectLoading] = useState(false);
  const [detectResult, setDetectResult] = useState<DetectResponse | null>(null);

  // Action Review Modal Safeguard state
  const [reviewAction, setReviewAction] = useState<ProposedAction | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // Conversations History Modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<ConversationSummary[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Scroll ref for chat view auto-scrolling
  const chatScrollRef = useRef<any>(null);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated });
    }, 120);
  }, []);

  // Send a chat message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputQuery).trim();
    if (!query || isChatLoading) return;

    setInputQuery('');
    setChatError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: formatMessageTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);
    scrollToBottom(true);

    try {
      const response = await aiService.chat(query, conversationId);
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        proposedActions: response.proposedActions,
        suggestions: response.suggestions,
        timestamp: formatMessageTime(),
        source: response.source,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.warn('AI Chat Error:', err);
      const errMsg =
        err?.message ||
        'Could not reach LifeBuddy AI. Please check your connection and try again.';
      setChatError(errMsg);
    } finally {
      setIsChatLoading(false);
      scrollToBottom(true);
    }
  };

  // Open action review modal (SAFEGUARD)
  const handleOpenReview = (action: ProposedAction) => {
    setReviewAction(action);
    setIsActionModalOpen(true);
  };

  // Confirm and execute reviewed action
  const handleConfirmAction = async (modifiedAction: ProposedAction) => {
    if (isActionSubmitting) return;
    setIsActionSubmitting(true);

    try {
      const res = await aiService.executeAction(modifiedAction);
      setIsActionModalOpen(false);
      setReviewAction(null);

      const actionTitle = modifiedAction.title || 'item';
      const actionType = modifiedAction.type;

      // Append system confirmation note to chat
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'assistant',
          content: `✅ Successfully created ${actionType}: "${actionTitle}". Added to your records after explicit confirmation.`,
          timestamp: formatMessageTime(),
        },
      ]);

      Alert.alert(
        'Item Created',
        `"${actionTitle}" has been saved to your ${actionType}s.`
      );
    } catch (err: any) {
      console.error('Failed to execute AI action:', err);
      Alert.alert(
        'Creation Failed',
        err?.message || 'Could not save the item. No data was changed.'
      );
    } finally {
      setIsActionSubmitting(false);
    }
  };

  // Bulk accept suggestions
  const handleAcceptAll = async (items: ProposedAction[]) => {
    if (!items.length || isActionSubmitting) return;

    Alert.alert(
      'Confirm Bulk Creation',
      `Are you sure you want to create all ${items.length} suggested items in your LifeAdmin account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Create ${items.length} Items`,
          onPress: async () => {
            setIsActionSubmitting(true);
            try {
              const res = await aiService.acceptSuggestions(items);
              const count = res.results?.length ?? items.length;

              setMessages((prev) => [
                ...prev,
                {
                  id: `sys-${Date.now()}`,
                  role: 'assistant',
                  content: `✅ Created ${count} item(s) in your account after confirmation.`,
                  timestamp: formatMessageTime(),
                },
              ]);

              Alert.alert(
                'Items Created',
                `Successfully created ${count} item(s) from suggestions.`
              );
            } catch (err: any) {
              console.error('Bulk accept failed:', err);
              Alert.alert(
                'Creation Failed',
                err?.message || 'Failed to create suggestions.'
              );
            } finally {
              setIsActionSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Goal Planner handler
  const handleGeneratePlan = async (goal: string, targetDate?: string) => {
    setIsPlanLoading(true);
    setPlanResult(null);
    try {
      const res = await aiService.generatePlan(goal, targetDate);
      setPlanResult(res);
    } catch (err: any) {
      console.error('Goal plan generation error:', err);
      Alert.alert(
        'Planning Error',
        err?.message || 'Could not generate action plan. Please try again.'
      );
    } finally {
      setIsPlanLoading(false);
    }
  };

  // Responsibility Detector handler
  const handleDetectResponsibilities = async (text: string) => {
    setIsDetectLoading(true);
    setDetectResult(null);
    try {
      const res = await aiService.detectResponsibilities(text);
      setDetectResult(res);
    } catch (err: any) {
      console.error('Detect responsibilities error:', err);
      Alert.alert(
        'Extraction Error',
        err?.message || 'Could not parse text for responsibilities.'
      );
    } finally {
      setIsDetectLoading(false);
    }
  };

  // Open past conversations modal
  const handleOpenHistory = async () => {
    setIsHistoryModalOpen(true);
    setIsHistoryLoading(true);
    try {
      const list = await aiService.getConversations();
      setHistoryList(list);
    } catch (err) {
      console.warn('Could not load conversations:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Select historical conversation
  const handleSelectConversation = async (id: string) => {
    setIsHistoryModalOpen(false);
    setIsChatLoading(true);
    try {
      const detail = await aiService.getConversation(id);
      setConversationId(detail.id);

      const formattedMsgs: ChatMessage[] = (detail.messages || []).map((m, idx) => ({
        id: `hist-${idx}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp ? formatMessageTime(m.timestamp) : formatMessageTime(),
      }));

      setMessages(formattedMsgs);
      scrollToBottom(false);
    } catch (err: any) {
      Alert.alert('Load Failed', err?.message || 'Could not load conversation history.');
    } finally {
      setIsChatLoading(false);
    }
  };

  // Start fresh chat
  const handleStartNewChat = () => {
    setIsHistoryModalOpen(false);
    setConversationId(null);
    setMessages([]);
    setChatError(null);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Screen Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: colors.surfaceSecondary },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <SymbolView
                name={{ ios: 'chevron.backward', android: 'arrow_back' }}
                size={18}
                tintColor={colors.text}
              />
            </Pressable>

            <View style={styles.titleCol}>
              <View style={styles.titleRow}>
                <ThemedText style={[styles.title, { color: colors.text }]}>
                  LifeBuddy Assistant
                </ThemedText>
                <View
                  style={[
                    styles.aiBadge,
                    {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <ThemedText style={[styles.aiBadgeText, { color: colors.primary }]}>
                    AI Powered
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                Planning, smart summaries & responsibility detection
              </ThemedText>
            </View>
          </View>

          {/* Header Action Buttons */}
          <View style={styles.headerRight}>
            <Pressable
              onPress={handleOpenHistory}
              hitSlop={8}
              style={({ pressed }) => [
                styles.headerActionBtn,
                { backgroundColor: colors.surfaceSecondary },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="View chat history"
            >
              <SymbolView
                name={{ ios: 'clock.arrow.circlepath', android: 'history' }}
                size={16}
                tintColor={colors.text}
              />
            </Pressable>

            <Pressable
              onPress={handleStartNewChat}
              hitSlop={8}
              style={({ pressed }) => [
                styles.headerActionBtn,
                { backgroundColor: colors.surfaceSecondary },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Start new chat"
            >
              <SymbolView
                name={{ ios: 'square.and.pencil', android: 'add' }}
                size={16}
                tintColor={colors.primary}
              />
            </Pressable>
          </View>
        </View>

        {/* Segmented Tab Navigation Control */}
        <View style={styles.segmentContainer}>
          <SegmentedControl
            options={[
              { value: 'chat', label: 'Chat' },
              { value: 'plan', label: 'Goal Planner' },
              { value: 'detect', label: 'Text Extractor' },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as AITab)}
          />
        </View>

        {/* Tab 1: LifeBuddy Chat */}
        {activeTab === 'chat' && (
          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollToBottom(false)}
            >
              {/* Empty Chat Welcome Hero */}
              {messages.length === 0 && (
                <View style={styles.welcomeHero}>
                  <View
                    style={[
                      styles.heroIconBox,
                      {
                        backgroundColor: colors.primarySoft,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <SymbolView
                      name={{ ios: 'sparkles', android: 'auto_awesome' }}
                      size={32}
                      tintColor={colors.primary}
                    />
                  </View>

                  <ThemedText style={[styles.heroTitle, { color: colors.text }]}>
                    How can I help you today?
                  </ThemedText>
                  <ThemedText
                    style={[styles.heroSubtitle, { color: colors.textSecondary }]}
                  >
                    I have secure access to your tasks, upcoming bills, and schedule.
                    Ask questions or tap a suggestion below to get started.
                  </ThemedText>

                  {/* Suggestion Prompts Grid */}
                  <View style={styles.suggestionsContainer}>
                    <ThemedText
                      style={[
                        styles.suggestionsLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      SUGGESTED QUESTIONS
                    </ThemedText>

                    <View style={styles.promptsGrid}>
                      {SUGGESTED_PROMPTS.map((prompt, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => handleSendMessage(prompt)}
                          style={({ pressed }) => [
                            styles.promptChip,
                            createShadow(isDark, 'xs'),
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                            pressed && { opacity: 0.8 },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={prompt}
                        >
                          <SymbolView
                            name={{ ios: 'sparkle', android: 'lightbulb' }}
                            size={13}
                            tintColor={colors.primary}
                          />
                          <ThemedText
                            style={[styles.promptText, { color: colors.text }]}
                          >
                            {prompt}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Message History */}
              {messages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  onReviewAction={handleOpenReview}
                />
              ))}

              {/* Active Loading Indicator */}
              {isChatLoading && (
                <View style={styles.loadingBubbleRow}>
                  <View
                    style={[
                      styles.loadingBubble,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <ActivityIndicator size="small" color={colors.primary} />
                    <ThemedText
                      style={[
                        styles.loadingText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      LifeBuddy is checking your records...
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Error Banner */}
              {chatError && (
                <View
                  style={[
                    styles.errorBanner,
                    {
                      backgroundColor: isDark
                        ? Colors.urgency.critical.darkBg
                        : Colors.urgency.critical.lightBg,
                      borderColor: Colors.urgency.critical.accent,
                    },
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: 'exclamationmark.triangle.fill',
                      android: 'warning',
                    }}
                    size={16}
                    tintColor={
                      isDark
                        ? Colors.urgency.critical.darkText
                        : Colors.urgency.critical.accent
                    }
                  />
                  <ThemedText
                    style={[
                      styles.errorText,
                      {
                        color: isDark
                          ? Colors.urgency.critical.darkText
                          : Colors.urgency.critical.lightText,
                      },
                    ]}
                  >
                    {chatError}
                  </ThemedText>
                  <Pressable
                    onPress={() => handleSendMessage()}
                    hitSlop={8}
                    style={styles.retryBtn}
                  >
                    <ThemedText
                      style={[
                        styles.retryBtnText,
                        {
                          color: isDark
                            ? Colors.urgency.critical.darkText
                            : Colors.urgency.critical.lightText,
                        },
                      ]}
                    >
                      Retry
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </ScrollView>

            {/* Input Bar */}
            <View
              style={[
                styles.inputBar,
                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
                  paddingBottom: Math.max(insets.bottom, Spacing.three),
                },
              ]}
            >
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Ask LifeBuddy AI about your schedule, bills..."
                placeholderTextColor={colors.textSecondary}
                value={inputQuery}
                onChangeText={setInputQuery}
                onSubmitEditing={() => handleSendMessage()}
                returnKeyType="send"
                editable={!isChatLoading}
              />

              <Pressable
                onPress={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isChatLoading}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor:
                      !inputQuery.trim() || isChatLoading
                        ? colors.surfaceSecondary
                        : colors.primary,
                    borderColor:
                      !inputQuery.trim() || isChatLoading
                        ? colors.border
                        : colors.primary,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                {isChatLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary}
                  />
                ) : (
                  <SymbolView
                    name={{ ios: 'arrow.up', android: 'send' }}
                    size={17}
                    tintColor={
                      !inputQuery.trim()
                        ? colors.textMuted
                        : getButtonForegroundColor('primary', colors, isDark)
                    }
                  />
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Tab 2: Goal Planner */}
        {activeTab === 'plan' && (
          <KeyboardAvoidingView
            style={styles.viewContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <GoalPlannerView
              onGeneratePlan={handleGeneratePlan}
              isLoading={isPlanLoading}
              planResult={planResult}
              onReviewTask={handleOpenReview}
              onAcceptAllTasks={handleAcceptAll}
              isActionBusy={isActionSubmitting}
            />
          </KeyboardAvoidingView>
        )}

        {/* Tab 3: Responsibility Detector */}
        {activeTab === 'detect' && (
          <KeyboardAvoidingView
            style={styles.viewContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <ResponsibilityDetectorView
              onDetectResponsibilities={handleDetectResponsibilities}
              isLoading={isDetectLoading}
              detectResult={detectResult}
              onReviewItem={handleOpenReview}
              onAcceptAllItems={handleAcceptAll}
              isActionBusy={isActionSubmitting}
            />
          </KeyboardAvoidingView>
        )}

        {/* Action Confirmation Modal (SAFEGUARD) */}
        <ActionConfirmationModal
          isOpen={isActionModalOpen}
          onClose={() => {
            setIsActionModalOpen(false);
            setReviewAction(null);
          }}
          action={reviewAction}
          onConfirm={handleConfirmAction}
          isSubmitting={isActionSubmitting}
        />

        {/* Conversations History Modal Sheet */}
        <ConversationsHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          conversations={historyList}
          isLoading={isHistoryLoading}
          onSelectConversation={handleSelectConversation}
          onStartNewChat={handleStartNewChat}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize.lg,
  },
  aiBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  aiBadgeText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
  },
  subtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.micro,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  chatContainer: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  welcomeHero: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  heroTitle: {
    fontFamily: Typography.fontFamilies.editorial,
    fontSize: Typography.fontSize['2xl'],
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  heroSubtitle: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: Spacing.six,
  },
  suggestionsContainer: {
    width: '100%',
    marginTop: Spacing.two,
  },
  suggestionsLabel: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.micro,
    letterSpacing: 0.8,
    marginBottom: Spacing.three,
  },
  promptsGrid: {
    gap: Spacing.two,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  promptText: {
    fontFamily: Typography.fontFamilies.sansMedium,
    fontSize: Typography.fontSize.xs,
    flex: 1,
  },
  loadingBubbleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.four,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  loadingText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  errorText: {
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.xs,
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  retryBtnText: {
    fontFamily: Typography.fontFamilies.sansBold,
    fontSize: Typography.fontSize.xs,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    fontFamily: Typography.fontFamilies.sans,
    fontSize: Typography.fontSize.sm,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewContainer: {
    flex: 1,
  },
});
