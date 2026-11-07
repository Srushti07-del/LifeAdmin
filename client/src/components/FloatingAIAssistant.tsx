import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Sparkles, X, Send, Loader2, ExternalLink, Bot, User as UserIcon } from 'lucide-react';

interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp: string; }
interface FloatingAIAssistantProps { isOpen?: boolean; onOpenChange?: (open: boolean) => void; hideMobileTrigger?: boolean; }

export default function FloatingAIAssistant({ isOpen: controlledOpen, onOpenChange, hideMobileTrigger = false }: FloatingAIAssistantProps) {
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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi - I'm LifeBuddy. Ask about your tasks, bills, appointments, reminders, or what to focus on. I'll use your real LifeAdmin data.", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setInput(''); setLoading(true);
    try {
      const res = await api.post('/ai/chat', { message: text, conversationId });
      if (res.data.conversationId) setConversationId(res.data.conversationId);
      const proposed = res.data.proposedActions || res.data.suggestions || [];
      const suffix = proposed.length ? '\n\nI can prepare actions, but I only save them after you confirm in the full Assistant.' : '';
      setMessages((prev) => [...prev, { role: 'assistant', content: `${res.data.reply || 'I could not generate a response.'}${suffix}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'I could not reach the assistant right now. Please try again, or open the full AI Assistant page.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally { setLoading(false); }
  };

  const samplePrompts = ['What should I focus on today?', 'What bills are overdue?', 'What do I have this week?'];

  return (
    <>
      <div className={`fixed right-4 sm:right-5 z-40 ${hideMobileTrigger ? 'hidden lg:block' : ''}`} style={{ bottom: hideMobileTrigger ? '1.25rem' : 'calc(5.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2.5 rounded-full shadow-elevated transition-all duration-200 active:scale-95 ${hideMobileTrigger ? 'px-4 py-3' : 'p-3 sm:px-4 sm:py-3'} ${isOpen ? 'bg-[#243438] text-[#E8F0F0]' : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white dark:text-[#101719] hover:shadow-modal'}`} aria-label="Toggle AI Assistant" aria-expanded={isOpen}>
          <Sparkles size={18} /><span className={`${hideMobileTrigger ? 'inline' : 'hidden sm:inline'} text-xs font-semibold tracking-wide`}>LifeBuddy</span>
        </button>
      </div>
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-[#1C292D] border-l border-surface-200 dark:border-[#304247] shadow-modal flex flex-col animate-slide-in-right">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-[#304247]">
            <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center"><Bot size={18} /></div><div><h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 font-editorial">LifeBuddy</h3><p className="text-[11px] text-surface-500 dark:text-surface-400">Uses your real data; confirms actions</p></div></div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setIsOpen(false); navigate('/ai'); }} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800" title="Open full AI workspace"><ExternalLink size={16} /></button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800" title="Close drawer"><X size={18} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && <div className="w-6 h-6 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot size={14} /></div>}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${m.role === 'user' ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-200 rounded-bl-sm'}`}><p className="whitespace-pre-wrap">{m.content}</p><span className={`block text-[10px] mt-1 text-right ${m.role === 'user' ? 'text-primary-50/90' : 'text-surface-500'}`}>{m.timestamp}</span></div>
                {m.role === 'user' && <div className="w-6 h-6 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300 flex items-center justify-center flex-shrink-0 mt-0.5"><UserIcon size={14} /></div>}
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-surface-400 py-1"><Loader2 size={14} className="animate-spin text-primary-500" /><span className="text-[11px]">Checking your data...</span></div>}
            <div ref={messagesEndRef} />
          </div>
          {messages.length <= 2 && <div className="px-4 py-2 border-t border-surface-100 dark:border-surface-800 flex flex-wrap gap-1.5">{samplePrompts.map((p) => <button key={p} type="button" onClick={() => handleSend(p)} className="text-[11px] px-2.5 py-1 rounded-full bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 transition-colors">{p}</button>)}</div>}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-surface-100 dark:border-[#304247] bg-surface-50/50 dark:bg-[#243438]/50 flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask LifeBuddy..." className="flex-1 bg-white dark:bg-surface-0 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500" aria-label="Ask LifeBuddy" />
            <button type="submit" disabled={!input.trim() || loading} className="px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white transition-colors" aria-label="Send"><Send size={14} /></button>
          </form>
        </div>
      )}
    </>
  );
}


