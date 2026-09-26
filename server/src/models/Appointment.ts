import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  date: Date;
  time?: string; // "14:30"
  endTime?: string;
  location?: string;
  notes?: string;
  relatedPerson?: string;
  relatedOrganization?: string;
  category: string;
  reminderDaysBefore: number[];
  attachments: string[];
  
  aiGenerated: boolean;
  aiConfirmed: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    time: { type: String },
    endTime: { type: String },
    location: { type: String, trim: true },
    notes: { type: String },
    relatedPerson: { type: String, trim: true },
    relatedOrganization: { type: String, trim: true },
    category: { type: String, default: 'Personal' },
    reminderDaysBefore: { type: [Number], default: [1, 0] },
    attachments: { type: [String], default: [] },
    
    aiGenerated: { type: Boolean, default: false },
    aiConfirmed: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ userId: 1, date: 1 });

export default mongoose.model<IAppointment>('Appointment', appointmentSchema);
