import mongoose, { Schema, Document } from 'mongoose';

export type EmailNotificationType =
  | 'task_deadline'
  | 'overdue_task'
  | 'bill_payment'
  | 'appointment'
  | 'reminder'
  | 'document_deadline';

export interface IEmailNotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: EmailNotificationType;
  title: string;
  message?: string;
  entityType?: 'task' | 'bill' | 'appointment' | 'document' | 'reminder';
  entityId?: mongoose.Types.ObjectId;

  // When the email should be sent (in user's local time converted to UTC for storage)
  scheduledFor: Date;

  // Delivery state
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  sentAt?: Date;

  // Idempotency: prevents duplicate emails for the same event + reminder interval
  dedupeKey: string;

  createdAt: Date;
  updatedAt: Date;
}

const emailNotificationSchema = new Schema<IEmailNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'task_deadline',
        'overdue_task',
        'bill_payment',
        'appointment',
        'reminder',
        'document_deadline',
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    entityType: {
      type: String,
      enum: ['task', 'bill', 'appointment', 'document', 'reminder'],
    },
    entityId: { type: Schema.Types.ObjectId },

    scheduledFor: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    errorMessage: { type: String, trim: true },
    sentAt: { type: Date },

    dedupeKey: { type: String, trim: true, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient scheduler queries
emailNotificationSchema.index(
  { userId: 1, status: 1, scheduledFor: 1 },
  { name: 'user_status_scheduled_idx' }
);
emailNotificationSchema.index(
  { status: 1, scheduledFor: 1 },
  { name: 'status_scheduled_idx' }
);

// Unique dedupe key per user (partial, only for non-null dedupeKey)
emailNotificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);

export default mongoose.model<IEmailNotification>('EmailNotification', emailNotificationSchema);
