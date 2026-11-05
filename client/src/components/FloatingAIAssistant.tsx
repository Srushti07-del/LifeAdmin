import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  ExternalLink,
  Bot,
  User as UserIcon,
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface FloatingAIAssistantProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideMobileTrigger?: boolean;
}

export default function FloatingAIAssistant({
  isOpen: controlledOpen,
  onOpenChange,
  hideMobileTrigger = false,
}: FloatingAIAssistantProps) {
  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof controlledOpen === 'boolean';
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(isOpen) : next;
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  };
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your LifeAdmin assistant. How can I help you organize your tasks, bills, or schedule right now?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: text });
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.data.message || 'I have analyzed your current schedule. All responsibilities are recorded.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Demo / fallback response
      const fallbackMsg: ChatMessage = {
        role: 'assistant',
        content: "I'm monitoring your life-admin command center. In demo mode without an external API key, I can remind you to check your high-priority items under 'Needs Attention'!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'What is due soon?',
    'Summarize my upcoming bills',
    'Plan my priorities for today',
  ];

  return (
    <>
      {/* Persistent Floating Action Trigger (desktop unchanged; mobile moved to header when requested) */}
      <div
        className={`fixed right-4 sm:right-5 z-40 ${hideMobileTrigger ? 'hidden lg:block' : ''}`}
        style={{ bottom: hideMobileTrigger ? '1.25rem' : 'calc(5.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 rounded-full shadow-elevated transition-all duration-200 active:scale-95 ${
            hideMobileTrigger ? 'px-4 py-3' : 'p-3 sm:px-4 sm:py-3'
          } ${
            isOpen
              ? 'bg-[#285968] text-[#F1F7F7] dark:bg-[#285968] dark:text-[#F1F7F7]'
              : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white dark:text-[#183B4A] hover:shadow-modal'
          }`}
          aria-label="Toggle AI Assistant"
          aria-expanded={isOpen}
        >
          <Sparkles size={18} />
          <span className={`${hideMobileTrigger ? 'inline' : 'hidden sm:inline'} text-xs font-semibold tracking-wide`}>AI Assistant</span>
        </button>
      </div>

      {/* Slide-out Assistant Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-[#204B5A] border-l border-surface-200 dark:border-[#355966] shadow-modal flex flex-col animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-[#355966]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 font-editorial">
                  LifeAdmin Assistant
                </h3>
                <p className="text-[11px] text-surface-500">Always here to organize</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/ai');
                }}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
                title="Open full AI workspace"
              >
                <ExternalLink size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
                title="Close drawer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${m.role === 'user'
                      ? 'bg-primary-500 text-white rounded-br-xs'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-bl-xs'
                    }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <span
                    className={`block text-[10px] mt-1 text-right ${m.role === 'user' ? 'text-primary-50/90' : 'text-surface-500'
                      }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
                {m.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <UserIcon size={14} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-surface-400 py-1">
                <Loader2 size={14} className="animate-spin text-primary-500" />
                <span className="text-[11px]">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-surface-100 dark:border-surface-800 flex flex-wrap gap-1.5">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-surface-100 dark:border-[#355966] bg-surface-50/50 dark:bg-[#285968]/50 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your life admin..."
              className="flex-1 bg-white dark:bg-surface-0 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

