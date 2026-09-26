import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarEvent extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  location?: string;
  category: string;
  color?: string;
  
  // Source tracking — an event can originate from any module
  sourceType?: 'task' | 'bill' | 'appointment' | 'reminder' | 'manual';
  sourceId?: mongoose.Types.ObjectId;
  
  recurrence: {
    type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    interval?: number;
    unit?: 'days' | 'weeks' | 'months' | 'years';
    endDate?: Date;
  };
  
  reminderDaysBefore: number[];
  
  createdAt: Date;
  updatedAt: Date;
}

const calendarEventSchema = new Schema<ICalendarEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    allDay: { type: Boolean, default: false },
    location: { type: String },
    category: { type: String, default: 'Personal' },
    color: { type: String },
    
    sourceType: {
      type: String,
      enum: ['task', 'bill', 'appointment', 'reminder', 'manual'],
    },
    sourceId: { type: Schema.Types.ObjectId },
    
    recurrence: {
      type: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'],
        default: 'none',
      },
      interval: { type: Number },
      unit: { type: String, enum: ['days', 'weeks', 'months', 'years'] },
      endDate: { type: Date },
    },
    
    reminderDaysBefore: { type: [Number], default: [1, 0] },
  },
  {
    timestamps: true,
  }
);

calendarEventSchema.index({ userId: 1, startDate: 1 });

export default mongoose.model<ICalendarEvent>('CalendarEvent', calendarEventSchema);
