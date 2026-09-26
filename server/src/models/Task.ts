import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  dueDate?: Date;
  dueTime?: string; // "14:30"
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed';
  category: string;
  reminderDaysBefore: number[];
  attachments: string[]; // file paths/URLs
  completedAt?: Date;
  
  // AI metadata
  aiGenerated: boolean;
  aiConfirmed: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    dueDate: { type: Date, index: true },
    dueTime: { type: String },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo',
    },
    category: { type: String, default: 'Personal' },
    reminderDaysBefore: { type: [Number], default: [1, 0] },
    attachments: { type: [String], default: [] },
    completedAt: { type: Date },
    
    aiGenerated: { type: Boolean, default: false },
    aiConfirmed: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient dashboard queries
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });

export default mongoose.model<ITask>('Task', taskSchema);
