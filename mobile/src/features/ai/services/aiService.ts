/**
 * LifeAdmin Mobile — AI Assistant Service
 * Interfaces with existing server endpoints in /server/src/routes/ai.ts
 * Strictly enforces user confirmation safeguards before mutating data.
 */

import { apiClient } from '@/services/apiClient';
import { Endpoints } from '@/services/endpoints';
import {
  ProposedAction,
  ConversationSummary,
  ConversationDetail,
  PlanResponse,
  DetectResponse,
  ActionExecuteResponse,
  AcceptSuggestionsResponse,
} from '../types';

export class AIService {
  /**
   * Sends a conversational query to LifeBuddy AI with real LifeAdmin context
   */
  public async chat(
    message: string,
    conversationId?: string | null
  ): Promise<{
    reply: string;
    proposedActions: ProposedAction[];
    suggestions: ProposedAction[];
    conversationId?: string;
    source?: 'ai' | 'fallback';
  }> {
    const res = await apiClient.post<{
      reply: string;
      proposedActions?: ProposedAction[];
      suggestions?: ProposedAction[];
      conversationId?: string;
      source?: 'ai' | 'fallback';
    }>(Endpoints.ai.chat, {
      body: JSON.stringify({
        message,
        conversationId: conversationId || undefined,
      }),
    });

    const rawActions = res.proposedActions || res.suggestions || [];
    const sanitizedActions: ProposedAction[] = rawActions.map((a) => ({
      ...a,
      currency: a.currency || 'INR',
      requiresConfirmation: true,
    }));

    return {
      reply: res.reply || 'I could not generate a response right now.',
      proposedActions: sanitizedActions,
      suggestions: sanitizedActions,
      conversationId: res.conversationId,
      source: res.source,
    };
  }

  /**
   * Fetches recent user AI conversation summaries
   */
  public async getConversations(): Promise<ConversationSummary[]> {
    try {
      const res = await apiClient.get<{ conversations: ConversationSummary[] }>(
        Endpoints.ai.conversations
      );
      return res?.conversations || [];
    } catch (err) {
      console.warn('Failed to load conversation history:', err);
      return [];
    }
  }

  /**
   * Fetches a past conversation by its unique MongoDB interaction ID
   */
  public async getConversation(id: string): Promise<ConversationDetail> {
    const res = await apiClient.get<{ conversation: ConversationDetail }>(
      Endpoints.ai.conversationById(id)
    );
    return res.conversation;
  }

  /**
   * Generates a structured multi-step action plan for a high-level goal
   */
  public async generatePlan(goal: string, targetDate?: string): Promise<PlanResponse> {
    const res = await apiClient.post<PlanResponse>(Endpoints.ai.plan, {
      body: JSON.stringify({
        goal,
        targetDate: targetDate || undefined,
      }),
    });

    return {
      plan: res.plan || `Plan for "${goal}"`,
      tasks: (res.tasks || []).map((t) => ({
        ...t,
        requiresConfirmation: true,
      })),
      source: res.source,
    };
  }

  /**
   * Detects actionable tasks, bills, appointments, and reminders from unstructured text
   */
  public async detectResponsibilities(text: string): Promise<DetectResponse> {
    const res = await apiClient.post<DetectResponse>(Endpoints.ai.detect, {
      body: JSON.stringify({ text }),
    });

    return {
      summary: res.summary || `Extracted ${res.detectedItems?.length || 0} suggestion(s).`,
      detectedItems: (res.detectedItems || []).map((item) => ({
        ...item,
        requiresConfirmation: true,
      })),
      source: res.source,
    };
  }

  /**
   * Creates a single confirmed item after explicit user review
   * Never called automatically without explicit confirmation.
   */
  public async executeAction(action: ProposedAction): Promise<ActionExecuteResponse> {
    const res = await apiClient.post<ActionExecuteResponse>(Endpoints.ai.executeAction, {
      body: JSON.stringify({
        confirmed: true,
        action,
      }),
    });

    return res;
  }

  /**
   * Creates multiple confirmed items in batch after explicit user review
   */
  public async acceptSuggestions(items: ProposedAction[]): Promise<AcceptSuggestionsResponse> {
    const res = await apiClient.post<AcceptSuggestionsResponse>(
      Endpoints.ai.acceptSuggestions,
      {
        body: JSON.stringify({
          confirmed: true,
          items,
        }),
      }
    );

    return res;
  }
}

export const aiService = new AIService();
export default aiService;

