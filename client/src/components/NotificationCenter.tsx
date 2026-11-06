import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, X, Loader2, AlertCircle, Clock } from 'lucide-react';
import api from '../lib/api';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'reminder' | 'deadline' | 'overdue' | 'ai_suggestion' | 'system';
  entityType?: string;
  entityId?: string;
  read: boolean;
  createdAt: string;
}

const POLL_MS = 60 * 1000;

function entityPath(n: NotificationItem): string | null {
  if (n.entityType === 'reminder') return '/reminders';
  if (n.entityType === 'bill') return '/bills';
  if (n.entityType === 'task') return '/tasks';
  if (n.entityType === 'appointment') return '/appointments';
  if (n.entityType === 'document') return '/documents';
  return null;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationCenter({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(Number(res.data.unreadCount) || 0);
    } catch {
      // silent: count poll should not disturb UI
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/notifications', { params: { limit: 20 } });
      setItems(res.data.notifications || []);
      setUnreadCount(Number(res.data.unreadCount) || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, POLL_MS);
    return () => clearInterval(t);
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchItems();
  }, [open, fetchItems]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };
  const dismiss = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/dismiss`);
      setItems((prev) => prev.filter((n) => n._id !== id));
      fetchCount();
    } catch {}
  };
  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-[#285968]/70 transition-colors"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-[#143440]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,380px)] max-h-[70vh] bg-white dark:bg-[#204B5A] rounded-2xl shadow-elevated border border-surface-200 dark:border-[#355966] z-50 overflow-hidden flex flex-col animate-scale-in" role="dialog" aria-label="Notification center">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 dark:border-[#355966]">
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">Notifications</h3>
              <p className="text-[11px] text-surface-500 dark:text-surface-400">In-app alerts (server-running)</p>
            </div>
            {items.some((n) => !n.read) && (
              <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 dark:text-primary-200 hover:underline">
                <CheckCheck size={14} /> Read all
              </button>
            )}
          </div>

          <div className="overflow-y-auto p-2 space-y-1.5">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-surface-500 dark:text-surface-400"><Loader2 size={16} className="animate-spin" /> Loading...</div>
            )}
            {!loading && error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-200 text-xs"><AlertCircle size={15} className="mt-0.5 shrink-0" />{error}</div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="py-10 text-center text-xs text-surface-500 dark:text-surface-400">
                <Bell size={24} className="mx-auto mb-2 text-surface-300 dark:text-surface-500" />
                No notifications right now.
              </div>
            )}
            {!loading && !error && items.map((n) => {
              const path = entityPath(n);
              const icon = n.type === 'overdue' ? <AlertCircle size={15} className="text-rose-500" /> : <Clock size={15} className="text-primary-600 dark:text-primary-300" />;
              const body = (
                <div className={`flex gap-2.5 p-3 rounded-xl border transition-colors ${n.read ? 'bg-surface-50/50 dark:bg-[#183B4A]/40 border-transparent' : 'bg-primary-50/60 dark:bg-[#285968]/40 border-primary-100/70 dark:border-primary-500/20'}`}>
                  <div className="mt-0.5 shrink-0">{icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 leading-snug">{n.title}</p>
                    <p className="text-[11px] text-surface-600 dark:text-surface-300 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!n.read && <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n._id); }} className="p-1 rounded-md text-surface-500 hover:text-primary-700 dark:hover:text-primary-200 hover:bg-white dark:hover:bg-[#355966]" aria-label="Mark read" title="Mark read"><CheckCheck size={14} /></button>}
                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss(n._id); }} className="p-1 rounded-md text-surface-500 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-white dark:hover:bg-[#355966]" aria-label="Dismiss notification" title="Dismiss"><X size={14} /></button>
                  </div>
                </div>
              );
              return path ? (
                <Link key={n._id} to={path} onClick={() => { if (!n.read) markRead(n._id); setOpen(false); onNavigate?.(); }} className="block">{body}</Link>
              ) : <div key={n._id}>{body}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
