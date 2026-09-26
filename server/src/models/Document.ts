import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentMeta extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  
  // Metadata
  documentType?: string; // Insurance, ID, Certificate, Receipt, etc.
  category: string;
  tags: string[];
  notes?: string;
  
  // AI-extracted info
  aiExtracted: {
    provider?: string;
    expiryDate?: Date;
    renewalDate?: Date;
    importantDates: Array<{ label: string; date: Date }>;
    amounts: Array<{ label: string; amount: number }>;
    identifiers: Array<{ label: string; value: string }>;
    summary?: string;
    rawExtraction?: string;
  };
  aiProcessed: boolean;
  aiConfirmed: boolean;
  
  // Linked entities
  linkedTasks: mongoose.Types.ObjectId[];
  linkedBills: mongoose.Types.ObjectId[];
  linkedReminders: mongoose.Types.ObjectId[];
  
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocumentMeta>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    
    documentType: { type: String },
    category: { type: String, default: 'General' },
    tags: { type: [String], default: [] },
    notes: { type: String },
    
    aiExtracted: {
      provider: { type: String },
      expiryDate: { type: Date },
      renewalDate: { type: Date },
      importantDates: [{
        label: { type: String },
        date: { type: Date },
      }],
      amounts: [{
        label: { type: String },
        amount: { type: Number },
      }],
      identifiers: [{
        label: { type: String },
        value: { type: String },
      }],
      summary: { type: String },
      rawExtraction: { type: String },
    },
    aiProcessed: { type: Boolean, default: false },
    aiConfirmed: { type: Boolean, default: false },
    
    linkedTasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    linkedBills: [{ type: Schema.Types.ObjectId, ref: 'Bill' }],
    linkedReminders: [{ type: Schema.Types.ObjectId, ref: 'Reminder' }],
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ userId: 1, category: 1 });
documentSchema.index({ userId: 1, 'aiExtracted.expiryDate': 1 });

export default mongoose.model<IDocumentMeta>('Document', documentSchema);
