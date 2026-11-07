import { useState, useEffect } from 'react';
import api from '../lib/api';
import Modal from '../components/ui/Modal';
import {
  Plus,
  CalendarClock,
  Loader2,
  MapPin,
  Trash2,
  User,
  Search,
  Building,
  Clock,
} from 'lucide-react';

interface Appointment {
  _id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  relatedPerson?: string;
  relatedOrganization?: string;
  category: string;
  notes?: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    relatedPerson: '',
    relatedOrganization: '',
    category: 'Personal',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments', { params: { sort: 'date' } });
      setAppointments(res.data.appointments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;
    setSubmitting(true);
    try {
      await api.post('/appointments', formData);
      setFormData({
        title: '',
        date: '',
        time: '',
        location: '',
        relatedPerson: '',
        relatedOrganization: '',
        category: 'Personal',
        notes: '',
      });
      setShowModal(false);
      fetchAppointments();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      await api.delete(`/appointments/${id}`);
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filtered = appointments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.relatedPerson && a.relatedPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <p className="text-xs text-surface-400">Loading your appointment records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-surface-100 dark:border-[#304247]">
        <div>
          <h1 className="text-3xl font-bold font-editorial text-surface-900 dark:text-surface-100 tracking-tight">
            Appointments
          </h1>
          <p className="text-xs text-surface-500 dark:text-surface-200 mt-1">
            Manage consultations, doctor visits, interviews, and official meetings
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          id="new-appointment-button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold shadow-xs transition-all"
        >
          <Plus size={16} />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, person, or location..."
          className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Appointment Cards List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((appt) => (
            <div
              key={appt._id}
              className="bg-white dark:bg-surface-0 p-4 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-xs hover:shadow-card transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CalendarClock size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-surface-900 dark:text-surface-100 truncate">
                    {appt.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-surface-500 dark:text-surface-200 flex-wrap">
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {formatDate(appt.date)}
                    </span>
                    {appt.time && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {appt.time}
                        </span>
                      </>
                    )}
                    {appt.location && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 truncate max-w-xs">
                          <MapPin size={11} /> {appt.location}
                        </span>
                      </>
                    )}
                  </div>
                  {(appt.relatedPerson || appt.relatedOrganization) && (
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-surface-400">
                      {appt.relatedPerson && (
                        <span className="flex items-center gap-1">
                          <User size={10} /> {appt.relatedPerson}
                        </span>
                      )}
                      {appt.relatedOrganization && (
                        <span className="flex items-center gap-1">
                          <Building size={10} /> {appt.relatedOrganization}
                        </span>
                      )}
                    </div>
                  )}
                  {appt.notes && (
                    <p className="text-[11px] text-surface-500 dark:text-surface-200 mt-1 italic">{appt.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-100 dark:border-[#304247]">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
                  {appt.category}
                </span>
                <button
                  onClick={() => deleteAppointment(appt._id)}
                  className="p-1.5 rounded-lg text-surface-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete appointment"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-surface-0 rounded-3xl border border-dashed border-surface-200 dark:border-[#304247]">
            <CalendarClock size={32} className="mx-auto text-surface-300 dark:text-surface-700 mb-2" />
            <h3 className="text-sm font-bold font-editorial text-surface-900 dark:text-surface-100">
              No appointments found
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              Keep critical doctor visits, advisor meetings, and interviews organized in one place.
            </p>
          </div>
        )}
      </div>

      {/* Modal: New Appointment */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="New Appointment"
        maxWidth="md"
        panelClassName="rounded-3xl dark:border-[#304247]"
        headerClassName="pb-3 border-surface-100 dark:border-[#304247]"
        contentClassName="pt-4 pb-0"
        titleClassName="text-base font-bold font-editorial text-surface-900 dark:text-surface-100"
      >
        <form onSubmit={handleCreate} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Appointment Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Annual Dental Checkup, Advisor Meeting"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Time
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Location / Link
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Clinic address or video URL"
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                With Person / Specialist
              </label>
              <input
                type="text"
                value={formData.relatedPerson}
                onChange={(e) => setFormData({ ...formData, relatedPerson: e.target.value })}
                placeholder="Dr. Smith, Advisor Jones"
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Preparation Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Bring insurance card, previous reports..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-0 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-surface-100 dark:border-[#304247] flex justify-end gap-2">
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
              {submitting ? 'Saving...' : 'Add Appointment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

