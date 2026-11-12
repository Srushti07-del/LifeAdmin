import mongoose, { Schema, Document } from 'mongoose';

export type GoogleConnectionStatus = 'connected' | 'disconnected' | 'error' | 'expired';

export interface IGoogleCalendarConnection extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  googleId: string; // Google account ID (sub claim)
  googleEmail: string;
  googleName?: string;
  googlePicture?: string;

  // Encrypted tokens
  encryptedAccessToken?: string; // Short-lived, mostly for immediate use
  encryptedRefreshToken: string; // Long-lived, used to obtain new access tokens

  // Token metadata
  accessTokenExpiresAt?: Date;
  tokenType?: string;
  scope?: string;

  // Connection state
  status: GoogleConnectionStatus;
  connectedAt: Date;
  disconnectedAt?: Date;
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  lastSyncError?: string;

  // Selected Google calendar for two-way sync
  selectedCalendarId: string;
  selectedCalendarName?: string;
  selectedCalendarTimezone?: string;

  // Google sync token for incremental changes
  googleSyncToken?: string;

  // Google watch channel (for push notifications)
  watchChannelId?: string;
  watchResourceId?: string;
  watchChannelTokenHash?: string;
  watchExpiration?: Date;

  // Lease timestamp for cross-worker sync serialization
  syncLockedUntil?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const googleCalendarConnectionSchema = new Schema<IGoogleCalendarConnection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    googleId: { type: String, required: true },
    googleEmail: { type: String, required: true, lowercase: true, trim: true },
    googleName: { type: String, trim: true },
    googlePicture: { type: String },

    encryptedAccessToken: { type: String },
    encryptedRefreshToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date },
    tokenType: { type: String },
    scope: { type: String },

    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'expired'],
      default: 'connected',
      index: true,
    },
    connectedAt: { type: Date, required: true, default: Date.now },
    disconnectedAt: { type: Date },
    lastSyncAt: { type: Date },
    lastSyncStatus: { type: String, enum: ['success', 'partial', 'failed'] },
    lastSyncError: { type: String, trim: true },

    selectedCalendarId: { type: String, required: true, default: 'primary' },
    selectedCalendarName: { type: String },
    selectedCalendarTimezone: { type: String },

    googleSyncToken: { type: String },

    watchChannelId: { type: String },
    watchResourceId: { type: String },
    watchChannelTokenHash: { type: String },
    watchExpiration: { type: Date },

    syncLockedUntil: { type: Date },
  },
  { timestamps: true }
);

googleCalendarConnectionSchema.index({ googleId: 1 }, { unique: true, sparse: true });
googleCalendarConnectionSchema.index({ watchChannelId: 1 }, { unique: true, sparse: true });

export default mongoose.model<IGoogleCalendarConnection>('GoogleCalendarConnection', googleCalendarConnectionSchema);
