import { useState, useEffect } from 'react';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import {
  Plus,
  Receipt,
  Loader2,
  Calendar,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  RefreshCw,
  Search,
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
  pending: { icon: Clock, color: 'text-amber-700 dark:text-[#FFE8AD]', bg: 'bg-amber-50 dark:bg-[#54390E]', border: 'border-amber-200 dark:border-amber-700/60', label: 'Pending' },
  paid: { icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-200', bg: 'bg-emerald-50 dark:bg-[#1b4332]', border: 'border-emerald-200 dark:border-emerald-700/60', label: 'Paid' },
  overdue: { icon: AlertCircle, color: 'text-rose-700 dark:text-[#FFD2D2]', bg: 'bg-rose-50 dark:bg-[#5C2828]', border: 'border-rose-200 dark:border-rose-700/60', label: 'Overdue' },
  upcoming: { icon: Calendar, color: 'text-teal-700 dark:text-primary-200', bg: 'bg-teal-50 dark:bg-surface-800', border: 'border-teal-200 dark:border-surface-700', label: 'Upcoming' },
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    amount: '',
    dueDate: '',
    category: 'Finance',
    currency: '₹',
    notes: '',
    recurrence: { type: 'none' },
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

  useEffect(() => {
    fetchBills();
  }, [filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.amount) return;
    setSubmitting(true);
    try {
      await api.post('/bills', { ...formData, amount: parseFloat(formData.amount) });
      setFormData({
        name: '',
        provider: '',
        amount: '',
        dueDate: '',
        category: 'Finance',
        currency: '₹',
        notes: '',
        recurrence: { type: 'none' },
      });
      setShowModal(false);
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

  // Monthly Overview calculations
  const totalDue = bills
    .filter((b) => b.paymentStatus !== 'paid')
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const totalPaid = bills
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const overdueCount = bills.filter((b) => b.paymentStatus === 'overdue').length;

  const filteredBills = bills.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.provider && b.provider.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="text-xs text-surface-400">Loading your bills & payments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-surface-100 dark:border-[#355966]">
        <div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">
            Bills & Payments
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Track expenses, subscriptions, and renewal deadlines in ₹ (INR)
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          id="new-bill-button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-xs transition-all"
        >
          <Plus size={16} />
          <span>New Bill</span>
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-surface-0 rounded-2xl p-4 border border-surface-200 dark:border-surface-700 shadow-card">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-[#FFE8AD] uppercase tracking-wider">
            Total Pending
          </p>
          <p className="text-2xl font-bold font-editorial text-surface-900 dark:text-surface-100 mt-1">
            ₹{totalDue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-surface-600 dark:text-surface-300 mt-0.5">Awaiting settlement</p>
        </div>

        <div className="bg-white dark:bg-surface-0 rounded-2xl p-4 border border-surface-200 dark:border-surface-700 shadow-card">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-200 uppercase tracking-wider">
            Total Settled
          </p>
          <p className="text-2xl font-bold font-editorial text-surface-900 dark:text-surface-100 mt-1">
            ₹{totalPaid.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-surface-600 dark:text-surface-300 mt-0.5">Paid on time</p>
        </div>

        <div className="bg-white dark:bg-surface-0 rounded-2xl p-4 border border-surface-200 dark:border-surface-700 shadow-card">
          <p className="text-[11px] font-semibold text-rose-700 dark:text-[#FFD2D2] uppercase tracking-wider">
            Overdue Count
          </p>
          <p className="text-2xl font-bold font-editorial text-surface-900 dark:text-surface-100 mt-1">
            {overdueCount}
          </p>
          <p className="text-[11px] text-surface-600 dark:text-surface-300 mt-0.5">Past due date</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bills by name or provider..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { value: 'all', label: 'All Bills' },
            { value: 'pending', label: 'Pending' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'paid', label: 'Paid' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-primary-600 dark:bg-primary-500 text-white dark:text-[#183B4A] font-semibold shadow-xs'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Grid / Cards */}
      <div className="space-y-3">
        {filteredBills.length > 0 ? (
          filteredBills.map((bill) => {
            const config = statusConfig[bill.paymentStatus] || statusConfig.pending;
            const isPaid = bill.paymentStatus === 'paid';
            const isRecurring = bill.recurrence?.type && bill.recurrence.type !== 'none';

            return (
              <div
                key={bill._id}
                className="bg-white dark:bg-surface-0 p-4 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-xs hover:shadow-card transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${config.bg} ${config.color}`}>
                    <Receipt size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-surface-900 dark:text-surface-100">
                        {bill.name}
                      </p>
                      {bill.provider && (
                        <span className="text-[10px] text-surface-500 dark:text-surface-400">· {bill.provider}</span>
                      )}
                      {isRecurring && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300">
                          <RefreshCw size={10} /> {bill.recurrence.type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-surface-500 flex-wrap">
                      <span>Due: {new Date(bill.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>·</span>
                      <span>Category: {bill.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-100 dark:border-[#355966]">
                  <div className="text-left sm:text-right">
                    <span className="text-sm font-bold font-editorial text-surface-900 dark:text-surface-100 block">
                      {bill.currency || '₹'}{bill.amount?.toLocaleString('en-IN')}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-0.5 ${config.bg} ${config.color} ${config.border}`}>
                      <config.icon size={11} /> {config.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isPaid && (
                      <button
                        onClick={() => markPaid(bill._id)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors"
                        title="Mark bill as paid"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button
                      onClick={() => deleteBill(bill._id)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete bill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white dark:bg-surface-0 rounded-3xl border border-dashed border-surface-200 dark:border-[#355966]">
            <Receipt size={32} className="mx-auto text-surface-300 dark:text-surface-700 mb-2" />
            <h3 className="text-sm font-bold font-editorial text-surface-900 dark:text-surface-100">
              No bills match this filter
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              Keep your financial obligations stress-free by adding upcoming utility or subscription bills.
            </p>
          </div>
        )}
      </div>

      {/* Modal: New Bill */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="New Bill / Expense"
        maxWidth="md"
        panelClassName="rounded-3xl dark:border-[#355966]"
        headerClassName="pb-3 border-surface-100 dark:border-[#355966]"
        contentClassName="pt-4 pb-0"
        titleClassName="text-base font-bold font-editorial text-surface-900 dark:text-surface-100"
      >
        <form onSubmit={handleCreate} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Bill Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Electricity Bill, Cloud Storage"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Provider / Merchant
              </label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder="e.g. Power Corp, Google"
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Amount (₹) *
              </label>
              <div className="relative flex items-center">
                <IndianRupee size={14} className="absolute left-3 text-surface-400 pointer-events-none" />
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Recurrence
              </label>
              <select
                value={formData.recurrence.type}
                onChange={(e) => setFormData({ ...formData, recurrence: { type: e.target.value } })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="none">One-time payment</option>
                <option value="monthly">Monthly subscription</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Annual renewal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {['Finance', 'Utilities', 'Rent', 'Insurance', 'Subscription', 'Education', 'Personal'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-surface-100 dark:border-[#355966] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Add Bill'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
