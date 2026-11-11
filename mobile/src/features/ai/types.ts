/**
 * LifeAdmin Mobile — AI Assistant Type Definitions
 * Aligned with server routes /server/src/routes/ai.ts and client/src/pages/AIAssistantPage.tsx
 */

export type ActionType = 'task' | 'bill' | 'appointment' | 'reminder';

export interface ProposedAction {
  _id?: string;
  id?: string;
  type: ActionType;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  date?: string;
  time?: string;
  amount?: number;
  currency?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  location?: string;
  provider?: string;
  status?: string;
  confidence?: 'high' | 'medium' | 'low';
  requiresConfirmation?: boolean;
  confirmationText?: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  proposedActions?: ProposedAction[];
  suggestions?: ProposedAction[];
  source?: 'ai' | 'fallback';
}

export interface ConversationSummary {
  id: string;
  updatedAt: string;
  preview: string;
}

export interface ConversationDetail {
  id: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

export interface PlanResponse {
  plan: string;
  tasks: ProposedAction[];
  source?: string;
}

export interface DetectResponse {
  summary: string;
  detectedItems: ProposedAction[];
  source?: string;
}

export interface ActionExecuteResponse {
  message: string;
  result?: {
    type: ActionType;
    id: string;
    title: string;
  };
}

export interface AcceptSuggestionsResponse {
  message: string;
  results?: Array<{
    type: ActionType;
    item: any;
  }>;
}

