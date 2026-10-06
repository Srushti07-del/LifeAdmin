import { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
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
  Pencil,
  Repeat,
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
  recurrence: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    interval?: number;
    unit?: 'days' | 'weeks' | 'months' | 'years';
    endDate?: string;
    durationMonths?: number;
  };
  notes?: string;
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-950/50 border border-amber-800/60', label: 'Pending' },
  paid: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/50 border border-emerald-800/60', label: 'Paid' },
  overdue: { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-950/50 border border-rose-800/60', label: 'Overdue' },
  upcoming: { icon: Calendar, color: 'text-primary-400', bg: 'bg-primary-950/50 border border-primary-800/60', label: 'Upcoming' },
};

export default function BillsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(location.pathname.endsWith('/new'));
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create form state
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    amount: '',
    dueDate: '',
    category: 'Finance',
    currency: '₹',
    notes: '',
    recurrence: {
      type: 'none' as Bill['recurrence']['type'],
      interval: 1,
      unit: 'months' as const,
      endDate: '',
      durationMonths: undefined as number | undefined,
    },
  });

  // Edit modal state
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    provider: '',
    amount: '',
    dueDate: '',
    paymentStatus: 'pending' as Bill['paymentStatus'],
    category: 'Finance',
    currency: '₹',
    notes: '',
    recurrence: {
      type: 'none' as Bill['recurrence']['type'],
      interval: 1,
      unit: 'months' as const,
      endDate: '',
      durationMonths: undefined as number | undefined,
    },
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Sync /new path with showForm
  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setShowForm(true);
    }
  }, [location.pathname]);

  const fetchBills = async () => {
    try {
      const params: Record<string, string> = { sort: 'dueDate' };
      if (filter !== 'all') params.paymentStatus = filter;
      const res = await api.get('/bills', { params });
      setBills(res.data.bills);
      return res.data.bills as Bill[];
    } catch (err) {
      console.error('Failed to fetch bills:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [filter]);

  // Handle direct navigation to /bills/:id
  useEffect(() => {
    if (!id || id === 'new') return;

    const openBillById = async () => {
      const found = bills.find((b) => b._id === id);
      if (found) {
        startEditing(found);
      } else {
        try {
          const res = await api.get(`/bills/${id}`);
          if (res.data.bill) {
            startEditing(res.data.bill);
          }
        } catch (err) {
          console.error('Bill not found:', err);
        }
      }
    };

    openBillById();
  }, [id, bills.length]);

  const startEditing = (bill: Bill) => {
    setEditingBill(bill);
    setEditFormData({
      name: bill.name,
      provider: bill.provider || '',
      amount: bill.amount.toString(),
      dueDate: bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : '',
      paymentStatus: bill.paymentStatus,
      category: bill.category || 'Finance',
      currency: bill.currency || '₹',
      notes: bill.notes || '',
      recurrence: {
        type: bill.recurrence?.type || 'none',
        interval: bill.recurrence?.interval || 1,
        unit: (bill.recurrence?.unit as any) || 'months',
        endDate: bill.recurrence?.endDate ? new Date(bill.recurrence.endDate).toISOString().split('T')[0] : '',
        durationMonths: bill.recurrence?.durationMonths,
      },
    });
  };

  const closeEditModal = () => {
    setEditingBill(null);
    if (id && id !== 'new') {
      navigate('/bills', { replace: true });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.amount || !formData.dueDate) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/bills', {
        ...formData,
        amount: parseFloat(formData.amount),
        recurrence: {
          ...formData.recurrence,
          interval: Number(formData.recurrence.interval) || 1,
          endDate: formData.recurrence.endDate || undefined,
          durationMonths: formData.recurrence.durationMonths ? Number(formData.recurrence.durationMonths) : undefined,
        },
      });

      setFormData({
        name: '',
        provider: '',
        amount: '',
        dueDate: '',
        category: 'Finance',
        currency: '₹',
        notes: '',
        recurrence: { type: 'none', interval: 1, unit: 'months', endDate: '', durationMonths: undefined },
      });
      setShowForm(false);
      if (location.pathname.endsWith('/new')) {
        navigate('/bills', { replace: true });
      }
      setFeedback({ type: 'success', message: 'Bill created successfully' });
      fetchBills();
    } catch (err: any) {
      console.error('Failed to create bill:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create bill' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill || !editFormData.name.trim() || !editFormData.amount) return;
    setSavingEdit(true);
    setFeedback(null);
    try {
      await api.put(`/bills/${editingBill._id}`, {
        ...editFormData,
        amount: parseFloat(editFormData.amount),
        recurrence: {
          ...editFormData.recurrence,
          interval: Number(editFormData.recurrence.interval) || 1,
          endDate: editFormData.recurrence.endDate || undefined,
          durationMonths: editFormData.recurrence.durationMonths ? Number(editFormData.recurrence.durationMonths) : undefined,
        },
      });
      closeEditModal();
      setFeedback({ type: 'success', message: 'Bill updated successfully' });
      fetchBills();
    } catch (err: any) {
      console.error('Failed to update bill:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update bill' });
    } finally {
      setSavingEdit(false);
    }
  };

  const markPaid = async (billId: string) => {
    try {
      const res = await api.patch(`/bills/${billId}/pay`);
      if (res.data.nextOccurrence) {
        setFeedback({
          type: 'success',
          message: `Bill marked paid! Next occurrence generated for ${new Date(res.data.nextOccurrence.dueDate).toLocaleDateString()}.`,
        });
      } else {
        setFeedback({ type: 'success', message: 'Bill marked as paid.' });
      }
      fetchBills();
    } catch (err) {
      console.error('Failed to mark bill paid:', err);
    }
  };

  const markUnpaid = async (billId: string) => {
    try {
      await api.put(`/bills/${billId}`, { paymentStatus: 'pending' });
      setFeedback({ type: 'success', message: 'Bill marked as pending.' });
      fetchBills();
    } catch (err) {
      console.error('Failed to update bill status:', err);
    }
  };

  const deleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    try {
      await api.delete(`/bills/${billId}`);
      if (editingBill?._id === billId) {
        closeEditModal();
      }
      fetchBills();
    } catch (err) {
      console.error('Failed to delete bill:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F3EE]">Bills & Subscriptions</h1>
          <p className="text-[#85827C] text-sm mt-1">{bills.length} bill{bills.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          id="new-bill-button"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#383838] hover:bg-[#414141] text-[#F5F3EE] border border-[#505050] text-sm font-medium transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>New Bill</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/80'
              : 'bg-rose-950/40 text-rose-300 border border-rose-800/80'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'paid', label: 'Paid' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              filter === f.value
                ? 'bg-[#414141] text-[#F5F3EE] border border-[#505050] shadow-sm'
                : 'bg-[#383838] text-[#85827C] border border-[#505050] hover:text-[#B8B5AE] hover:bg-[#414141]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[#383838] rounded-2xl p-6 border border-[#505050] shadow-sm space-y-4 animate-scale-in"
        >
          <div className="flex items-center justify-between border-b border-[#505050] pb-3">
            <h3 className="font-semibold text-[#F5F3EE] text-sm">Add New Bill</h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                if (location.pathname.endsWith('/new')) navigate('/bills', { replace: true });
              }}
              className="text-[#85827C] hover:text-[#F5F3EE]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Bill Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. WiFi, Electricity, Rent"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Provider / Vendor</label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder="e.g. Airtel, PG Owner"
                className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Amount</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-14 px-2 py-2 rounded-xl border border-[#505050] bg-[#323232] text-center text-sm font-semibold text-[#F5F3EE]"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Due Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {['Finance', 'Utilities', 'Rent', 'Insurance', 'Subscription', 'Education', 'Other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Recurrence</label>
              <select
                value={formData.recurrence.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recurrence: { ...formData.recurrence, type: e.target.value as Bill['recurrence']['type'] },
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="none">One-time (No Recurrence)</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom Interval</option>
              </select>
            </div>
          </div>

          {/* Recurrence Sub-fields */}
          {formData.recurrence.type !== 'none' && (
            <div className="p-3 rounded-xl bg-[#2F2F2F] border border-[#505050] space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary-400">
                <Repeat size={14} />
                <span>Recurrence Rules</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-[#85827C] mb-1">Repeat Every</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.recurrence.interval}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence: { ...formData.recurrence, interval: parseInt(e.target.value, 10) || 1 },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#505050] bg-[#323232] text-[#F5F3EE]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#85827C] mb-1">Unit</label>
                  <select
                    value={formData.recurrence.unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence: { ...formData.recurrence, unit: e.target.value as any },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#505050] bg-[#323232] text-[#F5F3EE]"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#85827C] mb-1">End Date (optional)</label>
                  <input
                    type="date"
                    value={formData.recurrence.endDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence: { ...formData.recurrence, endDate: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#505050] bg-[#323232] text-[#F5F3EE]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#85827C] mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 12"
                    value={formData.recurrence.durationMonths || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recurrence: {
                          ...formData.recurrence,
                          durationMonths: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#505050] bg-[#323232] text-[#F5F3EE]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#505050]">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                if (location.pathname.endsWith('/new')) navigate('/bills', { replace: true });
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#414141] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              id="bill-submit"
              className="px-5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-[#F5F3EE] text-xs font-medium transition-all flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Create Bill'}
            </button>
          </div>
        </form>
      )}

      {/* Edit Bill Modal */}
      {editingBill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#383838] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#505050] animate-scale-in space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#505050] pb-3">
              <h3 className="font-semibold text-[#F5F3EE] text-base">Edit Bill</h3>
              <button onClick={closeEditModal} className="text-[#85827C] hover:text-[#F5F3EE]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Bill Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Provider</label>
                  <input
                    type="text"
                    value={editFormData.provider}
                    onChange={(e) => setEditFormData({ ...editFormData, provider: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editFormData.currency}
                      onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value })}
                      className="w-12 px-2 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-center text-xs font-bold text-[#F5F3EE]"
                    />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editFormData.dueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Status</label>
                  <select
                    value={editFormData.paymentStatus}
                    onChange={(e) => setEditFormData({ ...editFormData, paymentStatus: e.target.value as Bill['paymentStatus'] })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    {['Finance', 'Utilities', 'Rent', 'Insurance', 'Subscription', 'Education', 'Other'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Recurrence</label>
                <select
                  value={editFormData.recurrence.type}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      recurrence: { ...editFormData.recurrence, type: e.target.value as any },
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="none">One-time (No Recurrence)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {editFormData.recurrence.type !== 'none' && (
                <div className="p-3 rounded-xl bg-[#2F2F2F] border border-[#505050] space-y-2 text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#85827C] mb-1">Repeat Every</label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.recurrence.interval}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            recurrence: { ...editFormData.recurrence, interval: parseInt(e.target.value, 10) || 1 },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border border-[#505050] bg-[#323232] text-[#F5F3EE]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#85827C] mb-1">Unit</label>
                      <select
                        value={editFormData.recurrence.unit}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            recurrence: { ...editFormData.recurrence, unit: e.target.value as any },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border border-[#505050] bg-[#323232] text-[#F5F3EE]"
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#85827C] mb-1">End Date</label>
                      <input
                        type="date"
                        value={editFormData.recurrence.endDate}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            recurrence: { ...editFormData.recurrence, endDate: e.target.value },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border border-[#505050] bg-[#323232] text-[#F5F3EE]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#85827C] mb-1">Duration (Months)</label>
                      <input
                        type="number"
                        min="1"
                        value={editFormData.recurrence.durationMonths || ''}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            recurrence: {
                              ...editFormData.recurrence,
                              durationMonths: e.target.value ? parseInt(e.target.value, 10) : undefined,
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border border-[#505050] bg-[#323232] text-[#F5F3EE]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[#505050]">
                <button
                  type="button"
                  onClick={() => deleteBill(editingBill._id)}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  <Trash2 size={14} />
                  <span>Delete Bill</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-1.5 rounded-xl text-xs font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#414141] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-[#F5F3EE] text-xs font-medium transition-all flex items-center gap-1.5"
                  >
                    {savingEdit ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bills list */}
      {bills.length > 0 ? (
        <div className="space-y-1.5">
          {bills.map((bill) => {
            const cfg = statusConfig[bill.paymentStatus] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const billDate = new Date(bill.dueDate);
            billDate.setHours(0, 0, 0, 0);
            const daysUntil = Math.round((billDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={bill._id}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#383838] border border-[#505050] hover:bg-[#414141] hover:border-[#606060] transition-all group"
              >
                <div className={`shrink-0 p-2 rounded-lg ${cfg.bg}`}>
                  <StatusIcon size={18} className={cfg.color} />
                </div>

                {/* Info — click opens edit modal */}
                <div
                  onClick={() => startEditing(bill)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#F5F3EE]">{bill.name}</p>
                    {bill.recurrence?.type && bill.recurrence.type !== 'none' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#2F2F2F] text-primary-400 border border-[#505050]">
                        <Repeat size={10} />
                        {bill.recurrence.type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {bill.provider && <span className="text-xs text-[#85827C]">{bill.provider}</span>}
                    <span className="text-[#505050]">·</span>
                    <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    {bill.paymentStatus !== 'paid' && (
                      <>
                        <span className="text-[#505050]">·</span>
                        <span
                          className={`text-xs ${
                            daysUntil < 0
                              ? 'text-rose-400 font-semibold'
                              : daysUntil <= 3
                              ? 'text-amber-400 font-semibold'
                              : 'text-[#85827C]'
                          }`}
                        >
                          {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Due today' : `${daysUntil}d left`}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0 pr-1">
                  <p className="text-sm font-bold text-[#F5F3EE]">
                    {bill.currency}{bill.amount.toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {bill.paymentStatus !== 'paid' ? (
                    <button
                      onClick={() => markPaid(bill._id)}
                      className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-[#85827C] hover:text-emerald-400 transition-colors"
                      title="Mark as paid (will generate next recurring cycle if applicable)"
                    >
                      <CheckCircle2 size={17} />
                    </button>
                  ) : (
                    <button
                      onClick={() => markUnpaid(bill._id)}
                      className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-emerald-400 hover:text-amber-400 transition-colors"
                      title="Mark as unpaid"
                    >
                      <CheckCircle2 size={17} />
                    </button>
                  )}
                  <button
                    onClick={() => startEditing(bill)}
                    className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-[#85827C] hover:text-[#F5F3EE] transition-colors"
                    title="Edit bill"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteBill(bill._id)}
                    className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-[#85827C] hover:text-rose-400 transition-colors"
                    title="Delete bill"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#383838] rounded-2xl border border-[#505050]">
          <Receipt size={36} className="mx-auto text-[#85827C] mb-3" />
          <p className="text-[#F5F3EE] font-medium text-sm">No bills tracked yet</p>
          <p className="text-xs text-[#85827C] mt-1">Start tracking your bills, payments, and subscriptions.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-[#F5F3EE] text-xs font-medium transition-all"
          >
            <Plus size={14} /> Add Bill
          </button>
        </div>
      )}
    </div>
  );
}
