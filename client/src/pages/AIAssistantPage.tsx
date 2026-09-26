import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import {
  Bot,
  Send,
  Sparkles,
  Loader2,
  FileSearch,
  ListTodo,
  Plus,
} from 'lucide-react';

interface SuggestedItem {
  type: 'task' | 'bill' | 'appointment' | 'reminder';
  title: string;
  dueDate?: string;
  priority?: string;
  amount?: number;
  provider?: string;
  selected?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: SuggestedItem[];
  timestamp: string;
}

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'plan' | 'detect'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your LifeAdmin AI Assistant. I have live access to your tasks, upcoming bills, appointments, documents, and reminders. How can I help you organize your life today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Planning Tab State
  const [planGoal, setPlanGoal] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState<{ plan: string; tasks: any[] } | null>(null);

  // Responsibility Detection Tab State
  const [detectText, setDetectText] = useState('');
  const [detectLoading, setDetectLoading] = useState(false);
  const [detectResult, setDetectResult] = useState<{ summary: string; detectedItems: any[] } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (msgText?: string) => {
    const textToSend = msgText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: textToSend,
        conversationId,
      });

      const assistantMsg: Message = {
        role: 'assistant',
        content: res.data.reply,
        suggestions: res.data.suggestions?.map((s: any) => ({ ...s, selected: true })),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.data.conversationId) setConversationId(res.data.conversationId);
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error checking your LifeAdmin data. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestions = async (items: SuggestedItem[]) => {
    try {
      await api.post('/ai/accept-suggestions', { items });
      alert(`Added ${items.length} items to your LifeAdmin workspace!`);
    } catch (err) {
      console.error('Accept suggestions error:', err);
      alert('Failed to save suggested items.');
    }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planGoal.trim()) return;

    setPlanLoading(true);
    try {
      const res = await api.post('/ai/plan', {
        goal: planGoal,
        targetDate: planDate || undefined,
      });
      setPlanResult(res.data);
    } catch (err) {
      console.error('Planning error:', err);
      alert('Failed to generate plan.');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleDetectResponsibilities = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectText.trim()) return;

    setDetectLoading(true);
    try {
      const res = await api.post('/ai/detect', { text: detectText });
      setDetectResult(res.data);
    } catch (err) {
      console.error('Detection error:', err);
      alert('Failed to detect responsibilities.');
    } finally {
      setDetectLoading(false);
    }
  };

  const quickPrompts = [
    'What do I need to do this week?',
    'What bills are due soon?',
    'Summarize my life admin status',
    'Help me plan exam preparation',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white">
              <Bot size={20} />
            </span>
            AI Copilot
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Query your responsibilities in natural language, generate action plans, and extract tasks from text.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
            }`}
          >
            Chat Copilot
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'plan'
                ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
            }`}
          >
            Planning Assistant
          </button>
          <button
            onClick={() => setActiveTab('detect')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'detect'
                ? 'bg-white dark:bg-surface-900 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
            }`}
          >
            Text Extractor
          </button>
        </div>
      </div>

      {/* TAB 1: Chat Assistant */}
      {activeTab === 'chat' && (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Chat message list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 max-w-2xl ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold ${
                    msg.role === 'user'
                      ? 'bg-surface-800 dark:bg-surface-700'
                      : 'bg-gradient-to-br from-primary-500 to-indigo-600'
                  }`}
                >
                  {msg.role === 'user' ? 'You' : <Bot size={16} />}
                </div>

                <div className="space-y-3 min-w-0">
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-tr-none'
                        : 'bg-surface-50 dark:bg-surface-800/80 text-surface-900 dark:text-surface-100 rounded-tl-none border border-surface-200/60 dark:border-surface-700/60 whitespace-pre-wrap'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Render suggestions if any */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="bg-surface-50 dark:bg-surface-800 rounded-xl p-3.5 border border-surface-200 dark:border-surface-700 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-primary-600 dark:text-primary-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles size={13} />
                          Recommended Items to Add
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {msg.suggestions.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-xs"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="font-medium text-surface-900 dark:text-surface-100">
                                {item.title}
                              </span>
                              <div className="text-surface-400 text-[11px] mt-0.5">
                                {item.type} {item.dueDate && `• Due: ${item.dueDate}`}{' '}
                                {item.priority && `• Priority: ${item.priority}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleAcceptSuggestions(msg.suggestions!)}
                        className="w-full mt-2 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} />
                        <span>Add All Suggested Items to Workspace</span>
                      </button>
                    </div>
                  )}

                  <span className="text-[10px] text-surface-400 px-1">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 max-w-2xl mr-auto">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white">
                  <Bot size={16} />
                </div>
                <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800 rounded-tl-none border border-surface-200 dark:border-surface-700 flex items-center gap-2 text-surface-500 text-sm">
                  <Loader2 size={16} className="animate-spin text-primary-500" />
                  <span>Thinking & querying your LifeAdmin data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-6 py-2 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] text-surface-400 font-medium whitespace-nowrap">Suggested:</span>
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:border-primary-500 whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask anything about your tasks, bills, schedule, or life admin..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputMessage.trim()}
              className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-40 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Planning Assistant */}
      {activeTab === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
            <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2 mb-2">
              <ListTodo size={20} className="text-primary-500" />
              Goal & Milestone Breakdown
            </h3>
            <p className="text-surface-500 text-xs mb-5">
              Enter any upcoming goal, exam, assignment set, or move. The assistant will structure a paced step-by-step task breakdown.
            </p>

            <form onSubmit={handleGeneratePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  What are you preparing for?
                </label>
                <input
                  type="text"
                  required
                  value={planGoal}
                  onChange={(e) => setPlanGoal(e.target.value)}
                  placeholder="e.g. Final Exams in Computer Science, Apartment Move-out, Tax Filing"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Target Deadline or Event Date
                </label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                />
              </div>

              <button
                type="submit"
                disabled={planLoading || !planGoal.trim()}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {planLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{planLoading ? 'Generating Roadmap...' : 'Generate Action Roadmap'}</span>
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 flex flex-col">
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 mb-2">
              Generated Action Plan
            </h3>
            {planResult ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-semibold mb-3">
                    {planResult.plan}
                  </p>
                  <div className="space-y-2">
                    {planResult.tasks.map((task, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-surface-900 dark:text-surface-100">
                            {task.title}
                          </p>
                          <p className="text-surface-400 mt-1">
                            Due: {task.dueDate} • Priority: {task.priority}
                          </p>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded">
                          Step {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleAcceptSuggestions(
                      planResult.tasks.map((t) => ({ ...t, type: 'task' as const }))
                    )
                  }
                  className="w-full mt-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  <span>Add All Tasks to LifeAdmin</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-surface-400">
                <ListTodo size={36} className="mb-2 opacity-50" />
                <p className="text-sm">Submit your goal on the left to see your personalized schedule breakdown.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Text Responsibility Detection */}
      {activeTab === 'detect' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6">
            <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2 mb-2">
              <FileSearch size={20} className="text-primary-500" />
              Syllabus & Email Extractor
            </h3>
            <p className="text-surface-500 text-xs mb-5">
              Paste email text, syllabus deadlines, lease clauses, or notes. The AI will detect actionable responsibilities, amounts, and dates.
            </p>

            <form onSubmit={handleDetectResponsibilities} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Raw Text or Notes
                </label>
                <textarea
                  rows={8}
                  required
                  value={detectText}
                  onChange={(e) => setDetectText(e.target.value)}
                  placeholder="Paste syllabus snippet, email from landlord, doctor reminder, or project requirements..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                />
              </div>

              <button
                type="submit"
                disabled={detectLoading || !detectText.trim()}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                {detectLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{detectLoading ? 'Detecting...' : 'Detect Actionable Items'}</span>
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 flex flex-col">
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 mb-2">
              Detected Action Items
            </h3>
            {detectResult ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-semibold mb-3">
                    {detectResult.summary}
                  </p>
                  <div className="space-y-2">
                    {detectResult.detectedItems.map((item, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-surface-900 dark:text-surface-100">
                            {item.title}
                          </p>
                          <p className="text-surface-400 mt-1">
                            Type: <span className="uppercase font-medium">{item.type}</span>{' '}
                            {item.dueDate && `• Due: ${item.dueDate}`}{' '}
                            {item.amount && `• Amount: $${item.amount}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleAcceptSuggestions(detectResult.detectedItems)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  <span>Accept & Save All Detected Items</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-surface-400">
                <FileSearch size={36} className="mb-2 opacity-50" />
                <p className="text-sm">Paste any text snippet on the left to extract structured responsibilities.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
