import mongoose, { Schema, Document } from 'mongoose';

export interface IGoogleOAuthState extends Document {
  nonce: string;
  userId: mongoose.Types.ObjectId;
  csrfTokenHash?: string;
  expiresAt: Date;
  createdAt: Date;
}

const googleOAuthStateSchema = new Schema<IGoogleOAuthState>(
  {
    nonce: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    csrfTokenHash: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Automatically expire stale OAuth state tokens
googleOAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IGoogleOAuthState>('GoogleOAuthState', googleOAuthStateSchema);

