import mongoose, { Schema, Document } from 'mongoose';

export interface IAIInteraction extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'chat' | 'extraction' | 'planning' | 'detection';
  
  // Chat-based interactions
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  
  // Extraction results
  extractedData?: Record<string, unknown>;
  sourceDocumentId?: mongoose.Types.ObjectId;
  
  // What was created as a result
  createdEntities: Array<{
    entityType: 'task' | 'bill' | 'appointment' | 'reminder';
    entityId: mongoose.Types.ObjectId;
    confirmed: boolean;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const aiInteractionSchema = new Schema<IAIInteraction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['chat', 'extraction', 'planning', 'detection'],
      required: true,
    },
    messages: [{
      role: { type: String, enum: ['user', 'assistant'], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    }],
    extractedData: { type: Schema.Types.Mixed },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    createdEntities: [{
      entityType: { type: String, enum: ['task', 'bill', 'appointment', 'reminder'] },
      entityId: { type: Schema.Types.ObjectId },
      confirmed: { type: Boolean, default: false },
    }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAIInteraction>('AIInteraction', aiInteractionSchema);
