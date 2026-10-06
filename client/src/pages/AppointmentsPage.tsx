import { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  Plus,
  CalendarClock,
  Loader2,
  MapPin,
  Trash2,
  X,
  User,
  Clock,
  Pencil,
  Calendar,
} from 'lucide-react';

interface Appointment {
  _id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  location?: string;
  relatedPerson?: string;
  relatedOrganization?: string;
  category: string;
  notes?: string;
}

export default function AppointmentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(location.pathname.endsWith('/new'));
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create form state
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    relatedPerson: '',
    relatedOrganization: '',
    category: 'Personal',
    notes: '',
  });

  // Edit modal state
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    relatedPerson: '',
    relatedOrganization: '',
    category: 'Personal',
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Sync /new path
  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setShowForm(true);
    }
  }, [location.pathname]);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments', { params: { sort: 'date' } });
      setAppointments(res.data.appointments);
      return res.data.appointments as Appointment[];
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Handle direct navigation to /appointments/:id
  useEffect(() => {
    if (!id || id === 'new') return;

    const openApptById = async () => {
      const found = appointments.find((a) => a._id === id);
      if (found) {
        startEditing(found);
      } else {
        try {
          const res = await api.get(`/appointments/${id}`);
          if (res.data.appointment) {
            startEditing(res.data.appointment);
          }
        } catch (err) {
          console.error('Appointment not found:', err);
        }
      }
    };

    openApptById();
  }, [id, appointments.length]);

  const startEditing = (appt: Appointment) => {
    setEditingAppt(appt);
    setEditFormData({
      title: appt.title,
      date: appt.date ? new Date(appt.date).toISOString().split('T')[0] : '',
      time: appt.time || '',
      endTime: appt.endTime || '',
      location: appt.location || '',
      relatedPerson: appt.relatedPerson || '',
      relatedOrganization: appt.relatedOrganization || '',
      category: appt.category || 'Personal',
      notes: appt.notes || '',
    });
  };

  const closeEditModal = () => {
    setEditingAppt(null);
    if (id && id !== 'new') {
      navigate('/appointments', { replace: true });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.post('/appointments', formData);
      setFormData({
        title: '',
        date: '',
        time: '',
        endTime: '',
        location: '',
        relatedPerson: '',
        relatedOrganization: '',
        category: 'Personal',
        notes: '',
      });
      setShowForm(false);
      if (location.pathname.endsWith('/new')) {
        navigate('/appointments', { replace: true });
      }
      setFeedback({ type: 'success', message: 'Appointment created successfully' });
      fetchAppointments();
    } catch (err: any) {
      console.error('Failed to create appointment:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create appointment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppt || !editFormData.title.trim() || !editFormData.date) return;
    setSavingEdit(true);
    setFeedback(null);
    try {
      await api.put(`/appointments/${editingAppt._id}`, editFormData);
      closeEditModal();
      setFeedback({ type: 'success', message: 'Appointment updated successfully' });
      fetchAppointments();
    } catch (err: any) {
      console.error('Failed to update appointment:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update appointment' });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteAppointment = async (apptId: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await api.delete(`/appointments/${apptId}`);
      if (editingAppt?._id === apptId) {
        closeEditModal();
      }
      fetchAppointments();
    } catch (err) {
      console.error('Failed to delete appointment:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
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
          <h1 className="text-2xl font-bold text-[#F5F3EE]">Appointments</h1>
          <p className="text-[#85827C] text-sm mt-1">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          id="new-appointment-button"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#383838] hover:bg-[#414141] text-[#F5F3EE] border border-[#505050] text-sm font-medium transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>New Appointment</span>
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

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-[#383838] rounded-2xl p-6 border border-[#505050] shadow-sm space-y-4 animate-scale-in"
        >
          <div className="flex items-center justify-between border-b border-[#505050] pb-3">
            <h3 className="font-semibold text-[#F5F3EE] text-sm">Schedule Appointment</h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                if (location.pathname.endsWith('/new')) navigate('/appointments', { replace: true });
              }}
              className="text-[#85827C] hover:text-[#F5F3EE]"
            >
              <X size={18} />
            </button>
          </div>

          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Appointment title (e.g. Dentist, Advisor Check-in)"
            required
            className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Start Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {['Personal', 'Health', 'Work/Study', 'Finance', 'Household', 'Legal'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. City Health Clinic, Room 304, Zoom"
                className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">With (Person / Organization)</label>
              <input
                type="text"
                value={formData.relatedPerson}
                onChange={(e) => setFormData({ ...formData, relatedPerson: e.target.value })}
                placeholder="e.g. Dr. Verma, Prof. Kumar"
                className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#85827C] uppercase tracking-wider mb-1">Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Preparation details, what to bring, etc."
              className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#505050]">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                if (location.pathname.endsWith('/new')) navigate('/appointments', { replace: true });
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#414141] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-[#F5F3EE] text-xs font-medium transition-all flex items-center gap-1.5"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Schedule'}
            </button>
          </div>
        </form>
      )}

      {/* Edit Appointment Modal */}
      {editingAppt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#383838] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#505050] animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-[#505050] pb-3">
              <h3 className="font-semibold text-[#F5F3EE] text-base">Edit Appointment</h3>
              <button onClick={closeEditModal} className="text-[#85827C] hover:text-[#F5F3EE]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editFormData.time}
                    onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">End Time</label>
                  <input
                    type="time"
                    value={editFormData.endTime}
                    onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Location</label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full px-3.5 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">With</label>
                  <input
                    type="text"
                    value={editFormData.relatedPerson}
                    onChange={(e) => setEditFormData({ ...editFormData, relatedPerson: e.target.value })}
                    className="w-full px-3.5 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
              </div>

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
                  onClick={() => deleteAppointment(editingAppt._id)}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  <Trash2 size={14} />
                  <span>Delete Appointment</span>
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

      {/* Appointment list */}
      {appointments.length > 0 ? (
        <div className="space-y-1.5">
          {appointments.map((appt) => (
            <div
              key={appt._id}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[#383838] border border-[#505050] hover:bg-[#414141] hover:border-[#606060] transition-all group"
            >
              <div className="shrink-0 p-2 rounded-lg bg-[#2F2F2F] text-primary-400 border border-[#505050]">
                <CalendarClock size={18} />
              </div>

              {/* Click to edit */}
              <div
                onClick={() => startEditing(appt)}
                className="flex-1 min-w-0 cursor-pointer"
              >
                <p className="text-sm font-medium text-[#F5F3EE]">{appt.title}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-[#85827C] flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-[#B8B5AE]">
                    <Calendar size={11} />
                    {formatDate(appt.date)}
                  </span>
                  {appt.time && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {appt.time} {appt.endTime && `- ${appt.endTime}`}
                    </span>
                  )}
                  {appt.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {appt.location}
                    </span>
                  )}
                  {appt.relatedPerson && (
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {appt.relatedPerson}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEditing(appt)}
                  className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-[#85827C] hover:text-[#F5F3EE] transition-colors"
                  title="Edit appointment"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => deleteAppointment(appt._id)}
                  className="p-1.5 rounded-lg hover:bg-[#2F2F2F] text-[#85827C] hover:text-rose-400 transition-colors"
                  title="Delete appointment"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#383838] rounded-2xl border border-[#505050]">
          <CalendarClock size={36} className="mx-auto text-[#85827C] mb-3" />
          <p className="text-[#F5F3EE] font-medium text-sm">No appointments scheduled</p>
          <p className="text-xs text-[#85827C] mt-1">Keep track of visits, meetings, and important appointments.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-[#F5F3EE] text-xs font-medium transition-all"
          >
            <Plus size={14} /> Schedule Appointment
          </button>
        </div>
      )}
    </div>
  );
}
