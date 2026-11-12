import mongoose, { Schema, Document } from 'mongoose';

export type SyncSourceType = 'calendar_event' | 'task' | 'appointment' | 'bill' | 'reminder';

export type SyncState = 'synced' | 'pending_push' | 'pending_pull' | 'error' | 'conflict';

export interface ICalendarSyncMapping extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  googleConnectionId: mongoose.Types.ObjectId;

  // LifeAdmin record
  sourceType: SyncSourceType;
  sourceId: mongoose.Types.ObjectId;

  // Google Calendar record
  googleCalendarId: string;
  googleEventId?: string;
  googleEventEtag?: string;

  // Timestamps
  lastSyncedAt: Date;
  lastLocalChangeAt?: Date;
  lastGoogleChangeAt?: Date;

  // Sync state
  syncState: SyncState;
  syncError?: string;
  retryCount: number;

  // Conflict resolution
  localVersion?: number;
  googleVersion?: number;

  // Tombstone: if the Google event was deleted but LifeAdmin record exists
  googleEventDeleted: boolean;
  googleEventDeletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const calendarSyncMappingSchema = new Schema<ICalendarSyncMapping>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    googleConnectionId: { type: Schema.Types.ObjectId, ref: 'GoogleCalendarConnection', required: true, index: true },

    sourceType: {
      type: String,
      enum: ['calendar_event', 'task', 'appointment', 'bill', 'reminder'],
      required: true,
      index: true,
    },
    sourceId: { type: Schema.Types.ObjectId, required: true, index: true },

    googleCalendarId: { type: String, required: true, default: 'primary' },
    googleEventId: { type: String },
    googleEventEtag: { type: String },

    lastSyncedAt: { type: Date, required: true, default: Date.now },
    lastLocalChangeAt: { type: Date },
    lastGoogleChangeAt: { type: Date },

    syncState: {
      type: String,
      enum: ['synced', 'pending_push', 'pending_pull', 'error', 'conflict'],
      default: 'synced',
      index: true,
    },
    syncError: { type: String, trim: true },
    retryCount: { type: Number, default: 0 },

    localVersion: { type: Number },
    googleVersion: { type: Number },

    googleEventDeleted: { type: Boolean, default: false },
    googleEventDeletedAt: { type: Date },
  },
  { timestamps: true }
);

// Unique mapping per user + source record
calendarSyncMappingSchema.index(
  { userId: 1, sourceType: 1, sourceId: 1 },
  { unique: true }
);

// Unique mapping per user + google event when googleEventId is assigned (prevent duplicates from Google side
// while allowing unsynced pending_push records created before initial Google insert succeeds)
calendarSyncMappingSchema.index(
  { userId: 1, googleCalendarId: 1, googleEventId: 1 },
  { unique: true, partialFilterExpression: { googleEventId: { $type: 'string' } } }
);

// Efficient queries for pending sync
calendarSyncMappingSchema.index(
  { userId: 1, syncState: 1, updatedAt: 1 },
  { name: 'user_syncState_updated_idx' }
);

export default mongoose.model<ICalendarSyncMapping>('CalendarSyncMapping', calendarSyncMappingSchema);
