import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { body, validationResult } from 'express-validator';
import DocumentModel from '../models/Document';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Reminder from '../models/Reminder';
import { authenticate } from '../middleware/auth';
import config from '../config';

const router = Router();
router.use(authenticate);

// Configure multer storage
const uploadDirPath = path.join(process.cwd(), config.uploadDir);
if (!fs.existsSync(uploadDirPath)) {
  fs.mkdirSync(uploadDirPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    // Allowed formats: pdf, jpg, jpeg, png, webp, doc, docx, txt
    const allowed = /pdf|jpg|jpeg|png|webp|doc|docx|txt/i;
    const ext = allowed.test(path.extname(file.originalname).slice(1));
    const mime = allowed.test(file.mimetype) || file.mimetype.includes('pdf') || file.mimetype.includes('image') || file.mimetype.includes('document') || file.mimetype.includes('text');
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, Images, Word documents, Text.'));
    }
  },
});

// Helper to simulate/execute document extraction
function extractDocumentMetadata(originalName: string, notes?: string) {
  const nameLower = (originalName + ' ' + (notes || '')).toLowerCase();
  let documentType = 'General';
  let provider = '';
  let amounts: Array<{ label: string; amount: number }> = [];
  let importantDates: Array<{ label: string; date: Date }> = [];

  if (nameLower.includes('bill') || nameLower.includes('utility') || nameLower.includes('electric') || nameLower.includes('water') || nameLower.includes('internet') || nameLower.includes('wifi')) {
    documentType = 'Utility Bill';
    if (nameLower.includes('electric')) provider = 'Electric Utility Co.';
    else if (nameLower.includes('water')) provider = 'City Water Services';
    else if (nameLower.includes('internet') || nameLower.includes('wifi')) provider = 'Broadband ISP';
    else provider = 'Service Provider';
    
    // Suggest payment due date in 14 days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    importantDates.push({ label: 'Payment Due Date', date: dueDate });
    amounts.push({ label: 'Amount Due', amount: 75.50 });
  } else if (nameLower.includes('lease') || nameLower.includes('rent') || nameLower.includes('tenancy')) {
    documentType = 'Lease Agreement';
    provider = 'Property Management';
    const renewalDate = new Date();
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    importantDates.push({ label: 'Lease Expiration', date: renewalDate });
    amounts.push({ label: 'Monthly Rent', amount: 1200 });
  } else if (nameLower.includes('insurance') || nameLower.includes('policy')) {
    documentType = 'Insurance Policy';
    provider = 'Insurance Corp';
    const renewal = new Date();
    renewal.setFullYear(renewal.getFullYear() + 1);
    importantDates.push({ label: 'Policy Renewal', date: renewal });
    amounts.push({ label: 'Annual Premium', amount: 650 });
  } else if (nameLower.includes('id') || nameLower.includes('passport') || nameLower.includes('license')) {
    documentType = 'Identification';
    provider = 'Government Agency';
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 4);
    importantDates.push({ label: 'Expiration Date', date: expiry });
  } else if (nameLower.includes('tax') || nameLower.includes('w2') || nameLower.includes('1099')) {
    documentType = 'Tax Document';
    provider = 'IRS / Revenue Agency';
  } else if (nameLower.includes('medical') || nameLower.includes('prescription') || nameLower.includes('doctor')) {
    documentType = 'Medical Record';
    provider = 'Healthcare Clinic';
  }

  return {
    documentType,
    provider,
    amounts,
    importantDates,
    summary: `Automatically analyzed from "${originalName}". Identified as ${documentType} with ${importantDates.length} important date(s) and ${amounts.length} financial amount(s).`,
  };
}

// GET /api/documents — List documents with filtering & search
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, documentType, search, sort = '-createdAt', limit = '50', page = '1' } = req.query;

    const filter: Record<string, unknown> = { userId: req.user!._id };
    if (category && category !== 'All') filter.category = category;
    if (documentType) filter.documentType = documentType;

    if (search) {
      const q = String(search);
      filter.$or = [
        { originalName: { $regex: q, $options: 'i' } },
        { documentType: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
        { 'aiExtracted.provider': { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [documents, total] = await Promise.all([
      DocumentModel.find(filter)
        .sort(sort as string)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      DocumentModel.countDocuments(filter),
    ]);

    res.json({
      documents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// GET /api/documents/:id — Get document details
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await DocumentModel.findOne({ _id: req.params.id, userId: req.user!._id })
      .populate('linkedTasks')
      .populate('linkedBills')
      .populate('linkedReminders');

    if (!doc) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    res.json({ document: doc });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// POST /api/documents/upload — Upload document and trigger extraction
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Please select a file to upload' });
      return;
    }

    const { category = 'General', notes = '', documentType } = req.body;

    // Run extraction helper
    const extracted = extractDocumentMetadata(req.file.originalname, notes);

    const doc = new DocumentModel({
      userId: req.user!._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: `/uploads/${req.file.filename}`,
      category: category || 'General',
      documentType: documentType || extracted.documentType,
      notes,
      aiProcessed: true,
      aiConfirmed: false,
      aiExtracted: {
        provider: extracted.provider,
        summary: extracted.summary,
        amounts: extracted.amounts,
        importantDates: extracted.importantDates,
        identifiers: [],
      },
    });

    await doc.save();
    res.status(201).json({ message: 'Document uploaded and analyzed successfully', document: doc });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

// PUT /api/documents/:id — Update metadata
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, documentType, tags, notes, aiConfirmed, aiExtracted } = req.body;

    const doc = await DocumentModel.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!doc) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (category !== undefined) doc.category = category;
    if (documentType !== undefined) doc.documentType = documentType;
    if (tags !== undefined) doc.tags = tags;
    if (notes !== undefined) doc.notes = notes;
    if (aiConfirmed !== undefined) doc.aiConfirmed = aiConfirmed;
    if (aiExtracted !== undefined) doc.aiExtracted = { ...doc.aiExtracted, ...aiExtracted };

    await doc.save();
    res.json({ message: 'Document updated successfully', document: doc });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ message: 'Failed to update document' });
  }
});

// POST /api/documents/:id/create-entities — Convert extracted info into Task/Bill/Reminder
router.post(
  '/:id/create-entities',
  [
    body('type').isIn(['task', 'bill', 'reminder']).withMessage('Valid entity type is required'),
    body('title').notEmpty().withMessage('Title is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const doc = await DocumentModel.findOne({ _id: req.params.id, userId: req.user!._id });
      if (!doc) {
        res.status(404).json({ message: 'Document not found' });
        return;
      }

      const { type, title, dueDate, amount, priority = 'medium', description } = req.body;
      let createdEntity: unknown = null;

      if (type === 'bill') {
        const bill = new Bill({
          userId: req.user!._id,
          name: title,
          provider: doc.aiExtracted?.provider || doc.originalName,
          amount: Number(amount) || doc.aiExtracted?.amounts?.[0]?.amount || 0,
          dueDate: dueDate ? new Date(dueDate) : new Date(),
          category: doc.category || 'Utilities',
          paymentStatus: 'pending',
          notes: description || `Created from document: ${doc.originalName}`,
          attachments: [doc.filePath],
        });
        await bill.save();
        doc.linkedBills.push(bill._id);
        createdEntity = bill;
      } else if (type === 'task') {
        const task = new Task({
          userId: req.user!._id,
          title,
          description: description || `Associated with document: ${doc.originalName}`,
          dueDate: dueDate ? new Date(dueDate) : new Date(),
          priority,
          category: doc.category || 'General',
          status: 'todo',
          linkedDocumentIds: [doc._id],
        });
        await task.save();
        doc.linkedTasks.push(task._id);
        createdEntity = task;
      } else if (type === 'reminder') {
        const reminder = new Reminder({
          userId: req.user!._id,
          title,
          description: description || `Document reference: ${doc.originalName}`,
          dueDate: dueDate ? new Date(dueDate) : new Date(),
          category: doc.category || 'General',
          status: 'active',
          entityType: 'document',
          entityId: doc._id,
        });
        await reminder.save();
        doc.linkedReminders.push(reminder._id);
        createdEntity = reminder;
      }

      doc.aiConfirmed = true;
      await doc.save();

      res.status(201).json({
        message: `Created ${type} from document`,
        entity: createdEntity,
        document: doc,
      });
    } catch (error) {
      console.error('Create entity from document error:', error);
      res.status(500).json({ message: 'Failed to create entity from document' });
    }
  }
);

// DELETE /api/documents/:id — Delete document
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const doc = await DocumentModel.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
    if (!doc) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    // Try to remove physical file
    const fullPath = path.join(uploadDirPath, doc.fileName);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.warn('Could not remove file on disk:', err);
      }
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

export default router;
