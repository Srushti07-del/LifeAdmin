import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { COMPANIONS, getCompanionStorage, saveCompanionStorage, getGrowthStage } from '../lib/companions';
import type { Companion, CompanionState } from '../lib/companions';
import CompanionAvatar from '../components/companions/CompanionAvatar';
import { Card } from '../components/ui/Card';
import { Edit2, Check, Heart, ShieldCheck, Zap, Info, Award, Bot, ArrowRight, Sparkles } from 'lucide-react';

const BUDDY_PROMPTS = [
  'What should I focus on today?',
  'Summarize my upcoming deadlines',
  'What bills are overdue?',
  'Help me plan my week',
];

function contextualLine(name: string, personality: string) {
  const hour = new Date().getHours();
  const moment = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  return `${name} is here this ${moment}. ${personality.split(',')[0] || 'Ready to help'} - I can check your real tasks, bills, appointments, and reminders whenever you ask.`;
}

export default function LifeBuddyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companionState, setCompanionState] = useState<CompanionState>(getCompanionStorage);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(companionState.customName);
  const [selectedModalCompanion, setSelectedModalCompanion] = useState<Companion | null>(null);

  useEffect(() => { setCompanionState(getCompanionStorage()); }, []);
  useEffect(() => {
    if (user?.companion) {
      setCompanionState(user.companion);
      setNameInput(user.companion.customName);
    }
  }, [user?.companion]);
  const activeCompanion = COMPANIONS.find((c) => c.id === companionState.activeId) || COMPANIONS[0];
  const stage = getGrowthStage(companionState.level);
  const buddyLine = useMemo(() => contextualLine(companionState.customName, activeCompanion.personality), [companionState.customName, activeCompanion.personality]);

  const handleSaveName = () => {
    if (!nameInput.trim()) return;
    const updated = { ...companionState, customName: nameInput.trim() };
    setCompanionState(updated); saveCompanionStorage(updated); setEditingName(false);
  };
  const handleSwitchCompanion = (id: string) => {
    const target = COMPANIONS.find((c) => c.id === id);
    if (!target) return;
    const updated: CompanionState = { ...companionState, activeId: id, customName: target.defaultName };
    setCompanionState(updated); setNameInput(target.defaultName); saveCompanionStorage(updated); setSelectedModalCompanion(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-surface-100 dark:border-[#304247]">
        <div>
          <div className="flex items-center gap-2 mb-1"><span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">Companion + Assistant</span></div>
          <h1 className="text-3xl sm:text-4xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">LifeBuddy Sanctuary</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-2xl leading-relaxed">Original virtual companions for positive reinforcement, paired with a practical assistant that can answer using your real LifeAdmin data. No guilt, no pressure.</p>
        </div>
        <button type="button" onClick={() => navigate('/ai')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-xs"><Bot size={16} /> Open LifeBuddy Chat <ArrowRight size={14} /></button>
      </div>

      <Card hover={false} className="p-5 sm:p-6 border-primary-200/60 dark:border-surface-700 bg-gradient-to-r from-primary-50/60 to-transparent dark:from-transparent dark:to-transparent dark:bg-surface-0">
        <div className="flex flex-col md:flex-row gap-4 md:items-start">
          <div className="w-11 h-11 rounded-2xl bg-primary-600 text-white flex items-center justify-center shrink-0"><Sparkles size={20} /></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-surface-900 dark:text-surface-100">{buddyLine}</h2>
            <p className="text-xs text-surface-600 dark:text-surface-300 mt-1">" {activeCompanion.quote} "</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUDDY_PROMPTS.map((p) => (
                <button key={p} type="button" onClick={() => navigate('/ai', { state: { prompt: p } })} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-white dark:bg-[#1C292D] border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:border-primary-500 transition-colors">{p}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="bg-white dark:bg-surface-0 rounded-3xl p-6 sm:p-8 border border-surface-200 dark:border-surface-700 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
            <CompanionAvatar id={activeCompanion.id} size="xl" className="mb-4" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-surface-0 shadow-xs border border-surface-200 dark:border-surface-700 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="font-semibold text-surface-800 dark:text-surface-200">Active & Thriving</span></div>
          </div>
          <div className="md:col-span-7 space-y-5">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="text-2xl font-bold font-editorial text-surface-900 dark:text-surface-100 px-2 py-0.5 border border-primary-500 rounded-xl bg-white dark:bg-surface-0 focus:outline-none" />
                    <button onClick={handleSaveName} className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600" aria-label="Save name"><Check size={16} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">{companionState.customName}</h2>
                    <button onClick={() => setEditingName(true)} className="p-1 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200" title="Rename companion" aria-label="Rename companion"><Edit2 size={16} /></button>
                  </div>
                )}
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">Level {companionState.level} · {stage}</span>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{activeCompanion.title} · {activeCompanion.species} ({activeCompanion.element} Element)</p>
            </div>
            <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed italic bg-white/70 dark:bg-surface-0/60 p-3.5 rounded-2xl border border-surface-200/60 dark:border-surface-700/60">&ldquo;{activeCompanion.quote}&rdquo;</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="font-semibold text-surface-700 dark:text-surface-300">Growth Progress</span><span className="text-surface-400">{companionState.xp % 200} / 200 XP to next level</span></div>
              <div className="h-2.5 w-full bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((companionState.xp % 200) / 200) * 100)}%` }} /></div>
              <p className="text-[11px] text-surface-400">XP is earned naturally by completing tasks, paying bills on time, and staying organized.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Stat icon={Award} tone="text-amber-500" value={stage} label="Stage" />
              <Stat icon={Zap} tone="text-primary-500" value={String(companionState.xp)} label="Total XP" />
              <Stat icon={Heart} tone="text-rose-500" value="100%" label="Well-being" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div><h3 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">Companion Collection</h3><p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Choose your active partner or inspect another spirit.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPANIONS.map((companion) => {
            const isActive = companion.id === companionState.activeId;
            return (
              <div key={companion.id} className={`bg-white dark:bg-surface-0 rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between ${isActive ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-elevated' : 'border-surface-200 dark:border-surface-700 hover:shadow-card'}`}>
                <div>
                  <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">{companion.element}</span>{isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">Active</span>}</div>
                  <CompanionAvatar id={companion.id} size="lg" className="mx-auto my-3" />
                  <div className="text-center"><h4 className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100">{companion.name}</h4><p className="text-[11px] text-surface-500 dark:text-surface-400">{companion.title}</p><p className="text-xs text-surface-600 dark:text-surface-400 mt-2 line-clamp-2 leading-relaxed">{companion.bio}</p></div>
                </div>
                <div className="pt-4 border-t border-surface-100 dark:border-surface-800 mt-4 flex gap-2">
                  <button onClick={() => setSelectedModalCompanion(companion)} className="flex-1 py-2 text-xs font-medium rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 transition-colors flex items-center justify-center gap-1"><Info size={13} /> Details</button>
                  {!isActive && <button onClick={() => handleSwitchCompanion(companion.id)} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-primary-500 hover:bg-primary-600 text-white transition-colors">Adopt</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-surface-50/60 dark:bg-surface-900/30 border border-surface-200 dark:border-surface-800 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5"><ShieldCheck size={22} /></div>
        <div><h4 className="text-sm font-bold font-editorial text-surface-900 dark:text-surface-100">LifeBuddy Guilt-Free Philosophy</h4><p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">Life gets busy. Your LifeBuddy will never become sick, sad, or disappear if you take a break. When you return, your companion welcomes you back warmly. The assistant gives practical help, but it never replaces your choices or silently changes your data.</p></div>
      </div>

      {selectedModalCompanion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-xs animate-fade-in" onClick={() => setSelectedModalCompanion(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-0 rounded-3xl border border-surface-200 dark:border-surface-700 p-6 shadow-modal z-10 animate-scale-in text-center">
            <CompanionAvatar id={selectedModalCompanion.id} size="xl" className="mx-auto mb-4" />
            <h3 className="text-xl font-bold font-editorial text-surface-900 dark:text-surface-100">{selectedModalCompanion.name}</h3>
            <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{selectedModalCompanion.title}</p>
            <div className="mt-4 p-4 rounded-2xl bg-surface-50 dark:bg-surface-900/50 text-left space-y-2 text-xs">
              <p><span className="font-semibold text-surface-800 dark:text-surface-200">Species:</span> <span className="text-surface-500 dark:text-surface-400">{selectedModalCompanion.species}</span></p>
              <p><span className="font-semibold text-surface-800 dark:text-surface-200">Element:</span> <span className="text-surface-500 dark:text-surface-400">{selectedModalCompanion.element}</span></p>
              <p><span className="font-semibold text-surface-800 dark:text-surface-200">Personality:</span> <span className="text-surface-500 dark:text-surface-400">{selectedModalCompanion.personality}</span></p>
              <p className="pt-1 text-surface-600 dark:text-surface-400 leading-relaxed border-t border-surface-200 dark:border-surface-800">{selectedModalCompanion.bio}</p>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setSelectedModalCompanion(null)} className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-xs font-medium hover:bg-surface-100 dark:hover:bg-surface-800">Close</button>
              {selectedModalCompanion.id !== companionState.activeId && <button onClick={() => handleSwitchCompanion(selectedModalCompanion.id)} className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold">Make Active</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, tone, value, label }: { icon: any; tone: string; value: string; label: string }) {
  return (
    <div className="p-3 rounded-2xl bg-white dark:bg-surface-0 border border-surface-200 dark:border-surface-700 text-center">
      <Icon size={16} className={`${tone} mx-auto mb-1`} />
      <span className="text-base font-bold font-editorial text-surface-900 dark:text-surface-100 block">{value}</span>
      <span className="text-[10px] text-surface-400">{label}</span>
    </div>
  );
}

