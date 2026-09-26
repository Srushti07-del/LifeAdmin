import mongoose, { Schema, Document } from 'mongoose';

// Flexible recurrence system: separates HOW OFTEN from HOW LONG
export interface IRecurrence {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval?: number;      // e.g., 2 for "every 2 months"
  unit?: 'days' | 'weeks' | 'months' | 'years';
  endDate?: Date;         // When the recurrence stops
  durationMonths?: number; // Duration of subscription/membership (separate from recurrence)
}

export interface IBill extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  provider?: string;
  amount: number;
  currency: string;
  dueDate: Date;
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'upcoming';
  category: string;
  startDate?: Date;
  endDate?: Date;
  recurrence: IRecurrence;
  reminderDaysBefore: number[];
  notes?: string;
  attachments: string[]; // receipts/documents
  
  // AI metadata
  aiGenerated: boolean;
  aiConfirmed: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const recurrenceSchema = new Schema<IRecurrence>(
  {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'],
      default: 'none',
    },
    interval: { type: Number, min: 1 },
    unit: { type: String, enum: ['days', 'weeks', 'months', 'years'] },
    endDate: { type: Date },
    durationMonths: { type: Number },
  },
  { _id: false }
);

const billSchema = new Schema<IBill>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    provider: { type: String, trim: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: '₹' },
    dueDate: { type: Date, required: true, index: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'overdue', 'upcoming'],
      default: 'pending',
    },
    category: { type: String, default: 'Finance' },
    startDate: { type: Date },
    endDate: { type: Date },
    recurrence: { type: recurrenceSchema, default: () => ({ type: 'none' }) },
    reminderDaysBefore: { type: [Number], default: [7, 3, 1, 0] },
    notes: { type: String },
    attachments: { type: [String], default: [] },
    
    aiGenerated: { type: Boolean, default: false },
    aiConfirmed: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

billSchema.index({ userId: 1, paymentStatus: 1, dueDate: 1 });

export default mongoose.model<IBill>('Bill', billSchema);
