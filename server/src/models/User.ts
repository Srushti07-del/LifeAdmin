import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  profilePicture?: string;
  googleId?: string;
  authProvider: 'local' | 'google';
  
  // Preferences
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  defaultReminderTiming: number[]; // days before due date
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "07:00"
  categories: string[];
  aiPreferences: {
    autoExtract: boolean;
    suggestionsEnabled: boolean;
  };
  
  // Subscription
  subscriptionTier: 'free' | 'premium' | 'premium_ai';
  subscriptionExpiresAt?: Date;
  
  // Future-proofing for household support
  householdId?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
  
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false }, // Not returned by default
    profilePicture: { type: String, default: '' },
    googleId: { type: String, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    
    // Preferences
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    notificationsEnabled: { type: Boolean, default: true },
    defaultReminderTiming: { type: [Number], default: [7, 3, 1, 0] }, // 7d, 3d, 1d, due today
    quietHoursStart: { type: String },
    quietHoursEnd: { type: String },
    categories: {
      type: [String],
      default: ['Personal', 'Work', 'Finance', 'Health', 'Education', 'Home'],
    },
    aiPreferences: {
      autoExtract: { type: Boolean, default: true },
      suggestionsEnabled: { type: Boolean, default: true },
    },
    
    // Subscription
    subscriptionTier: {
      type: String,
      enum: ['free', 'premium', 'premium_ai'],
      default: 'free',
    },
    subscriptionExpiresAt: { type: Date },
    
    // Future household support
    householdId: { type: Schema.Types.ObjectId, ref: 'Household' },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
