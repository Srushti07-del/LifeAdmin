import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Task from '../models/Task';
import { authenticate, enforceOnboarding } from '../middleware/auth';

const router = Router();

// All task routes require authentication
router.use(authenticate);
router.use(enforceOnboarding);

// GET /api/tasks — List tasks with filtering
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      priority,
      category,
      dueBefore,
      dueAfter,
      sort = '-dueDate',
      limit = '50',
      page = '1',
    } = req.query;

    const filter: Record<string, unknown> = { userId: req.user!._id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (dueBefore || dueAfter) {
      filter.dueDate = {};
      if (dueBefore) (filter.dueDate as Record<string, unknown>).$lte = new Date(dueBefore as string);
      if (dueAfter) (filter.dueDate as Record<string, unknown>).$gte = new Date(dueAfter as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort(sort as string)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Task.countDocuments(filter),
    ]);

    res.json({
      tasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/:id — Get single task
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    if (task.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
});

// POST /api/tasks — Create task
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('status').optional().isIn(['todo', 'in_progress', 'completed']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array()[0].msg });
        return;
      }

      const { _id, userId, createdAt, updatedAt, ...taskData } = req.body;
      const task = await Task.create({
        ...taskData,
        userId: req.user!._id,
      });

      res.status(201).json({ message: 'Task created', task });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ message: 'Failed to create task' });
    }
  }
);

// PUT /api/tasks/:id — Update task
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    const existingTask = await Task.findById(id);
    if (!existingTask) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    if (existingTask.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const { _id, userId, createdAt, updatedAt, ...updateData } = req.body;

    // If marking as completed, set completedAt
    if (updateData.status === 'completed' && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }
    // If un-completing, clear completedAt
    if (updateData.status && updateData.status !== 'completed') {
      updateData.completedAt = null;
    }

    const task = await Task.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Task updated', task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id — Delete task
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    const existingTask = await Task.findById(id);
    if (!existingTask) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    if (existingTask.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    await Task.findByIdAndDelete(id);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

export default router;
