import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'reminder' | 'deadline' | 'overdue' | 'ai_suggestion' | 'system';
  
  // What triggered this notification
  entityType?: 'task' | 'bill' | 'appointment' | 'document' | 'reminder';
  entityId?: mongoose.Types.ObjectId;
  
  read: boolean;
  readAt?: Date;
  
  // Push notification tracking
  pushSent: boolean;
  pushSentAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['reminder', 'deadline', 'overdue', 'ai_suggestion', 'system'],
      default: 'system',
    },
    entityType: {
      type: String,
      enum: ['task', 'bill', 'appointment', 'document', 'reminder'],
    },
    entityId: { type: Schema.Types.ObjectId },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    pushSent: { type: Boolean, default: false },
    pushSentAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
