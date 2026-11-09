import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import {
  Plus,
  Receipt,
  Loader2,
  Calendar,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Pencil,
  RotateCcw,
  ArrowUpDown,
  Eye,
} from 'lucide-react';
import { formatCurrency, convertAmountTo, useExchangeRates, getCurrencyInfo, CURRENCIES, type CurrencyCode } from '../lib/currency';

type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'upcoming';
type RecurrenceType = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface Bill {
  _id: string;
  name: string;
  description?: string;
  provider?: string;
  amount: number;
  currency: string;
  dueDate: string;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  category: string;
  recurrence: { type: string; interval?: number; unit?: string };
  notes?: string;
}

type FilterKey = 'all' | 'upcoming' | 'paid' | 'overdue';
type SortKey = 'dueDate' | '-dueDate' | 'amount' | '-amount';

interface BillForm {
  name: string;
  description: string;
  provider: string;
  amount: string;
  currency: string;
  dueDate: string;
  category: string;
  recurrenceType: RecurrenceType;
  notes: string;
}

const emptyForm = (): BillForm => ({
  name: '',
  description: '',
  provider: '',
  amount: '',
  currency: 'INR',
  dueDate: '',
  category: 'Finance',
  recurrenceType: 'none',
  notes: '',
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function displayStatus(bill: Bill): { key: 'paid' | 'overdue' | 'due_soon' | 'unpaid' | 'upcoming'; label: string } {
  if (bill.paymentStatus === 'paid') return { key: 'paid', label: 'Paid' };
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(bill.dueDate));
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { key: 'overdue', label: 'Overdue' };
  if (diffDays <= 3) return { key: 'due_soon', label: 'Due Soon' };
  if (bill.paymentStatus === 'upcoming') return { key: 'upcoming', label: 'Upcoming' };
  return { key: 'unpaid', label: 'Unpaid' };
}

const statusBadgeVariant: Record<string, 'success' | 'danger' | 'warning' | 'neutral' | 'primary'> = {
  paid: 'success',
  overdue: 'danger',
  due_soon: 'warning',
  unpaid: 'neutral',
  upcoming: 'primary',
};

const statusIcon: Record<string, typeof Clock> = {
  paid: CheckCircle2,
  overdue: AlertCircle,
  due_soon: Clock,
  unpaid: Calendar,
  upcoming: Calendar,
};

const recurrenceLabels: Record<string, string> = {
  none: 'One-time',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  daily: 'Daily',
  custom: 'Custom',
};

export default function BillsPage() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('dueDate');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [viewing, setViewing] = useState<Bill | null>(null);
  const [form, setForm] = useState<BillForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const preferredCurrency = (user?.preferredCurrency || 'INR') as CurrencyCode;

  const { rates: exchangeRates, fetchRate } = useExchangeRates(preferredCurrency);

  const fetchBills = useCallback(async () => {
    try {
      setError('');
      const res = await api.get('/bills', { params: { sort: 'dueDate', limit: 300 } });
      setBills(res.data.bills || []);
    } catch (err: any) {
      console.error('Failed to fetch bills:', err);
      setError(err?.response?.data?.message || 'Failed to load bills. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  useEffect(() => {
    const currencies = new Set(bills.map((b) => b.currency).filter(Boolean));
    if (!currencies.has(preferredCurrency) && currencies.size > 0) {
      const firstNonPref = [...currencies].find((c) => c !== preferredCurrency);
      if (firstNonPref) {
        fetchRate(firstNonPref);
      }
    }
  }, [bills, preferredCurrency, fetchRate]);

  const convertAmount = useCallback((amount: number, fromCurrency: string) => {
    return convertAmountTo(amount, fromCurrency, preferredCurrency, exchangeRates);
  }, [exchangeRates, preferredCurrency]);

  const filteredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = bills.filter((b) => {
      const ds = displayStatus(b);
      if (filter === 'paid') return b.paymentStatus === 'paid';
      if (filter === 'overdue') return ds.key === 'overdue';
      if (filter === 'upcoming') return b.paymentStatus !== 'paid' && ds.key !== 'overdue';
      return true;
    });
    if (q) {
      list = list.filter(
        (b) => b.name.toLowerCase().includes(q) || (b.provider || '').toLowerCase().includes(q) || (b.category || '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === 'dueDate') return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (sort === '-dueDate') return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      if (sort === 'amount') return (a.amount || 0) - (b.amount || 0);
      return (b.amount || 0) - (a.amount || 0);
    });
    return list;
  }, [bills, filter, searchQuery, sort]);

  const totals = useMemo(() => {
    const now = new Date();
    const upcomingCount = bills.filter((b) => b.paymentStatus !== 'paid' && displayStatus(b).key !== 'overdue').length;
    const overdue = bills.filter((b) => b.paymentStatus !== 'paid' && displayStatus(b).key === 'overdue');
    const paid = bills.filter((b) => b.paymentStatus === 'paid');
    const dueThisMonth = bills.filter((b) => b.paymentStatus !== 'paid' && sameMonth(new Date(b.dueDate), now));
    return {
      upcomingCount,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((s, b) => s + convertAmount(b.amount || 0, b.currency), 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((s, b) => s + convertAmount(b.amount || 0, b.currency), 0),
      dueThisMonthAmount: dueThisMonth.reduce((s, b) => s + convertAmount(b.amount || 0, b.currency), 0),
    };
  }, [bills, exchangeRates, preferredCurrency]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (bill: Bill) => {
    setViewing(null);
    setEditing(bill);
    setForm({
      name: bill.name || '',
      description: bill.description || '',
      provider: bill.provider || '',
      amount: bill.amount != null ? String(bill.amount) : '',
      currency: bill.currency || '₹',
      dueDate: bill.dueDate ? bill.dueDate.slice(0, 10) : '',
      category: bill.category || 'Finance',
      recurrenceType: (['weekly', 'monthly', 'quarterly', 'yearly'].includes(bill.recurrence?.type) ? bill.recurrence.type : 'none') as RecurrenceType,
      notes: bill.notes || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || !form.dueDate) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        provider: form.provider.trim() || undefined,
        amount: parseFloat(form.amount),
        currency: form.currency || '₹',
        dueDate: form.dueDate,
        category: form.category,
        recurrence: { type: form.recurrenceType },
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        await api.put(`/bills/${editing._id}`, payload);
      } else {
        await api.post('/bills', payload);
      }
      closeModal();
      await fetchBills();
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      setError(err?.response?.data?.message || 'Failed to save bill.');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePaid = async (bill: Bill) => {
    setActionId(bill._id);
    setError('');
    try {
      if (bill.paymentStatus === 'paid') {
        await api.patch(`/bills/${bill._id}/unpay`);
      } else {
        await api.patch(`/bills/${bill._id}/pay`);
      }
      await fetchBills();
    } catch (err: any) {
      console.error('Failed to update bill status:', err);
      setError(err?.response?.data?.message || 'Failed to update bill status.');
    } finally {
      setActionId(null);
    }
  };

  const deleteBill = async (bill: Bill) => {
    if (!window.confirm(`Delete "${bill.name}"? This cannot be undone.`)) return;
    setActionId(bill._id);
    setError('');
    try {
      await api.delete(`/bills/${bill._id}`);
      setViewing((v) => (v?._id === bill._id ? null : v));
      await fetchBills();
    } catch (err: any) {
      console.error('Failed to delete bill:', err);
      setError(err?.response?.data?.message || 'Failed to delete bill.');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="text-xs text-surface-500 dark:text-surface-400">Loading your bills & payments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-surface-100 dark:border-[#304247]">
        <div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">Bills & Payments</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Track expenses, subscriptions, due dates, and payment history in {getCurrencyInfo(preferredCurrency).symbol} ({preferredCurrency})
          </p>
        </div>
        <button onClick={openCreate} id="new-bill-button" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-xs transition-all">
          <Plus size={16} />
          <span>New Bill</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-700/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={fetchBills} className="font-medium underline underline-offset-2">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <SummaryCard label="Upcoming Bills" value={String(totals.upcomingCount)} sub="Not paid, not overdue" tone="teal" />
        <SummaryCard label="Overdue Bills" value={String(totals.overdueCount)} sub={formatCurrency(totals.overdueAmount, preferredCurrency) + ' overdue'} tone="rose" />
        <SummaryCard label="Paid Bills" value={String(totals.paidCount)} sub={formatCurrency(totals.paidAmount, preferredCurrency) + ' settled'} tone="emerald" />
        <SummaryCard label="Due This Month" value={formatCurrency(totals.dueThisMonthAmount, preferredCurrency)} sub="Unpaid amount this month" tone="amber" />
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bills by name, provider, or category..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={15} className="text-surface-400 shrink-0" aria-hidden="true" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort bills"
            className="px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="dueDate">Due date (soonest)</option>
            <option value="-dueDate">Due date (latest)</option>
            <option value="amount">Amount (low to high)</option>
            <option value="-amount">Amount (high to low)</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {([
            { value: 'all', label: 'All' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'paid', label: 'Paid' },
            { value: 'overdue', label: 'Overdue' },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-primary-600 dark:bg-primary-500 text-white dark:text-[#101719] font-semibold shadow-xs'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filteredBills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBills.map((bill) => {
            const ds = displayStatus(bill);
            const isPaid = bill.paymentStatus === 'paid';
            const isRecurring = bill.recurrence?.type && bill.recurrence.type !== 'none';
            const busy = actionId === bill._id;
            const StatusIcon = statusIcon[ds.key] || Clock;
            return (
              <Card key={bill._id} hover className="flex flex-col h-full min-h-[220px] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-50 dark:bg-surface-800 text-primary-700 dark:text-primary-200 border border-primary-100 dark:border-surface-700">
                      <Receipt size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100 leading-snug truncate" title={bill.name}>{bill.name}</h3>
                      <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5 truncate">{bill.provider || 'No provider'}</p>
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariant[ds.key]} size="sm" className="shrink-0">
                    <StatusIcon size={11} className="mr-1" aria-hidden="true" />
                    {ds.label}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-medium text-surface-500 dark:text-surface-400">Amount</span>
                    <span className="text-lg font-bold font-editorial text-surface-900 dark:text-surface-100">
                      {formatCurrency(convertAmount(bill.amount || 0, bill.currency), preferredCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-surface-500 dark:text-surface-400">Due date</span>
                    <span className="font-medium text-surface-800 dark:text-surface-200">{new Date(bill.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-surface-500 dark:text-surface-400">Category</span>
                    <span className="font-medium text-surface-700 dark:text-surface-300 truncate max-w-[60%] text-right">{bill.category}</span>
                  </div>
                  {isPaid && bill.paidAt && (
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-surface-500 dark:text-surface-400">Paid on</span>
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">{new Date(bill.paidAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  )}
                  <div className="pt-1">
                    {isRecurring ? (
                      <Badge variant="primary" size="sm" dot>{recurrenceLabels[bill.recurrence.type] || bill.recurrence.type}</Badge>
                    ) : (
                      <span className="text-[11px] text-surface-400 dark:text-surface-200">One-time payment</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-700/70 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button type="button" onClick={() => setViewing(bill)} disabled={busy} className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-60" aria-label={`View ${bill.name}`}>
                    <Eye size={13} /> View
                  </button>
                  <button type="button" onClick={() => openEdit(bill)} disabled={busy} className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-60" aria-label={`Edit ${bill.name}`}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button type="button" onClick={() => togglePaid(bill)} disabled={busy} className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60 ${isPaid ? 'bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-700' : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50'}`} aria-label={isPaid ? `Mark ${bill.name} as unpaid` : `Mark ${bill.name} as paid`}>
                    {busy ? <Loader2 size={13} className="animate-spin" /> : isPaid ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
                    {isPaid ? 'Unpaid' : 'Paid'}
                  </button>
                  <button type="button" onClick={() => deleteBill(bill)} disabled={busy} className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border border-rose-200/80 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-60" aria-label={`Delete ${bill.name}`}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-surface-0 rounded-3xl border border-dashed border-surface-200 dark:border-[#304247]">
          <Receipt size={32} className="mx-auto text-surface-300 dark:text-surface-400 mb-2" />
          <h3 className="text-sm font-bold font-editorial text-surface-900 dark:text-surface-100">{bills.length === 0 ? 'No bills yet' : 'No bills match your filters'}</h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 max-w-sm mx-auto">
            {bills.length === 0 ? 'Add utility, subscription, or payment bills to track due dates and payment status.' : 'Try a different filter, search term, or sort order.'}
          </p>
          {bills.length === 0 && (
            <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold">
              <Plus size={15} /> Add your first bill
            </button>
          )}
        </div>
      )}

      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name || 'Bill details'}
        description={viewing?.provider ? `Provider: ${viewing.provider}` : undefined}
        maxWidth="md"
        panelClassName="rounded-3xl dark:border-[#304247]"
        headerClassName="pb-3 border-surface-100 dark:border-[#304247]"
        contentClassName="pt-4 pb-0"
        titleClassName="text-base font-bold font-editorial text-surface-900 dark:text-surface-100"
      >
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-surface-500 dark:text-surface-400 text-xs">Status</span>
              <Badge variant={statusBadgeVariant[displayStatus(viewing).key]} size="sm">{displayStatus(viewing).label}</Badge>
            </div>
            <DetailRow label="Amount" value={formatCurrency(convertAmount(viewing?.amount || 0, viewing?.currency), preferredCurrency)} prominent />
            <DetailRow label="Due date" value={new Date(viewing.dueDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} />
            <DetailRow label="Category" value={viewing.category || '—'} />
            <DetailRow label="Recurrence" value={recurrenceLabels[viewing.recurrence?.type] || viewing.recurrence?.type || 'One-time'} />
            {viewing.paidAt && <DetailRow label="Paid on" value={new Date(viewing.paidAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} />}
            {viewing.description && <DetailRow label="Description" value={viewing.description} />}
            {viewing.notes && <DetailRow label="Notes" value={viewing.notes} />}
            <div className="pt-3 border-t border-surface-100 dark:border-[#304247] flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => openEdit(viewing)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-xs font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800">
                <Pencil size={14} /> Edit
              </button>
              <button type="button" onClick={() => setViewing(null)} className="px-3 py-2 rounded-xl text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? 'Edit Bill' : 'New Bill / Expense'}
        description={editing ? 'Update bill details. Marking as paid can generate the next recurring occurrence.' : 'Add a bill with due date, amount, and optional recurrence.'}
        maxWidth="lg"
        panelClassName="rounded-3xl dark:border-[#304247]"
        headerClassName="pb-3 border-surface-100 dark:border-[#304247]"
        contentClassName="pt-4 pb-0"
        titleClassName="text-base font-bold font-editorial text-surface-900 dark:text-surface-100"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Bill name *">
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electricity Bill, Cloud Storage" className={inputClass} />
          </Field>
          <Field label="Description">
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details..." className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Provider / Merchant">
              <input type="text" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Power Corp" className={inputClass} />
            </Field>
            <Field label={`Amount (${form.currency || 'INR'}) *`}>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-surface-400 pointer-events-none text-xs">{getCurrencyInfo(form.currency).symbol}</span>
                <input type="number" required step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className={`${inputClass} pl-8`} />
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Currency">
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputClass}>
                {Object.entries(getCurrencyInfo('INR') === undefined ? {} : CURRENCIES).map(([code, info]) => (
                  <option key={code} value={code}>
                    {info.symbol} {code} - {info.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due date *">
              <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Recurrence">
              <select value={form.recurrenceType} onChange={(e) => setForm({ ...form, recurrenceType: e.target.value as RecurrenceType })} className={inputClass}>
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </Field>
          </div>
          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
              {['Finance', 'Utilities', 'Rent', 'Insurance', 'Subscription', 'Education', 'Personal'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." className={inputClass} />
          </Field>
          <div className="pt-3 border-t border-surface-100 dark:border-[#304247] flex justify-end gap-2">
            <button type="button" onClick={closeModal} disabled={submitting} className="px-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-200">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-4 py-2 text-xs rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold disabled:opacity-50">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Bill'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const inputClass = 'w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

function DetailRow({ label, value, prominent }: { label: string; value: string; prominent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-surface-500 dark:text-surface-400 text-xs shrink-0">{label}</span>
      <span className={`text-right ${prominent ? 'text-base font-bold font-editorial text-surface-900 dark:text-surface-100' : 'text-xs text-surface-800 dark:text-surface-200'}`}>{value}</span>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'teal' | 'rose' | 'emerald' | 'amber' }) {
  const toneClass = {
    teal: 'text-teal-700 dark:text-primary-200',
    rose: 'text-rose-700 dark:text-[#FFD2D2]',
    emerald: 'text-emerald-700 dark:text-emerald-200',
    amber: 'text-amber-700 dark:text-[#FFE8AD]',
  }[tone];
  return (
    <div className="bg-white dark:bg-surface-0 rounded-2xl p-4 border border-surface-200 dark:border-surface-700 shadow-card">
      <p className={`text-[11px] font-semibold uppercase tracking-wider ${toneClass}`}>{label}</p>
      <p className="text-2xl font-bold font-editorial text-surface-900 dark:text-surface-100 mt-1">{value}</p>
      <p className="text-[11px] text-surface-600 dark:text-surface-300 mt-0.5">{sub}</p>
    </div>
  );
}


