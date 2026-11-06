import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';
import {
  Bot, Send, Sparkles, Loader2, FileSearch, ListTodo, Plus, History,
  AlertTriangle, CheckCircle2, CalendarClock, Receipt, Bell, FileText, X,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

type ActionType = 'task' | 'bill' | 'appointment' | 'reminder';
interface ProposedAction {
  type: ActionType; title: string; description?: string; dueDate?: string; dueTime?: string;
  date?: string; time?: string; amount?: number; currency?: string; priority?: string;
  requiresConfirmation?: boolean; confirmationText?: string; status?: string;
}
interface Message {
  role: 'user' | 'assistant'; content: string; suggestions?: ProposedAction[];
  proposedActions?: ProposedAction[]; timestamp: string; source?: string;
}
interface ConversationSummary { id: string; updatedAt: string; preview: string; }

const SUGGESTED_PROMPTS = [
  'What should I focus on today?',
  'What deadlines are approaching this week?',
  'What bills are overdue?',
  'What do I have scheduled this week?',
  'Create a reminder to review my bills tomorrow at 10:00',
];

function fmtTime(d?: string | Date) {
  const dt = d ? new Date(d) : new Date();
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function typeIcon(type?: string) {
  if (type === 'bill') return Receipt;
  if (type === 'appointment') return CalendarClock;
  if (type === 'reminder') return Bell;
  if (type === 'document') return FileText;
  return ListTodo;
}

export default function AIAssistantPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'chat' | 'plan' | 'detect'>('chat');
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "Hi - I'm LifeBuddy. I can answer using your real tasks, bills, appointments, reminders, and documents, help you prioritize, and prepare actions (with your confirmation before saving anything).",
    timestamp: fmtTime(),
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ProposedAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [planGoal, setPlanGoal] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState<{ plan: string; tasks: ProposedAction[]; source?: string } | null>(null);

  const [detectText, setDetectText] = useState('');
  const [detectLoading, setDetectLoading] = useState(false);
  const [detectResult, setDetectResult] = useState<{ summary: string; detectedItems: ProposedAction[]; source?: string } | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => {
    const prompt = (location.state as any)?.prompt;
    if (typeof prompt === 'string' && prompt.trim()) {
      handleSendMessage(prompt);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConversations = async () => {
    setHistoryLoading(true);
    try { const res = await api.get('/ai/conversations'); setConversations(res.data.conversations || []); }
    catch { /* history optional */ }
    finally { setHistoryLoading(false); }
  };
  const openConversation = async (id: string) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/ai/conversations/${id}`);
      const c = res.data.conversation;
      setConversationId(c.id);
      setMessages((c.messages || []).map((m: any) => ({ role: m.role, content: m.content, timestamp: fmtTime(m.timestamp) })));
      setHistoryOpen(false); setChatError('');
    } catch (e: any) { setChatError(e?.response?.data?.message || 'Failed to load conversation.'); }
    finally { setHistoryLoading(false); }
  };
  const startNewChat = () => {
    setConversationId(null); setChatError('');
    setMessages([{ role: 'assistant', content: "Starting fresh. Ask about your schedule, overdue items, bills, or ask me to prepare a reminder/task/appointment (I'll confirm before saving).", timestamp: fmtTime() }]);
  };

  const handleSendMessage = async (msgText?: string) => {
    const textToSend = (msgText ?? inputMessage).trim();
    if (!textToSend || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: textToSend, timestamp: fmtTime() }]);
    setInputMessage(''); setLoading(true); setChatError('');
    try {
      const res = await api.post('/ai/chat', { message: textToSend, conversationId });
      const proposed = (res.data.proposedActions || res.data.suggestions || []).map((s: any) => ({ ...s, currency: s.currency || '₹', requiresConfirmation: true }));
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply || 'I could not generate a response right now.', proposedActions: proposed, suggestions: proposed, timestamp: fmtTime(), source: res.data.source }]);
      if (res.data.conversationId) setConversationId(res.data.conversationId);
    } catch (err: any) {
      setChatError(err?.response?.data?.message || 'LifeBuddy is unavailable right now. Please try again.');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'I could not reach the assistant service just now. Your data is still safe; please try again in a moment.', timestamp: fmtTime() }]);
    } finally { setLoading(false); }
  };

  const executeAction = async (action: ProposedAction) => {
    setActionBusy(true); setChatError('');
    try {
      const res = await api.post('/ai/actions/execute', { confirmed: true, action });
      setMessages((prev) => [...prev, { role: 'assistant', content: `Done - ${res.data.message || `created ${action.type}`}.`, timestamp: fmtTime() }]);
      setConfirmAction(null);
    } catch (err: any) { setChatError(err?.response?.data?.message || 'Failed to create the item. No data was changed.'); }
    finally { setActionBusy(false); }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault(); if (!planGoal.trim()) return;
    setPlanLoading(true); setChatError('');
    try { const res = await api.post('/ai/plan', { goal: planGoal, targetDate: planDate || undefined }); setPlanResult({ ...res.data, tasks: (res.data.tasks || []).map((t: any) => ({ ...t, requiresConfirmation: true })) }); }
    catch (err: any) { setChatError(err?.response?.data?.message || 'Failed to generate plan.'); }
    finally { setPlanLoading(false); }
  };
  const handleDetectResponsibilities = async (e: React.FormEvent) => {
    e.preventDefault(); if (!detectText.trim()) return;
    setDetectLoading(true); setChatError('');
    try { const res = await api.post('/ai/detect', { text: detectText }); setDetectResult({ ...res.data, detectedItems: (res.data.detectedItems || []).map((t: any) => ({ ...t, requiresConfirmation: true })) }); }
    catch (err: any) { setChatError(err?.response?.data?.message || 'Failed to detect items.'); }
    finally { setDetectLoading(false); }
  };
  const acceptSuggestionsBulk = async (items: ProposedAction[]) => {
    if (!items.length) return;
    setActionBusy(true); setChatError('');
    try { const res = await api.post('/ai/accept-suggestions', { confirmed: true, items }); setMessages((prev) => [...prev, { role: 'assistant', content: res.data.message || `Created ${items.length} item(s).`, timestamp: fmtTime() }]); }
    catch (err: any) { setChatError(err?.response?.data?.message || 'Failed to create suggested items.'); }
    finally { setActionBusy(false); }
  };

  const showEmptyPrompts = useMemo(() => messages.length <= 1 && !loading, [messages.length, loading]);

  return (
    <div className="space-y-5 pb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-surface-100 dark:border-[#355966]">
        <div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-xs"><Bot size={18} /></span>
            LifeBuddy Assistant
          </h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Answers use your authenticated LifeAdmin data. Actions require confirmation before saving.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => { setHistoryOpen(true); loadConversations(); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800"><History size={14} /> History</button>
          <button type="button" onClick={startNewChat} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800"><Plus size={14} /> New chat</button>
        </div>
      </div>

      <div className="flex items-center bg-surface-100 dark:bg-surface-800 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
        {([
          ['chat', 'Chat', Bot], ['plan', 'Planner', ListTodo], ['detect', 'Text Extractor', FileSearch],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeTab === id ? 'bg-white dark:bg-[#204B5A] text-primary-700 dark:text-primary-300 shadow-sm' : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {chatError && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs text-amber-900 dark:text-amber-100">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><div className="flex-1">{chatError}</div>
          <button type="button" onClick={() => setChatError('')} className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30" aria-label="Dismiss error"><X size={14} /></button>
        </div>
      )}

      {activeTab === 'chat' && (
        <Card className="p-0 overflow-hidden flex flex-col h-[min(72vh,680px)]" hover={false}>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {showEmptyPrompts && (
              <div className="rounded-2xl border border-dashed border-surface-200 dark:border-[#355966] bg-surface-50/60 dark:bg-surface-900/20 p-4">
                <p className="text-xs font-semibold text-surface-800 dark:text-surface-100 mb-2">Try asking</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button key={p} type="button" onClick={() => handleSendMessage(p)} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-white dark:bg-[#204B5A] border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:border-primary-500 transition-colors text-left">{p}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, index) => {
              const actions = msg.proposedActions || msg.suggestions || [];
              return (
                <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5"><Bot size={15} /></div>}
                  <div className={`max-w-[92%] sm:max-w-[78%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-surface-50 dark:bg-surface-800/70 text-surface-900 dark:text-surface-100 rounded-bl-sm border border-surface-200/70 dark:border-surface-700/60'}`}>{msg.content}</div>
                    {actions.length > 0 && (
                      <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-[#204B5A] p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-700 dark:text-primary-300"><Sparkles size={13} /> Proposed actions (confirmation required)</div>
                        {actions.map((item, idx) => {
                          const Icon = typeIcon(item.type);
                          return (
                            <div key={idx} className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-700">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5"><Icon size={13} className="text-surface-500 shrink-0" /><span className="text-xs font-semibold text-surface-900 dark:text-surface-100">{item.title}</span></div>
                                <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">{item.type}{item.dueDate ? ` · ${item.dueDate}` : item.date ? ` · ${item.date}` : ''}{item.dueTime ? ` ${item.dueTime}` : item.time ? ` ${item.time}` : ''}{item.amount != null ? ` · ${item.currency || '₹'}${item.amount}` : ''}</p>
                              </div>
                              <button type="button" onClick={() => setConfirmAction(item)} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold">Review & confirm</button>
                            </div>
                          );
                        })}
                        {actions.length > 1 && <p className="text-[10px] text-surface-500 dark:text-surface-400">To keep actions safe, confirm each item individually.</p>}
                      </div>
                    )}
                    <span className="block text-[10px] text-surface-400 px-1">{msg.timestamp}{msg.source === 'fallback' ? ' · local summary' : ''}</span>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex gap-3"><div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shrink-0"><Bot size={15} /></div><div className="px-4 py-3 rounded-2xl bg-surface-50 dark:bg-surface-800/70 border border-surface-200 dark:border-surface-700 text-xs text-surface-600 dark:text-surface-300 inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin text-primary-500" /> Checking your LifeAdmin data...</div></div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 sm:p-4 border-t border-surface-100 dark:border-[#355966] bg-white dark:bg-[#204B5A]">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
              <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="Ask about tasks, bills, appointments, reminders, documents..." className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500" aria-label="Message LifeBuddy" />
              <button type="submit" disabled={loading || !inputMessage.trim()} className="px-3.5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-40 transition-colors" aria-label="Send message"><Send size={18} /></button>
            </form>
          </div>
        </Card>
      )}

      {activeTab === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card hover={false}><h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2 mb-1"><ListTodo size={18} className="text-primary-500" /> Goal planner</h3><p className="text-xs text-surface-500 dark:text-surface-400 mb-4">Generates suggested tasks only. You confirm before anything is created.</p>
            <form onSubmit={handleGeneratePlan} className="space-y-3">
              <label className="block"><span className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">Goal</span><input type="text" required value={planGoal} onChange={(e) => setPlanGoal(e.target.value)} placeholder="e.g. Prepare for final exams" className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100" /></label>
              <label className="block"><span className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">Target date (optional)</span><input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100" /></label>
              <button type="submit" disabled={planLoading || !planGoal.trim()} className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">{planLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {planLoading ? 'Generating...' : 'Generate plan'}</button>
            </form>
          </Card>
          <Card hover={false} className="flex flex-col"><h3 className="text-base font-bold text-surface-900 dark:text-surface-100 mb-2">Suggested plan</h3>
            {planResult ? (<div className="space-y-3 flex-1"><p className="text-xs text-surface-600 dark:text-surface-300">{planResult.plan} {planResult.source === 'template' && <Badge variant="neutral" size="sm">template</Badge>}</p><div className="space-y-2">{planResult.tasks.map((t, i) => (<div key={i} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs"><p className="font-semibold text-surface-900 dark:text-surface-100">{t.title}</p><p className="text-surface-500 mt-0.5">{t.dueDate ? `Due ${t.dueDate}` : 'No date'} · {t.priority || 'medium'}</p><button type="button" onClick={() => setConfirmAction(t)} className="mt-2 px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold">Review & confirm</button></div>))}</div>{planResult.tasks.length > 1 && <button type="button" disabled={actionBusy} onClick={() => acceptSuggestionsBulk(planResult.tasks)} className="w-full py-2 rounded-xl border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 text-xs font-semibold hover:bg-primary-50 dark:hover:bg-primary-950/30 disabled:opacity-50">{actionBusy ? 'Creating...' : 'Confirm & add all tasks'}</button>}</div>) : <div className="flex-1 flex items-center justify-center text-center text-xs text-surface-500 py-10"><div><ListTodo size={30} className="mx-auto mb-2 opacity-40" />Submit a goal to see suggested steps.</div></div>}
          </Card>
        </div>
      )}

      {activeTab === 'detect' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card hover={false}><h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2 mb-1"><FileSearch size={18} className="text-primary-500" /> Text extractor</h3><p className="text-xs text-surface-500 dark:text-surface-400 mb-4">Paste notes/email/syllabus text. Detected items are suggestions only and must be confirmed before saving.</p>
            <form onSubmit={handleDetectResponsibilities} className="space-y-3">
              <label className="block"><span className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">Text to analyze</span><textarea rows={9} required value={detectText} onChange={(e) => setDetectText(e.target.value)} placeholder="Paste text with dates, deadlines, or amounts..." className="w-full px-3.5 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100 resize-y" /></label>
              <button type="submit" disabled={detectLoading || !detectText.trim()} className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">{detectLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {detectLoading ? 'Analyzing...' : 'Detect items'}</button>
            </form>
          </Card>
          <Card hover={false} className="flex flex-col"><h3 className="text-base font-bold text-surface-900 dark:text-surface-100 mb-2">Detected suggestions</h3>
            {detectResult ? (<div className="space-y-3 flex-1"><p className="text-xs text-surface-600 dark:text-surface-300">{detectResult.summary}</p><div className="space-y-2">{detectResult.detectedItems.map((item, i) => (<div key={i} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs"><p className="font-semibold text-surface-900 dark:text-surface-100">{item.title}</p><p className="text-surface-500 mt-0.5">{item.type}{item.dueDate ? ` · ${item.dueDate}` : ''}{item.amount != null ? ` · ${item.currency || '₹'}${item.amount}` : ''}{(item as any).confidence ? ` · ${(item as any).confidence}` : ''}</p><button type="button" onClick={() => setConfirmAction(item)} className="mt-2 px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold">Review & confirm</button></div>))}{detectResult.detectedItems.length === 0 && <p className="text-xs text-surface-500">No items to add.</p>}</div></div>) : <div className="flex-1 flex items-center justify-center text-center text-xs text-surface-500 py-10"><div><FileSearch size={30} className="mx-auto mb-2 opacity-40" />Paste text to extract potential responsibilities.</div></div>}
          </Card>
        </div>
      )}

      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Chat history" description="Recent LifeBuddy conversations for this account." maxWidth="md" panelClassName="rounded-3xl dark:border-[#355966]" headerClassName="border-surface-100 dark:border-[#355966]" contentClassName="pt-4 pb-0">
        {historyLoading ? <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-primary-500" /></div> : conversations.length ? (
          <div className="space-y-2">{conversations.map((c) => (<button key={c.id} type="button" onClick={() => openConversation(c.id)} className="w-full text-left p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800"><p className="text-xs font-medium text-surface-900 dark:text-surface-100 line-clamp-2">{c.preview}</p><p className="text-[10px] text-surface-500 mt-1">{new Date(c.updatedAt).toLocaleString()}</p></button>))}</div>
        ) : <p className="text-xs text-surface-500 py-6 text-center">No saved conversations yet.</p>}
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => !actionBusy && setConfirmAction(null)} title="Confirm action" description="LifeBuddy can prepare actions, but nothing is saved until you confirm." maxWidth="md" panelClassName="rounded-3xl dark:border-[#355966]" headerClassName="border-surface-100 dark:border-[#355966]" contentClassName="pt-4 pb-0">
        {confirmAction && (
          <div className="space-y-3 text-sm">
            <div className="rounded-2xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-surface-500">Type</span><Badge variant="primary" size="sm">{confirmAction.type}</Badge></div>
              <div><span className="text-xs font-semibold uppercase tracking-wide text-surface-500">Title</span><p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{confirmAction.title}</p></div>
              {(confirmAction.dueDate || confirmAction.date) && <div><span className="text-xs font-semibold uppercase tracking-wide text-surface-500">Date</span><p className="text-sm text-surface-800 dark:text-surface-200">{confirmAction.dueDate || confirmAction.date}{confirmAction.dueTime || confirmAction.time ? ` ${confirmAction.dueTime || confirmAction.time}` : ''}</p></div>}
              {confirmAction.amount != null && <div><span className="text-xs font-semibold uppercase tracking-wide text-surface-500">Amount</span><p className="text-sm text-surface-800 dark:text-surface-200">{confirmAction.currency || '₹'}{confirmAction.amount}</p></div>}
              {confirmAction.description && <div><span className="text-xs font-semibold uppercase tracking-wide text-surface-500">Details</span><p className="text-sm text-surface-700 dark:text-surface-300">{confirmAction.description}</p></div>}
            </div>
            <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 rounded-xl p-3"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>Review details carefully. This creates a new {confirmAction.type} in your account. Destructive actions are not auto-executed.</span></div>
            <div className="pt-2 border-t border-surface-100 dark:border-[#355966] flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmAction(null)} disabled={actionBusy} className="px-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200">Cancel</button>
              <button type="button" onClick={() => executeAction(confirmAction)} disabled={actionBusy} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold disabled:opacity-50">{actionBusy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Confirm & create</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
