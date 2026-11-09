import mongoose from 'mongoose';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import CalendarEvent from '../models/CalendarEvent';
import DocumentModel from '../models/Document';

/**
 * Seeds realistic demo data for a guest/demo user.
 * All records are scoped to the provided userId, ensuring
 * complete data isolation from real users.
 */
export async function seedDemoData(userId: mongoose.Types.ObjectId): Promise<void> {
  const now = new Date();
  const d = (offsetDays: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offsetDays);
    return date;
  };

  // ── Tasks ──────────────────────────────────────────────────────────────────
  await Task.insertMany([
    {
      userId,
      title: 'Renew vehicle insurance',
      description: 'Contact insurance provider and renew policy before expiry date.',
      dueDate: d(5),
      priority: 'high',
      status: 'todo',
      category: 'Finance',
    },
    {
      userId,
      title: 'Book annual health check-up',
      description: 'Schedule comprehensive blood panel and general check-up.',
      dueDate: d(12),
      priority: 'medium',
      status: 'todo',
      category: 'Health',
    },
    {
      userId,
      title: 'Prepare quarterly budget review',
      description: 'Compare Q3 spending against targets and update projections.',
      dueDate: d(3),
      priority: 'urgent',
      status: 'in_progress',
      category: 'Finance',
    },
    {
      userId,
      title: 'Organise home office cables',
      description: 'Label and tidy power strips, HDMI and USB cables.',
      dueDate: d(20),
      priority: 'low',
      status: 'todo',
      category: 'Home',
    },
    {
      userId,
      title: 'Complete online Python course',
      description: 'Finish the final two modules and earn the certificate.',
      dueDate: d(-2), // overdue
      priority: 'medium',
      status: 'in_progress',
      category: 'Education',
    },
    {
      userId,
      title: 'Submit passport renewal documents',
      description: 'Gather required photos and address proof before submitting online.',
      dueDate: d(30),
      priority: 'medium',
      status: 'todo',
      category: 'Personal',
    },
    {
      userId,
      title: 'Read "Deep Work" by Cal Newport',
      description: 'Finish the book and take chapter notes.',
      dueDate: d(45),
      priority: 'low',
      status: 'completed',
      category: 'Personal',
      completedAt: d(-5),
    },
  ]);

  // ── Bills ──────────────────────────────────────────────────────────────────
  await Bill.insertMany([
    {
      userId,
      name: 'Electricity Bill',
      provider: 'MSEDCL',
      amount: 2340,
      currency: 'INR',
      dueDate: d(4),
      paymentStatus: 'pending',
      category: 'Utilities',
      recurrence: { type: 'monthly', interval: 1 },
    },
    {
      userId,
      name: 'Broadband Internet',
      provider: 'JioFiber',
      amount: 999,
      currency: 'INR',
      dueDate: d(-3), // overdue
      paymentStatus: 'overdue',
      category: 'Utilities',
      recurrence: { type: 'monthly', interval: 1 },
    },
    {
      userId,
      name: 'Monthly Rent',
      provider: 'Landlord',
      amount: 18000,
      currency: 'INR',
      dueDate: d(1),
      paymentStatus: 'pending',
      category: 'Housing',
      recurrence: { type: 'monthly', interval: 1 },
    },
    {
      userId,
      name: 'Health Insurance Premium',
      provider: 'Star Health',
      amount: 7850,
      currency: 'INR',
      dueDate: d(18),
      paymentStatus: 'upcoming',
      category: 'Insurance',
      recurrence: { type: 'yearly', interval: 1 },
    },
    {
      userId,
      name: 'OTT Subscription Bundle',
      provider: 'JioCinema',
      amount: 299,
      currency: 'INR',
      dueDate: d(-10),
      paymentStatus: 'paid',
      category: 'Entertainment',
      recurrence: { type: 'monthly', interval: 1 },
    },
  ]);

  // ── Appointments ──────────────────────────────────────────────────────────
  await Appointment.insertMany([
    {
      userId,
      title: 'Dental Check-up & Cleaning',
      date: d(7),
      time: '10:30',
      endTime: '11:30',
      location: 'Smile Care Dental Clinic, Baner',
      relatedPerson: 'Dr. Meera Shah',
      category: 'Health',
      notes: 'Bring previous X-rays. Ask about teeth whitening options.',
    },
    {
      userId,
      title: 'Financial Advisor Meeting',
      date: d(14),
      time: '15:00',
      endTime: '16:00',
      location: 'HDFC Securities, FC Road Branch',
      relatedPerson: 'Mr. Rahul Deshmukh',
      relatedOrganization: 'HDFC Securities',
      category: 'Finance',
      notes: 'Review SIP portfolio and discuss mutual fund rebalancing.',
    },
    {
      userId,
      title: 'Team Retrospective — Q3',
      date: d(2),
      time: '14:00',
      endTime: '15:30',
      location: 'Google Meet (online)',
      relatedOrganization: 'Work',
      category: 'Work',
      notes: 'Prepare brief on delivered vs deferred items.',
    },
    {
      userId,
      title: 'Car Service & Oil Change',
      date: d(21),
      time: '09:00',
      endTime: '12:00',
      location: 'Honda Authorised Service, Wakad',
      category: 'Home',
      notes: 'Book drop off. Mention minor windshield vibration.',
    },
  ]);

  // ── Reminders ─────────────────────────────────────────────────────────────
  await Reminder.insertMany([
    {
      userId,
      title: 'Pay electricity bill',
      description: 'MSEDCL bill due in 4 days. Last month: ₹2,340.',
      dueDate: d(4),
      dueTime: '09:00',
      entityType: 'bill',
      status: 'active',
      priority: 'high',
      category: 'Finance',
    },
    {
      userId,
      title: 'Take cholesterol medication',
      description: 'Daily evening reminder — take after dinner.',
      dueDate: d(0),
      dueTime: '21:00',
      entityType: 'custom',
      status: 'active',
      priority: 'high',
      category: 'Health',
    },
    {
      userId,
      title: 'Call parents this weekend',
      description: 'Catch up and plan for the upcoming holiday trip.',
      dueDate: d(2),
      entityType: 'custom',
      status: 'active',
      priority: 'medium',
      category: 'Personal',
    },
    {
      userId,
      title: 'Submit travel expense report',
      description: 'Deadline for October travel reimbursement claims.',
      dueDate: d(-1), // past due
      entityType: 'custom',
      status: 'acknowledged',
      acknowledgedAt: d(-1),
      priority: 'medium',
      category: 'Work',
    },
  ]);

  // ── Calendar Events ───────────────────────────────────────────────────────
  await CalendarEvent.insertMany([
    {
      userId,
      title: 'Diwali Family Celebration',
      description: 'Annual family get-together at home. Guests arriving from 6pm.',
      startDate: d(10),
      allDay: true,
      category: 'Personal',
      color: '#F59E0B',
      sourceType: 'manual',
    },
    {
      userId,
      title: 'Weekly Team Standup',
      description: 'Monday morning sync — 15 minutes.',
      startDate: d(1),
      startTime: '09:30',
      endTime: '09:45',
      allDay: false,
      category: 'Work',
      color: '#168F91',
      sourceType: 'manual',
      recurrence: { type: 'weekly', interval: 1 },
    },
    {
      userId,
      title: 'Gym — Leg Day',
      description: 'Squats, lunges, leg press. Trainer: Priya.',
      startDate: d(3),
      startTime: '07:00',
      endTime: '08:00',
      allDay: false,
      category: 'Health',
      color: '#10B981',
      sourceType: 'manual',
    },
  ]);

  // ── Documents ─────────────────────────────────────────────────────────────
  await DocumentModel.insertMany([
    {
      userId,
      fileName: 'demo_health_insurance.pdf',
      originalName: 'Star_Health_Family_Optima_2026.pdf',
      mimeType: 'application/pdf',
      fileSize: 2450000,
      filePath: 'uploads/demo_health_insurance.pdf',
      documentType: 'Insurance',
      category: 'Health',
      tags: ['insurance', 'medical', 'family'],
      notes: 'Policy coverage: ₹10,00,000 for entire family. Cashless hospitalisation.',
      aiProcessed: true,
      aiConfirmed: true,
      aiExtractionStatus: 'completed',
      aiExtracted: {
        provider: 'Star Health & Allied Insurance',
        expiryDate: d(180),
        renewalDate: d(170),
        importantDates: [{ label: 'Policy Start', date: d(-185) }, { label: 'Policy Expiry', date: d(180) }],
        amounts: [{ label: 'Sum Insured', amount: 1000000 }, { label: 'Annual Premium', amount: 7850 }],
        identifiers: [{ label: 'Policy Number', value: 'SH-2025-998811' }],
        summary: 'Comprehensive health coverage with ₹10 Lakh sum insured. Cashless network includes 14,000+ hospitals.',
      },
    },
    {
      userId,
      fileName: 'demo_rental_agreement.pdf',
      originalName: 'Apartment_Rental_Agreement_Baner.pdf',
      mimeType: 'application/pdf',
      fileSize: 1820000,
      filePath: 'uploads/demo_rental_agreement.pdf',
      documentType: 'Contract',
      category: 'Housing',
      tags: ['rent', 'agreement', 'housing'],
      notes: '11-month lease agreement. Deposit paid: ₹50,000.',
      aiProcessed: true,
      aiConfirmed: true,
      aiExtractionStatus: 'completed',
      aiExtracted: {
        provider: 'Landlord - S. Sharma',
        expiryDate: d(240),
        importantDates: [{ label: 'Agreement Expiry', date: d(240) }],
        amounts: [{ label: 'Monthly Rent', amount: 18000 }, { label: 'Security Deposit', amount: 50000 }],
        identifiers: [{ label: 'Flat No', value: 'B-402, Green Meadows' }],
        summary: 'Standard 11-month tenancy agreement with 5% escalation clause upon renewal.',
      },
    },
    {
      userId,
      fileName: 'demo_vehicle_rc.pdf',
      originalName: 'Vehicle_Registration_Certificate_MH12.pdf',
      mimeType: 'application/pdf',
      fileSize: 890000,
      filePath: 'uploads/demo_vehicle_rc.pdf',
      documentType: 'Certificate',
      category: 'Vehicle',
      tags: ['vehicle', 'car', 'rc'],
      notes: 'Honda City 2022 Petrol. PUC valid till next quarter.',
      aiProcessed: true,
      aiConfirmed: true,
      aiExtractionStatus: 'completed',
      aiExtracted: {
        provider: 'Regional Transport Office, Pune',
        expiryDate: d(1200),
        importantDates: [{ label: 'Registration Date', date: d(-1000) }],
        amounts: [],
        identifiers: [{ label: 'Registration No', value: 'MH-12-AB-1234' }, { label: 'Chassis No', value: 'MA3FBEB1S00987123' }],
        summary: 'Registration Certificate issued by RTO Pune. Class: Light Motor Vehicle (Car).',
      },
    },
  ]);
}

