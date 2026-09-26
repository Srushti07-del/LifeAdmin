import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Plus, CalendarClock, Loader2, MapPin, Trash2, X, User } from 'lucide-react';

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
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', date: '', time: '', location: '', relatedPerson: '', category: 'Personal', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments', { params: { sort: 'date' } });
      setAppointments(res.data.appointments);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchAppointments(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/appointments', formData);
      setFormData({ title: '', date: '', time: '', location: '', relatedPerson: '', category: 'Personal', notes: '' });
      setShowForm(false);
      fetchAppointments();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const deleteAppointment = async (id: string) => {
    try { await api.delete(`/appointments/${id}`); fetchAppointments(); } catch (err) { console.error(err); }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={32} className="animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Appointments</h1>
          <p className="text-surface-500 text-sm mt-1">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} id="new-appointment-button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-all shadow-sm hover:shadow-md">
          <Plus size={18} /> New Appointment
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800 shadow-card space-y-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-900 dark:text-surface-100">New Appointment</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
          </div>
          <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Appointment title" required
            className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required
              className="px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
            <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
            <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Location"
              className="px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
            <input type="text" value={formData.relatedPerson} onChange={(e) => setFormData({ ...formData, relatedPerson: e.target.value })} placeholder="With (person/org)"
              className="px-3 py-2.5 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800">Cancel</button>
            <button type="submit" disabled={submitting} className="px-6 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-medium">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
            </button>
          </div>
        </form>
      )}

      {appointments.length > 0 ? (
        <div className="space-y-2">
          {appointments.map((appt) => (
            <div key={appt._id} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:shadow-card transition-all group">
              <div className="flex-shrink-0 p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                <CalendarClock size={20} className="text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{appt.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-surface-500">{formatDate(appt.date)} {appt.time && `· ${appt.time}`}</span>
                  {appt.location && <><span className="text-surface-300">·</span><span className="text-xs text-surface-500 flex items-center gap-0.5"><MapPin size={10} /> {appt.location}</span></>}
                  {appt.relatedPerson && <><span className="text-surface-300">·</span><span className="text-xs text-surface-500 flex items-center gap-0.5"><User size={10} /> {appt.relatedPerson}</span></>}
                </div>
              </div>
              <button onClick={() => deleteAppointment(appt._id)} className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger-400/10 text-surface-400 hover:text-danger-500 transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800">
          <CalendarClock size={40} className="mx-auto text-surface-300 mb-3" />
          <p className="text-surface-600 dark:text-surface-400 font-medium">No appointments</p>
          <p className="text-sm text-surface-400 mt-1">Schedule your first appointment.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium"><Plus size={16} /> Add Appointment</button>
        </div>
      )}
    </div>
  );
}
