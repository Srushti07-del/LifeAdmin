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
  const suggestions: Array<{ type: 'task' | 'bill' | 'appointment' | 'reminder'; title: string; dueDate?: string; priority?: string; amount?: number; status?: string }> = [];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (p.includes('overdue') || p.includes('late') || p.includes('missed')) {
    const overdueTasks = context.tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'completed');
    const overdueBills = context.bills.filter((b: any) => b.dueDate && new Date(b.dueDate) < today);

    text = `🚨 **Overdue Responsibilities Audit**:\n\n`;
    if (overdueTasks.length === 0 && overdueBills.length === 0) {
      text += `Great news! You have no overdue tasks or bills right now. Everything is on schedule.`;
    } else {
      if (overdueTasks.length > 0) {
        text += `**Overdue Tasks (${overdueTasks.length})**:\n` +
          overdueTasks.map((t: any) => `• **${t.title}** (Priority: ${t.priority}, Due: ${new Date(t.dueDate).toLocaleDateString()})`).join('\n') + '\n\n';
      }
      if (overdueBills.length > 0) {
        text += `**Overdue Bills (${overdueBills.length})**:\n` +
          overdueBills.map((b: any) => `• **${b.title}** ($${b.amount}) due on ${new Date(b.dueDate).toLocaleDateString()} to ${b.provider || 'vendor'}`).join('\n') + '\n\n';
      }
      text += `💡 Recommendation: Resolve these high-urgency items first to prevent penalties or missed obligations.`;
    }
  } else if (p.includes('prioritize') || p.includes('priority') || p.includes('first')) {
    const urgentTasks = context.tasks.filter((t: any) => t.priority === 'urgent' || t.priority === 'high');
    const upcomingBills = context.bills.slice(0, 3);

    text = `🎯 **Priority Action Plan**:\n\n` +
      `Here is the recommended order of focus based on urgency:\n\n`;
    let rank = 1;
    for (const t of urgentTasks.slice(0, 3)) {
      text += `${rank++}. 📋 **Task**: ${t.title} [Priority: ${t.priority}] — Target: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Immediate'}\n`;
    }
    for (const b of upcomingBills) {
      text += `${rank++}. 💳 **Bill**: Pay ${b.title} ($${b.amount}) due ${new Date(b.dueDate).toLocaleDateString()}\n`;
    }
    if (rank === 1) {
      text += `You have no high-urgency tasks or pending bills right now! Review your standard task list or relax.`;
    }
  } else if (p.includes('appointment') || p.includes('meeting') || p.includes('doctor') || p.includes('visit')) {
    if (context.appointments.length === 0) {
      text = `You have no appointments currently scheduled in your LifeAdmin calendar.`;
    } else {
      text = `📅 **Upcoming Appointments (${context.appointments.length})**:\n\n` +
        context.appointments.map((a: any) => `• **${a.title}** on ${new Date(a.date).toLocaleDateString()} at ${a.time || 'all day'}${a.location ? ` @ ${a.location}` : ''}`).join('\n');
    }
  } else if (p.includes('bill') || p.includes('pay') || p.includes('money') || p.includes('expense')) {
    if (context.bills.length === 0) {
      text = `You have no pending bills right now! All payments are up to date.`;
    } else {
      const totalAmount = context.bills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
      text = `💳 **Pending Bills (${context.bills.length})** totaling **$${totalAmount.toFixed(2)}**:\n\n` +
        context.bills.map((b: any) => `• **${b.title}** ($${b.amount}) due on ${new Date(b.dueDate).toLocaleDateString()} to ${b.provider || 'provider'}`).join('\n') +
        `\n\nEnsure payment is processed before each due date.`;
    }
  } else if (p.includes('what do i need to do') || p.includes('this week') || p.includes('today') || p.includes('summary')) {
    const urgentTasks = context.tasks.filter((t: any) => t.priority === 'urgent' || t.priority === 'high');
    const pendingBills = context.bills;
    const nextAppts = context.appointments;

    text = `📋 **Your LifeAdmin Workspace Summary**:\n\n` +
      `• **Active Tasks**: ${context.tasks.length} total (${urgentTasks.length} urgent/high priority)\n` +
      (urgentTasks.length > 0 ? urgentTasks.map((t: any) => `  - **${t.title}** (Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'})`).join('\n') + '\n' : '') +
      `• **Unpaid Bills**: ${pendingBills.length} pending\n` +
      (pendingBills.length > 0 ? pendingBills.map((b: any) => `  - **${b.title}** ($${b.amount}) due ${new Date(b.dueDate).toLocaleDateString()}`).join('\n') + '\n' : '') +
      `• **Scheduled Appointments**: ${nextAppts.length}\n` +
      (nextAppts.length > 0 ? nextAppts.map((a: any) => `  - **${a.title}** on ${new Date(a.date).toLocaleDateString()} at ${a.time || 'all day'}`).join('\n') + '\n' : '') +
      `• **Active Reminders**: ${context.reminders.length}\n` +
      `• **Stored Documents**: ${context.documents.length}`;
  } else {
    text = `I can help coordinate your daily responsibilities across tasks, bills, appointments, documents, and reminders!\n\n` +
      `Current snapshot:\n` +
      `• ${context.tasks.length} tasks\n` +
      `• ${context.bills.length} bills\n` +
      `• ${context.appointments.length} appointments\n` +
      `• ${context.reminders.length} reminders\n` +
      `• ${context.documents.length} documents\n\n` +
      `Try asking:\n` +
      `• *"What responsibilities are overdue?"*\n` +
      `• *"What should I prioritize today?"*\n` +
      `• *"What bills are due soon?"*\n` +
      `• *"What appointments are coming up?"*\n` +
      `• *"Summarize my upcoming week"*`;
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

// POST /api/ai/plan — Planning assistant
// Uses Gemini if available; otherwise returns generic template tasks clearly marked as suggestions.
router.post(
  '/plan',
  [body('goal').notEmpty().withMessage('Goal or scenario is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { goal, targetDate } = req.body;
      const baseDate = targetDate ? new Date(targetDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      if (geminiModel) {
        try {
          const prompt = `You are LifeAdmin AI. The user wants to plan for: "${goal}" with a target date of ${baseDate.toLocaleDateString()}.
Break this into 3-5 actionable task steps with realistic titles, due dates (ISO format YYYY-MM-DD), and priority levels (low/medium/high/urgent).
Respond ONLY in this JSON format:
{
  "plan": "Brief summary of the plan",
  "tasks": [{ "title": "...", "dueDate": "YYYY-MM-DD", "priority": "medium", "category": "Work/Study" }]
}`;
          const result = await geminiModel.generateContent(prompt);
          const responseText = result.response.text();
          // Try to parse JSON from response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const planTasks = (parsed.tasks || []).map((t: any) => ({
              ...t,
              status: 'suggestion',
            }));
            res.json({
              plan: parsed.plan || `AI-generated plan for: "${goal}"`,
              tasks: planTasks,
              source: 'ai',
            });
            return;
          }
        } catch (apiErr) {
          console.warn('Gemini plan call failed, falling back to template:', apiErr);
        }
      }

      // Fallback: generic template — clearly marked as template suggestions, not AI analysis
      const step1Date = new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000);
      const step2Date = new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const step3Date = new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000);

      const planTasks = [
        {
          title: `Initial Prep: Outline materials & scope for "${goal}"`,
          dueDate: step1Date > new Date() ? step1Date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          priority: 'medium',
          category: 'Work/Study',
          status: 'suggestion',
        },
        {
          title: `Execution: Complete core deliverables / study phase for "${goal}"`,
          dueDate: step2Date > new Date() ? step2Date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          priority: 'high',
          category: 'Work/Study',
          status: 'suggestion',
        },
        {
          title: `Final Review & Submission / Readiness Check: "${goal}"`,
          dueDate: step3Date > new Date() ? step3Date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          priority: 'urgent',
          category: 'Work/Study',
          status: 'suggestion',
        },
      ];

      res.json({
        plan: `Template roadmap for: "${goal}" targeting ${baseDate.toLocaleDateString()}. These are generic suggestions — review and adjust before adding.`,
        tasks: planTasks,
        source: 'template',
      });
    } catch (error) {
      console.error('AI Plan error:', error);
      res.status(500).json({ message: 'Failed to generate plan' });
    }
  }
);

// POST /api/ai/detect — Responsibility detection from pasted text/email/syllabus
// Only returns items with genuine evidence found in the text. Never fabricates data.
router.post(
  '/detect',
  [body('text').notEmpty().withMessage('Text snippet is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { text } = req.body;

      // If Gemini is available, use it for real analysis
      if (geminiModel) {
        try {
          const prompt = `You are LifeAdmin AI. Analyze this text and detect any actionable responsibilities (tasks, bills, appointments, reminders).
For each detected item, extract ONLY information that is explicitly stated in the text. Do NOT invent dates, amounts, or names that aren't present.
If a field is not found in the text, omit it.

Text to analyze:
"${text.slice(0, 2000)}"

Respond ONLY in this JSON format:
{
  "summary": "Brief description of what was found",
  "detectedItems": [
    {
      "type": "task|bill|appointment|reminder",
      "title": "Descriptive title based on actual text content",
      "description": "Relevant excerpt from text",
      "dueDate": "YYYY-MM-DD if explicitly mentioned",
      "amount": 123.45,
      "provider": "Provider name if explicitly mentioned",
      "confidence": "high|medium|low",
      "status": "suggestion"
    }
  ]
}
If nothing actionable is found, return an empty detectedItems array.`;

          const result = await geminiModel.generateContent(prompt);
          const responseText = result.response.text();
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // Ensure all items are marked as suggestions
            const items = (parsed.detectedItems || []).map((item: any) => ({
              ...item,
              status: 'suggestion',
              confidence: item.confidence || 'medium',
            }));
            res.json({
              summary: parsed.summary || `Analyzed text and found ${items.length} potential item(s).`,
              detectedItems: items,
              source: 'ai',
            });
            return;
          }
        } catch (apiErr) {
          console.warn('Gemini detect call failed, falling back to pattern matching:', apiErr);
        }
      }

      // Fallback: simple pattern matching — only extract genuinely present data
      const detectedItems: any[] = [];
      const lower = text.toLowerCase();

      // Try to find actual dollar amounts in the text
      const dollarMatches = text.matchAll(/\$\s?(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
      for (const match of dollarMatches) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        detectedItems.push({
          type: 'bill',
          title: `Payment of $${amount} detected in text`,
          description: text.slice(Math.max(0, match.index! - 40), Math.min(text.length, match.index! + match[0].length + 40)).trim(),
          amount,
          status: 'suggestion',
          confidence: 'medium',
        });
      }

      // Try to find explicit date patterns (MM/DD/YYYY, YYYY-MM-DD, Month DD, etc.)
      const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
        /(\d{4}-\d{2}-\d{2})/g,
        /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?)/gi,
      ];

      for (const pattern of datePatterns) {
        const dateMatches = text.matchAll(pattern);
        for (const match of dateMatches) {
          const parsedDate = new Date(match[1]);
          if (!isNaN(parsedDate.getTime())) {
            // Check surrounding text for context
            const surrounding = text.slice(Math.max(0, match.index! - 60), Math.min(text.length, match.index! + match[0].length + 60));
            const surroundLower = surrounding.toLowerCase();

            let type: string = 'task';
            let titlePrefix = 'Date reference';
            if (surroundLower.includes('due') || surroundLower.includes('deadline') || surroundLower.includes('submit')) {
              titlePrefix = 'Deadline';
            } else if (surroundLower.includes('appointment') || surroundLower.includes('meeting') || surroundLower.includes('visit')) {
              type = 'appointment';
              titlePrefix = 'Appointment';
            } else if (surroundLower.includes('pay') || surroundLower.includes('bill') || surroundLower.includes('rent')) {
              type = 'bill';
              titlePrefix = 'Payment due';
            }

            detectedItems.push({
              type,
              title: `${titlePrefix}: ${match[1]}`,
              description: surrounding.trim(),
              dueDate: parsedDate.toISOString().split('T')[0],
              status: 'suggestion',
              confidence: 'medium',
            });
          }
        }
      }

      // If the text mentions deadlines/tasks but no dates were found, note that
      if (detectedItems.length === 0 && (lower.includes('due') || lower.includes('deadline') || lower.includes('submit') || lower.includes('appointment'))) {
        detectedItems.push({
          type: 'task',
          title: 'Potential action item detected — no specific date found',
          description: text.slice(0, 150),
          status: 'suggestion',
          confidence: 'low',
        });
      }

      const summary = detectedItems.length > 0
        ? `Found ${detectedItems.length} potential item(s) based on pattern matching. Review each carefully before adding — dates and amounts are extracted from the text but may need correction.`
        : `No specific dates, amounts, or actionable items were detected in the provided text. Try pasting text that contains explicit dates, dollar amounts, or deadline keywords.`;

      res.json({
        summary,
        detectedItems,
        source: 'pattern-matching',
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
