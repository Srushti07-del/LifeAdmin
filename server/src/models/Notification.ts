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

  // Prevent duplicate in-app alerts for the same reminder occurrence/offset.
  dedupeKey?: string;

  read: boolean;
  readAt?: Date;
  dismissedAt?: Date;

  // Push notification tracking (in-app center is implemented; push delivery not claimed)
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
    dedupeKey: { type: String, trim: true },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
    dismissedAt: { type: Date },
    pushSent: { type: Boolean, default: false },
    pushSentAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, dismissedAt: 1, createdAt: -1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);

export default mongoose.model<INotification>('Notification', notificationSchema);
