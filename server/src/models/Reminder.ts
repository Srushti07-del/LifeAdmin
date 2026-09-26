import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  dueDate: Date;
  dueTime?: string;
  
  // What this reminder is for
  entityType?: 'task' | 'bill' | 'appointment' | 'document' | 'custom';
  entityId?: mongoose.Types.ObjectId;
  
  // Reminder schedule
  reminderDaysBefore: number[];
  
  // Status
  status: 'active' | 'acknowledged' | 'dismissed' | 'completed';
  acknowledgedAt?: Date;
  
  // Smart notification tracking
  lastNotifiedAt?: Date;
  notificationCount: number;
  
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  aiGenerated: boolean;
  aiConfirmed: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    dueDate: { type: Date, required: true, index: true },
    dueTime: { type: String },
    
    entityType: {
      type: String,
      enum: ['task', 'bill', 'appointment', 'document', 'custom'],
    },
    entityId: { type: Schema.Types.ObjectId },
    
    reminderDaysBefore: { type: [Number], default: [1, 0] },
    
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'dismissed', 'completed'],
      default: 'active',
    },
    acknowledgedAt: { type: Date },
    
    lastNotifiedAt: { type: Date },
    notificationCount: { type: Number, default: 0 },
    
    category: { type: String, default: 'Personal' },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    
    aiGenerated: { type: Boolean, default: false },
    aiConfirmed: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

reminderSchema.index({ userId: 1, status: 1, dueDate: 1 });

export default mongoose.model<IReminder>('Reminder', reminderSchema);
