import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
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

// Truthful document classification helper — does NOT fabricate extracted data.
// Only classifies document type based on filename/notes keywords.
// No amounts, providers, or dates are invented.
function classifyDocument(originalName: string, notes?: string) {
  const nameLower = (originalName + ' ' + (notes || '')).toLowerCase();
  let documentType = 'General';

  if (nameLower.includes('bill') || nameLower.includes('utility') || nameLower.includes('electric') || nameLower.includes('water') || nameLower.includes('internet') || nameLower.includes('wifi')) {
    documentType = 'Utility Bill';
  } else if (nameLower.includes('lease') || nameLower.includes('rent') || nameLower.includes('tenancy')) {
    documentType = 'Lease Agreement';
  } else if (nameLower.includes('insurance') || nameLower.includes('policy')) {
    documentType = 'Insurance Policy';
  } else if (nameLower.includes('id') || nameLower.includes('passport') || nameLower.includes('license')) {
    documentType = 'Identification';
  } else if (nameLower.includes('tax') || nameLower.includes('w2') || nameLower.includes('1099')) {
    documentType = 'Tax Document';
  } else if (nameLower.includes('medical') || nameLower.includes('prescription') || nameLower.includes('doctor')) {
    documentType = 'Medical Record';
  }

  return {
    documentType,
    summary: documentType !== 'General'
      ? `Classified as "${documentType}" based on filename. No content extraction was performed — OCR/AI extraction is not configured. You can manually add details or confirm the classification.`
      : `Document uploaded. No content extraction was performed — OCR/AI extraction is not configured. You can manually add details below.`,
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
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    const doc = await DocumentModel.findById(id)
      .populate('linkedTasks')
      .populate('linkedBills')
      .populate('linkedReminders');

    if (!doc) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (doc.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ document: doc });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
});

// GET /api/documents/:id/download — Authenticated document file download
// Verifies ownership and prevents path traversal before serving the file.
router.get('/:id/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    // Explicit ownership check
    if (doc.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // Path traversal prevention: use only the stored basename, never any client input
    const safeFilename = path.basename(doc.fileName);
    const fullPath = path.join(uploadDirPath, safeFilename);

    // Verify the resolved path is actually inside the upload directory
    const resolvedPath = path.resolve(fullPath);
    const resolvedUploadDir = path.resolve(uploadDirPath);
    if (!resolvedPath.startsWith(resolvedUploadDir + path.sep) && resolvedPath !== resolvedUploadDir) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    if (!fs.existsSync(resolvedPath)) {
      res.status(404).json({ message: 'File not found on disk' });
      return;
    }

    // Set appropriate headers for download/inline viewing
    const contentDisposition = req.query.download === 'true'
      ? `attachment; filename="${encodeURIComponent(doc.originalName)}"`
      : `inline; filename="${encodeURIComponent(doc.originalName)}"`;

    res.setHeader('Content-Disposition', contentDisposition);
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.sendFile(resolvedPath);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ message: 'Failed to download document' });
  }
});

// POST /api/documents/upload — Upload document with truthful classification
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Please select a file to upload' });
      return;
    }

    const { category = 'General', notes = '', documentType, expiryDate } = req.body;

    // Classify document type from filename — no fake extraction
    const classification = classifyDocument(req.file.originalname, notes);

    const doc = new DocumentModel({
      userId: req.user!._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: `/api/documents/placeholder/download`, // not used for access; download route uses doc ID
      category: category || 'General',
      documentType: documentType || classification.documentType,
      notes,
      aiProcessed: false, // No real extraction was performed
      aiConfirmed: false,
      aiExtracted: {
        provider: '',
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        summary: classification.summary,
        amounts: [],
        importantDates: [],
        identifiers: [],
      },
    });

    await doc.save();

    // Update filePath to use the actual document ID for the download route
    doc.filePath = `/api/documents/${doc._id}/download`;
    await doc.save();

    res.status(201).json({ message: 'Document uploaded and classified', document: doc });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

// PUT /api/documents/:id — Update metadata
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (doc.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const { category, documentType, tags, notes, aiConfirmed, aiExtracted, expiryDate } = req.body;

    if (category !== undefined) doc.category = category;
    if (documentType !== undefined) doc.documentType = documentType;
    if (tags !== undefined) doc.tags = tags;
    if (notes !== undefined) doc.notes = notes;
    if (aiConfirmed !== undefined) doc.aiConfirmed = aiConfirmed;
    if (aiExtracted !== undefined) doc.aiExtracted = { ...doc.aiExtracted, ...aiExtracted };
    if (expiryDate !== undefined) {
      doc.aiExtracted = doc.aiExtracted || {};
      doc.aiExtracted.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    }

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

      const id = req.params.id as string;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(404).json({ message: 'Document not found' });
        return;
      }

      const doc = await DocumentModel.findById(id);
      if (!doc) {
        res.status(404).json({ message: 'Document not found' });
        return;
      }

      if (doc.userId.toString() !== req.user!._id.toString()) {
        res.status(403).json({ message: 'Access denied' });
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
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (doc.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    // Remove DB record
    await DocumentModel.findByIdAndDelete(id);

    // Try to remove physical file
    const safeFilename = path.basename(doc.fileName);
    const fullPath = path.join(uploadDirPath, safeFilename);
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
