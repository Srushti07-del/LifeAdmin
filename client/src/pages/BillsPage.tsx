import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  Plus,
  Receipt,
  Loader2,
  Calendar,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
} from 'lucide-react';

interface Bill {
  _id: string;
  name: string;
  provider?: string;
  amount: number;
  currency: string;
  dueDate: string;
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'upcoming';
  category: string;
  recurrence: { type: string; interval?: number; unit?: string };
  notes?: string;
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-warning-500', bg: 'bg-warning-400/10', label: 'Pending' },
  paid: { icon: CheckCircle2, color: 'text-success-500', bg: 'bg-success-400/10', label: 'Paid' },
  overdue: { icon: AlertCircle, color: 'text-danger-500', bg: 'bg-danger-400/10', label: 'Overdue' },
  upcoming: { icon: Calendar, color: 'text-primary-500', bg: 'bg-primary-400/10', label: 'Upcoming' },
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '', provider: '', amount: '', dueDate: '', category: 'Finance', currency: '₹',
    notes: '', recurrence: { type: 'none' as string },
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchBills = async () => {
    try {
      const params: Record<string, string> = { sort: 'dueDate' };
      if (filter !== 'all') params.paymentStatus = filter;
      const res = await api.get('/bills', { params });
      setBills(res.data.bills);
    } catch (err) {
      console.error('Failed to fetch bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBills(); }, [filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/bills', { ...formData, amount: parseFloat(formData.amount) });
      setFormData({ name: '', provider: '', amount: '', dueDate: '', category: 'Finance', currency: '₹', notes: '', recurrence: { type: 'none' } });
      setShowForm(false);
      fetchBills();
    } catch (err) {
      console.error('Failed to create bill:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = async (id: string) => {
    try {
      await api.put(`/bills/${id}`, { paymentStatus: 'paid' });
      fetchBills();
    } catch (err) {
      console.error('Failed to update bill:', err);
    }
  };

  const deleteBill = async (id: string) => {
    try {
      await api.delete(`/bills/${id}`);
      fetchBills();
    } catch (err) {
      console.error('Failed to delete bill:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={32} className="animate-spin text-primary-500" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Bills & Payments</h1>
          <p className="text-surface-500 text-sm mt-1">{bills.length} bill{bills.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} id="new-bill-button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-all shadow-sm hover:shadow-md">
          <Plus size={18} /> New Bill
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'overdue', label: 'Overdue' }, { value: 'paid', label: 'Paid' }].map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${filter === f.value ? 'bg-primary-500 text-white shadow-sm' : 'bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 shadow-card space-y-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-900 dark:text-surface-100">New Bill</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Bill name (e.g., Electricity)" required
              className="px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            <input type="text" value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} placeholder="Provider (optional)"
              className="px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            <div className="relative">
              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="Amount" required step="0.01"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
            </div>
            <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required
              className="px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-sm">
              {['Finance', 'Utilities', 'Rent', 'Insurance', 'Subscription', 'Education', 'Other'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={formData.recurrence.type} onChange={(e) => setFormData({ ...formData, recurrence: { type: e.target.value } })}
              className="px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 text-sm">
              <option value="none">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800">Cancel</button>
            <button type="submit" disabled={submitting} id="bill-submit"
              className="px-6 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-medium transition-all">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Bill'}
            </button>
          </div>
        </form>
      )}

      {/* Bills list */}
      {bills.length > 0 ? (
        <div className="space-y-2">
          {bills.map((bill) => {
            const cfg = statusConfig[bill.paymentStatus];
            const StatusIcon = cfg.icon;
            const daysUntil = Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={bill._id} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:shadow-card transition-all group">
                <div className={`flex-shrink-0 p-2 rounded-lg ${cfg.bg}`}>
                  <StatusIcon size={20} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{bill.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {bill.provider && <span className="text-xs text-surface-500">{bill.provider}</span>}
                    <span className="text-surface-300">·</span>
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    {bill.paymentStatus !== 'paid' && (
                      <>
                        <span className="text-surface-300">·</span>
                        <span className={`text-xs ${daysUntil < 0 ? 'text-danger-500' : daysUntil <= 3 ? 'text-warning-500' : 'text-surface-500'}`}>
                          {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Due today' : `${daysUntil}d left`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-surface-900 dark:text-surface-100">{bill.currency}{bill.amount.toLocaleString()}</p>
                </div>
                {bill.paymentStatus !== 'paid' && (
                  <button onClick={() => markPaid(bill._id)} className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-success-400/10 text-surface-400 hover:text-success-500 transition-all" title="Mark as paid">
                    <CheckCircle2 size={18} />
                  </button>
                )}
                <button onClick={() => deleteBill(bill._id)} className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-400/10 text-surface-400 hover:text-danger-500 transition-all">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
          <Receipt size={40} className="mx-auto text-surface-300 mb-3" />
          <p className="text-surface-600 dark:text-surface-400 font-medium">No bills tracked yet</p>
          <p className="text-sm text-surface-400 mt-1">Start tracking your bills and payment due dates.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium">
            <Plus size={16} /> Add Bill
          </button>
        </div>
      )}
    </div>
  );
}
