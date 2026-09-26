import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { GoogleGenerativeAI } from '@google/generative-ai';
import AIInteraction from '../models/AIInteraction';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import DocumentModel from '../models/Document';
import { authenticate } from '../middleware/auth';
import config from '../config';

const router = Router();
router.use(authenticate);

// Initialize Gemini if API key is configured
let geminiModel: any = null;
if (config.geminiApiKey) {
  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  } catch (err) {
    console.warn('Could not initialize GoogleGenerativeAI:', err);
  }
}

// Built-in intelligent LifeAdmin context generator
async function getUserLifeAdminContext(userId: any) {
  const [tasks, bills, appointments, reminders, documents] = await Promise.all([
    Task.find({ userId, status: { $ne: 'completed' } }).limit(20).sort('dueDate'),
    Bill.find({ userId, paymentStatus: { $ne: 'paid' } }).limit(20).sort('dueDate'),
    Appointment.find({ userId, date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }).limit(20).sort('date'),
    Reminder.find({ userId, status: 'active' }).limit(20).sort('dueDate'),
    DocumentModel.find({ userId }).limit(10).sort('-createdAt'),
  ]);

  return {
    tasks: tasks.map(t => ({ id: t._id, title: t.title, dueDate: t.dueDate, priority: t.priority, status: t.status })),
    bills: bills.map(b => ({ id: b._id, title: b.name, amount: b.amount, dueDate: b.dueDate, provider: b.provider })),
    appointments: appointments.map(a => ({ id: a._id, title: a.title, date: a.date, time: a.time, location: a.location })),
    reminders: reminders.map(r => ({ id: r._id, title: r.title, dueDate: r.dueDate })),
    documents: documents.map(d => ({ id: d._id, name: d.originalName, type: d.documentType, category: d.category })),
  };
}

// Helper to formulate fallback intelligent responses when no external API key is configured
function generateIntelligentFallbackResponse(prompt: string, context: any) {
  const p = prompt.toLowerCase();
  let text = '';
  let suggestions: Array<{ type: 'task' | 'bill' | 'appointment' | 'reminder'; title: string; dueDate?: string; priority?: string; amount?: number }> = [];

  if (p.includes('what do i need to do') || p.includes('this week') || p.includes('today') || p.includes('urgent') || p.includes('summary')) {
    const urgentTasks = context.tasks.filter((t: any) => t.priority === 'urgent' || t.priority === 'high');
    const pendingBills = context.bills;
    const nextAppts = context.appointments;

    text = `Here is your LifeAdmin status summary:\n\n` +
      `📋 **Tasks Needing Attention**: You have ${context.tasks.length} active tasks (${urgentTasks.length} high/urgent priority).\n` +
      (urgentTasks.length > 0 ? urgentTasks.map((t: any) => `  • **${t.title}** (Priority: ${t.priority}, Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'})`).join('\n') + '\n\n' : '  • No urgent tasks at this moment.\n\n') +
      `💳 **Pending Bills**: You have ${pendingBills.length} unpaid bill(s).\n` +
      (pendingBills.length > 0 ? pendingBills.map((b: any) => `  • **${b.title}** ($${b.amount}) - Due: ${new Date(b.dueDate).toLocaleDateString()}`).join('\n') + '\n\n' : '  • All current bills are paid! ✨\n\n') +
      `📅 **Upcoming Appointments**: ${nextAppts.length} scheduled.\n` +
      (nextAppts.length > 0 ? nextAppts.map((a: any) => `  • **${a.title}** on ${new Date(a.date).toLocaleDateString()} at ${a.time || 'all day'}${a.location ? ` (${a.location})` : ''}`).join('\n') + '\n\n' : '  • No immediate appointments.\n\n') +
      `🔔 **Reminders**: ${context.reminders.length} unacknowledged reminder(s).`;
  } else if (p.includes('bill') || p.includes('pay') || p.includes('money') || p.includes('expense')) {
    if (context.bills.length === 0) {
      text = `You have no pending bills right now! Would you like me to help you log a new upcoming bill?`;
    } else {
      const totalAmount = context.bills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
      text = `You have **${context.bills.length} pending bill(s)** totaling **$${totalAmount.toFixed(2)}**:\n\n` +
        context.bills.map((b: any) => `• **${b.title}** ($${b.amount}) due on ${new Date(b.dueDate).toLocaleDateString()} to ${b.provider}`).join('\n') +
        `\n\nMake sure to pay before the due dates to avoid late fees.`;
    }
  } else if (p.includes('exam') || p.includes('assignment') || p.includes('study') || p.includes('plan')) {
    text = `Here is a structured preparation plan for your academic schedule:\n\n` +
      `1. **Break Down Topics & Materials** (3-4 days before)\n` +
      `2. **Active Recall & Practice Problems** (2 days before)\n` +
      `3. **Comprehensive Review & Mock Exam** (1 day before)\n` +
      `4. **Exam Day Logistics & Rest** (Day of exam)\n\n` +
      `I have prepared 3 recommended tasks you can add directly to your LifeAdmin workspace below:`;
    
    const d1 = new Date(); d1.setDate(d1.getDate() + 2);
    const d2 = new Date(); d2.setDate(d2.getDate() + 4);
    const d3 = new Date(); d3.setDate(d3.getDate() + 6);

    suggestions = [
      { type: 'task', title: 'Review lecture notes & create study cheat sheet', dueDate: d1.toISOString().split('T')[0], priority: 'high' },
      { type: 'task', title: 'Complete practice questions and problem sets', dueDate: d2.toISOString().split('T')[0], priority: 'urgent' },
      { type: 'task', title: 'Final timed mock test & formula memorization', dueDate: d3.toISOString().split('T')[0], priority: 'urgent' },
    ];
  } else {
    text = `I can help manage your everyday responsibilities across tasks, bills, appointments, documents, and reminders!\n\n` +
      `You currently have:\n` +
      `• ${context.tasks.length} active tasks\n` +
      `• ${context.bills.length} unpaid bills\n` +
      `• ${context.appointments.length} appointments\n` +
      `• ${context.documents.length} uploaded documents\n\n` +
      `Ask me things like:\n` +
      `• *"What do I need to do this week?"*\n` +
      `• *"What bills are due soon?"*\n` +
      `• *"Help me plan preparation for finals"* or *"Break down my apartment move"*`;
  }

  return { text, suggestions };
}

// POST /api/ai/chat — Conversational assistant with LifeAdmin memory & action suggestions
router.post(
  '/chat',
  [body('message').notEmpty().withMessage('Message is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { message, conversationId } = req.body;
      const userId = req.user!._id;

      // 1. Fetch live LifeAdmin context
      const context = await getUserLifeAdminContext(userId);

      let replyText = '';
      let suggestions: any[] = [];

      // 2. Call Gemini if available, otherwise use intelligent built-in fallback
      if (geminiModel) {
        try {
          const systemContext = `You are LifeAdmin AI, a personal life-management copilot for college students and young professionals.
You help organize everyday responsibilities: tasks, bills, appointments, documents, calendar, and reminders.
Current user data:
Active Tasks: ${JSON.stringify(context.tasks)}
Unpaid Bills: ${JSON.stringify(context.bills)}
Appointments: ${JSON.stringify(context.appointments)}
Reminders: ${JSON.stringify(context.reminders)}
Recent Documents: ${JSON.stringify(context.documents)}

Be concise, supportive, actionable, and structured with bullet points.
If the user asks to plan something or if action items naturally emerge, suggest clear items they can add to their schedule.`;

          const result = await geminiModel.generateContent([systemContext, message]);
          replyText = result.response.text();
        } catch (apiErr) {
          console.warn('Gemini API call failed, falling back to local assistant:', apiErr);
          const fallback = generateIntelligentFallbackResponse(message, context);
          replyText = fallback.text;
          suggestions = fallback.suggestions;
        }
      } else {
        const fallback = generateIntelligentFallbackResponse(message, context);
        replyText = fallback.text;
        suggestions = fallback.suggestions;
      }

      // 3. Persist AI interaction
      let interaction;
      if (conversationId) {
        interaction = await AIInteraction.findOne({ _id: conversationId, userId });
      }

      if (!interaction) {
        interaction = new AIInteraction({
          userId,
          type: 'chat',
          messages: [
            { role: 'user', content: message, timestamp: new Date() },
            { role: 'assistant', content: replyText, timestamp: new Date() },
          ],
        });
      } else {
        interaction.messages.push({ role: 'user', content: message, timestamp: new Date() });
        interaction.messages.push({ role: 'assistant', content: replyText, timestamp: new Date() });
      }

      await interaction.save();

      res.json({
        reply: replyText,
        suggestions,
        conversationId: interaction._id,
      });
    } catch (error) {
      console.error('AI Chat error:', error);
      res.status(500).json({ message: 'Failed to process AI chat request' });
    }
  }
);

// POST /api/ai/plan — Planning assistant (Phase 4.3: breakdown assignments, exams, moves, etc.)
router.post(
  '/plan',
  [body('goal').notEmpty().withMessage('Goal or scenario is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { goal, targetDate } = req.body;
      const baseDate = targetDate ? new Date(targetDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Break goal down into actionable tasks
      const step1Date = new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000);
      const step2Date = new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const step3Date = new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000);

      const planTasks = [
        {
          title: `Initial Prep: Outline materials & scope for "${goal}"`,
          dueDate: step1Date > new Date() ? step1Date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          priority: 'medium',
          category: 'Work/Study',
        },
        {
          title: `Execution: Complete core deliverables / study phase for "${goal}"`,
          dueDate: step2Date > new Date() ? step2Date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          priority: 'high',
          category: 'Work/Study',
        },
        {
          title: `Final Review & Submission / Readiness Check: "${goal}"`,
          dueDate: step3Date > new Date() ? step3Date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          priority: 'urgent',
          category: 'Work/Study',
        },
      ];

      res.json({
        plan: `Created a 3-step action roadmap for: "${goal}" targeting ${baseDate.toLocaleDateString()}`,
        tasks: planTasks,
      });
    } catch (error) {
      console.error('AI Plan error:', error);
      res.status(500).json({ message: 'Failed to generate plan' });
    }
  }
);

// POST /api/ai/detect — Responsibility detection from pasted text/email/syllabus (Phase 4.4)
router.post(
  '/detect',
  [body('text').notEmpty().withMessage('Text snippet is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { text } = req.body;
      const detectedItems: any[] = [];
      const lower = text.toLowerCase();

      // Simple regex pattern searches for dates, amounts, deadlines
      if (lower.includes('due') || lower.includes('deadline') || lower.includes('submit')) {
        detectedItems.push({
          type: 'task',
          title: 'Action Item from text: Submit deliverable / assignment',
          description: text.slice(0, 150),
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high',
        });
      }

      const dollarMatch = text.match(/\$\s?(\d+(?:\.\d{2})?)/);
      if (dollarMatch || lower.includes('bill') || lower.includes('pay') || lower.includes('rent')) {
        detectedItems.push({
          type: 'bill',
          title: 'Payment responsibility detected',
          amount: dollarMatch ? parseFloat(dollarMatch[1]) : 50.0,
          provider: 'Detected Merchant / Service',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
      }

      if (lower.includes('appointment') || lower.includes('doctor') || lower.includes('meeting') || lower.includes('zoom')) {
        detectedItems.push({
          type: 'appointment',
          title: 'Upcoming meeting/appointment detected',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: text.slice(0, 150),
        });
      }

      if (detectedItems.length === 0) {
        // Fallback default detected task
        detectedItems.push({
          type: 'task',
          title: 'Extracted task from notes',
          description: text.slice(0, 120),
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'medium',
        });
      }

      res.json({
        summary: `Detected ${detectedItems.length} potential responsibility item(s) from your input.`,
        detectedItems,
      });
    } catch (error) {
      console.error('AI Detect error:', error);
      res.status(500).json({ message: 'Failed to detect responsibilities' });
    }
  }
);

// POST /api/ai/accept-suggestions — Bulk-create accepted AI items into the database
router.post('/accept-suggestions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body;
    const userId = req.user!._id;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'No items provided to create' });
      return;
    }

    const createdResults = [];

    for (const item of items) {
      if (item.type === 'task') {
        const task = new Task({
          userId,
          title: item.title,
          description: item.description || 'Created via LifeAdmin AI Copilot',
          dueDate: item.dueDate ? new Date(item.dueDate) : new Date(),
          priority: item.priority || 'medium',
          category: item.category || 'General',
          status: 'todo',
        });
        await task.save();
        createdResults.push({ type: 'task', item: task });
      } else if (item.type === 'bill') {
        const bill = new Bill({
          userId,
          name: item.title,
          provider: item.provider || 'Service Provider',
          amount: Number(item.amount) || 0,
          dueDate: item.dueDate ? new Date(item.dueDate) : new Date(),
          category: item.category || 'General',
          paymentStatus: 'pending',
          notes: 'Created via LifeAdmin AI Copilot',
        });
        await bill.save();
        createdResults.push({ type: 'bill', item: bill });
      } else if (item.type === 'appointment') {
        const appt = new Appointment({
          userId,
          title: item.title,
          date: item.date ? new Date(item.date) : new Date(),
          time: item.time || '10:00 AM',
          location: item.location || '',
          notes: item.notes || 'Created via LifeAdmin AI Copilot',
          category: item.category || 'Personal',
        });
        await appt.save();
        createdResults.push({ type: 'appointment', item: appt });
      } else if (item.type === 'reminder') {
        const reminder = new Reminder({
          userId,
          title: item.title,
          description: item.description || 'Created via LifeAdmin AI Copilot',
          dueDate: item.dueDate ? new Date(item.dueDate) : new Date(),
          category: item.category || 'General',
          status: 'active',
        });
        await reminder.save();
        createdResults.push({ type: 'reminder', item: reminder });
      }
    }

    res.status(201).json({
      message: `Successfully created ${createdResults.length} item(s)`,
      results: createdResults,
    });
  } catch (error) {
    console.error('Accept suggestions error:', error);
    res.status(500).json({ message: 'Failed to create suggested items' });
  }
});

export default router;
