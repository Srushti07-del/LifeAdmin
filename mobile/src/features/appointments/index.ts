/**
 * LifeAdmin Mobile — Appointments Feature Module Barrel
 */

export * from './types';
export * from './services/appointmentService';
export {
  isAppointmentToday,
  isAppointmentUpcoming,
  isAppointmentPast,
  calculateAppointmentTotals,
  formatAppointmentTime,
  formatAppointmentDate,
  filterAndSortAppointments,
} from './services/appointmentCalculations';
export * from './components/AppointmentCard';
export * from './components/AppointmentSummaryCard';
export * from './components/AppointmentFormModal';
export * from './components/AppointmentDetailsModal';
