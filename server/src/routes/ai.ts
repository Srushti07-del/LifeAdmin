import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import AIInteraction from '../models/AIInteraction';
import Task from '../models/Task';
import Bill from '../models/Bill';
import Appointment from '../models/Appointment';
import Reminder from '../models/Reminder';
import DocumentModel from '../models/Document';
import { authenticate, enforceOnboarding } from '../middleware/auth';
import config from '../config';

const router = Router();
router.use(authenticate);
router.use(enforceOnboarding);

let geminiModel: any = null;
if (config.geminiApiKey && process.env.NODE_ENV !== 'test' && process.env.DISABLE_AI_MODEL !== '1') {
  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    geminiModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
  } catch (err) {
    console.warn('Could not initialize GoogleGenerativeAI:', err);
  }
}

const ACTION_TYPES = new Set(['task', 'bill', 'appointment', 'reminder']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function money(amount: unknown, currency = 'INR ') {
  const n = Number(amount);
  const cur = currency === '₹' ? 'INR ' : currency || 'INR ';
  return `${cur}${Number.isFinite(n) ? n.toLocaleString('en-IN') : '0'}`;
}
function fmtDate(d: unknown) {
  if (!d) return 'no date';
  const dt = new Date(d as any);
  return Number.isNaN(dt.getTime()) ? 'no date' : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function toIsoDate(input: unknown): string | undefined {
  if (!input) return undefined;
  const d = new Date(input as any);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().split('T')[0];
}
function parseAmount(input: string): number | undefined {
  const m = input.replace(/,/g, '').match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}
function parseDateFromText(input: string): string | undefined {
  const iso = input.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const mdy = input.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]20\d{2})\b/);
  if (mdy) { const d = new Date(mdy[1]); if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0]; }
  const lower = input.toLowerCase();
  const now = new Date();
  if (/\btoday\b/.test(lower)) return now.toISOString().split('T')[0];
  if (/\btomorrow\b/.test(lower)) { const d = new Date(now); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }
  const named = input.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s*20\d{2})?\b/i);
  if (named) { const d = new Date(named[0] + (/(20\d{2})/.test(named[0]) ? '' : ` ${now.getFullYear()}`)); if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0]; }
  return undefined;
}
function parseTime(input: string): string | undefined {
  const m = input.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  const ampm = input.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (!ampm) return undefined;
  let h = parseInt(ampm[1], 10);
  const min = parseInt(ampm[2] || '0', 10);
  const ap = ampm[3].toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
function cleanTitle(input: string): string {
  return input
    .replace(/^(please\s+)?(can you\s+|could you\s+)?(create|add|make|schedule|set up|set)\s+(a|an|new)?\s*(task|reminder|appointment|bill)\s*(to|for|called|named|:)?\s*/i, '')
    .replace(/\b(on|by|due|at|for)\b[\s\S]*$/i, (s) => (/amount|₹|rs|inr|\d/.test(s) ? '' : ''))
    .replace(/["']/g, '').trim().slice(0, 120);
}

async function getUserLifeAdminContext(userId: mongoose.Types.ObjectId) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const in7 = endOfDay(new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000));
  const [tasks, bills, appointments, reminders, documents] = await Promise.all([
    Task.find({ userId, status: { $ne: 'completed' } }).limit(40).sort({ dueDate: 1, priority: -1 }).lean(),
    Bill.find({ userId, paymentStatus: { $ne: 'paid' } }).limit(40).sort({ dueDate: 1 }).lean(),
    Appointment.find({ userId, date: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), $lte: in7 } }).limit(40).sort({ date: 1, time: 1 }).lean(),
    Reminder.find({ userId, status: { $ne: 'completed' } }).limit(40).sort({ dueDate: 1, dueTime: 1 }).lean(),
    DocumentModel.find({ userId }).limit(12).sort({ createdAt: -1 }).lean(),
  ]);
  const overdueTasks = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < todayStart);
  const dueTodayTasks = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) >= todayStart && new Date(t.dueDate) <= endOfDay(now));
  const overdueBills = bills.filter((b: any) => b.dueDate && new Date(b.dueDate) < todayStart);
  const dueSoonBills = bills.filter((b: any) => b.dueDate && new Date(b.dueDate) >= todayStart && new Date(b.dueDate) <= in7);
  const urgentTasks = tasks.filter((t: any) => t.priority === 'urgent' || t.priority === 'high');
  return {
    generatedAt: now.toISOString(),
    summary: { overdueTaskCount: overdueTasks.length, dueTodayTaskCount: dueTodayTasks.length, urgentOpenTaskCount: urgentTasks.length, overdueBillCount: overdueBills.length, dueSoonBillCount: dueSoonBills.length, upcomingAppointmentCount: appointments.length, activeReminderCount: reminders.filter((r: any) => r.status === 'active').length },
    overdueTasks: overdueTasks.map((t: any) => ({ id: String(t._id), title: t.title, dueDate: t.dueDate, priority: t.priority })),
    dueSoonBills: dueSoonBills.map((b: any) => ({ id: String(b._id), title: b.name, amount: b.amount, currency: b.currency || '₹', dueDate: b.dueDate })),
    tasks: tasks.map((t: any) => ({ id: String(t._id), title: t.title, dueDate: t.dueDate, priority: t.priority, status: t.status, category: t.category })),
    bills: bills.map((b: any) => ({ id: String(b._id), title: b.name, amount: b.amount, currency: b.currency || '₹', dueDate: b.dueDate, provider: b.provider, paymentStatus: b.paymentStatus })),
    appointments: appointments.map((a: any) => ({ id: String(a._id), title: a.title, date: a.date, time: a.time, location: a.location })),
    reminders: reminders.map((r: any) => ({ id: String(r._id), title: r.title, dueDate: r.dueDate, dueTime: r.dueTime, priority: r.priority, status: r.status })),
    documents: documents.map((d: any) => ({ id: String(d._id), name: d.originalName, type: d.documentType, category: d.category })),
  };
}

function inferActionFromText(message: string): { kind: 'create' | 'delete' | 'complete' | 'search'; type?: string; payload?: any; confirmationText: string } | null {
  const p = message.toLowerCase();
  const isDelete = /\b(delete|remove|cancel)\b/.test(p);
  const isComplete = /\b(complete|mark done|finish)\b/.test(p);
  const isCreate = /\b(create|add|make|schedule|set up|new)\b/.test(p);
  const type = /\b(reminder)\b/.test(p) ? 'reminder' : /\b(appointment|meeting|visit)\b/.test(p) ? 'appointment' : /\b(bill|payment|expense)\b/.test(p) ? 'bill' : /\b(task|todo)\b/.test(p) ? 'task' : undefined;
  const title = cleanTitle(message);
  if (isDelete) return { kind: 'delete', type, payload: { query: title || message }, confirmationText: `I can help find ${type ? `a ${type}` : 'an item'} matching "${title || 'that request'}", but I will not delete anything without your explicit confirmation in the app.` };
  if (isComplete && type) return { kind: 'complete', type, payload: { query: title || message }, confirmationText: `I can locate matching ${type}s, but I'll only mark one complete after you confirm the exact item.` };
  if (isCreate && type) {
    const dueDate = parseDateFromText(message);
    const dueTime = parseTime(message);
    const amount = parseAmount(message);
    const payload: any = { type, title: title || `New ${type}`, dueDate, dueTime, status: 'suggestion' };
    if (type === 'bill' && amount != null) payload.amount = amount;
    if (type === 'bill') payload.currency = '₹';
    if (/\burgent\b/.test(p)) payload.priority = 'urgent'; else if (/\bhigh\b/.test(p)) payload.priority = 'high';
    if (!payload.title || payload.title.toLowerCase() === `new ${type}`) return null;
    return { kind: 'create', type, payload, confirmationText: `I can prepare this ${type}, but I'll only create it if you confirm. ${!dueDate ? 'No clear date was found, so use a safe default only after review.' : ''}`.trim() };
  }
  if (/\b(find|search|show|which|what)\b/.test(p) && type) return { kind: 'search', type, payload: { query: title || message }, confirmationText: '' };
  return null;
}

function generateFallbackResponse(prompt: string, context: any) {
  const p = prompt.toLowerCase();
  const now = new Date();
  const today = startOfDay(now);
  const in7 = endOfDay(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
  const proposedActions: any[] = [];
  const action = inferActionFromText(prompt);
  if (action?.kind === 'create' && action.payload) proposedActions.push({ ...action.payload, requiresConfirmation: true, confirmationText: action.confirmationText });
  let text = '';

  if (/\b(overdue|late|missed)\b/.test(p) || /\b(bills? due soon|due soon bills?)\b/.test(p)) {
    const overdueTasks = context.tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < today);
    const overdueBills = context.bills.filter((b: any) => b.dueDate && new Date(b.dueDate) < today);
    const dueSoonBills = context.bills.filter((b: any) => b.dueDate && new Date(b.dueDate) >= today && new Date(b.dueDate) <= in7);
    const wantsDueSoon = /\bdue soon\b/.test(p) || (/\b(upcoming|approaching|next|soon)\b/.test(p) && /\b(bill|payment)\b/.test(p));
    text = overdueTasks.length || overdueBills.length ? '**Overdue items**\n\n' : '';
    if (overdueTasks.length) text += `**Tasks (${overdueTasks.length})**\n${overdueTasks.map((t: any) => `- ${t.title} - due ${fmtDate(t.dueDate)} (${t.priority || 'medium'})`).join('\n')}\n\n`;
    if (overdueBills.length) text += `**Bills (${overdueBills.length})**\n${overdueBills.map((b: any) => `- ${b.title} - ${money(b.amount, b.currency)} due ${fmtDate(b.dueDate)}`).join('\n')}\n\n`;
    if (!text && !wantsDueSoon) text = 'Nothing is overdue right now based on your current LifeAdmin data. Nice steady progress.';
    if (wantsDueSoon) text += `${text ? '' : 'No overdue items.\n\n'}**Bills due soon (next 7 days)**\n${dueSoonBills.length ? dueSoonBills.map((b: any) => `- ${b.title} - ${money(b.amount, b.currency)} due ${fmtDate(b.dueDate)}`).join('\n') : '- None'}\n\n`;
    if (!text.trim()) text = 'Nothing overdue right now based on your current LifeAdmin data.';
    if (overdueTasks.length || overdueBills.length) text += 'A good next step is to clear the oldest overdue item first, then handle anything due today.';
  } else if (/\b(focus|priorit|today|what should i)\b/.test(p)) {
    const urgent = context.tasks.filter((t: any) => ['urgent', 'high'].includes(t.priority)).slice(0, 4);
    const dueToday = context.tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= endOfDay(now));
    const bills = context.bills.filter((b: any) => b.dueDate && new Date(b.dueDate) <= in7).slice(0, 3);
    const lines: string[] = [];
    for (const t of [...new Map([...dueToday, ...urgent].map((x: any) => [x.id, x])).values()].slice(0, 5)) lines.push(`- Task: ${t.title} (${t.priority || 'medium'}${t.dueDate ? `, due ${fmtDate(t.dueDate)}` : ''})`);
    for (const b of bills) lines.push(`- Bill: ${b.title} - ${money(b.amount, b.currency)} due ${fmtDate(b.dueDate)}`);
    for (const a of context.appointments.slice(0, 3)) lines.push(`- Appointment: ${a.title} - ${fmtDate(a.date)}${a.time ? ` at ${a.time}` : ''}`);
    text = `**Today's focus (from your real data)**\n\n${lines.length ? lines.join('\n') : 'No urgent tasks, bills, or appointments need attention today based on your current records.'}`;
    if (action?.kind === 'create') text += '\n\nI also prepared an action below if you want me to add it after confirmation.';
  } else if (/\b(this week|week|upcoming|deadline|approaching)\b/.test(p)) {
    const tasks = context.tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= in7);
    const bills = context.bills.filter((b: any) => b.dueDate && new Date(b.dueDate) >= today && new Date(b.dueDate) <= in7);
    text = `**Upcoming this week**\n\nTasks (${tasks.length}):\n${tasks.length ? tasks.slice(0, 8).map((t: any) => `- ${t.title} - ${fmtDate(t.dueDate)} (${t.priority || 'medium'})`).join('\n') : '- No open tasks due this week.'}\n\nBills (${bills.length}):\n${bills.length ? bills.slice(0, 8).map((b: any) => `- ${b.title} - ${money(b.amount, b.currency)} due ${fmtDate(b.dueDate)}`).join('\n') : '- No unpaid bills due this week.'}\n\nAppointments (${context.appointments.length}):\n${context.appointments.length ? context.appointments.slice(0, 8).map((a: any) => `- ${a.title} - ${fmtDate(a.date)}${a.time ? ` at ${a.time}` : ''}`).join('\n') : '- No appointments in the next 7 days.'}`;
  } else if (/\b(bill|pay|money|expense|overdue bills?)\b/.test(p)) {
    if (!context.bills.length) text = 'You have no unpaid bills in your records right now.';
    else {
      const overdue = context.bills.filter((b: any) => b.dueDate && new Date(b.dueDate) < today);
      const total = context.bills.reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0);
      text = `**Bills snapshot**\n\n- Unpaid: ${context.bills.length}\n- Overdue: ${overdue.length}\n- Total unpaid amount (recorded): ${money(total, context.bills[0]?.currency || '₹')}\n\n${context.bills.slice(0, 10).map((b: any) => `- ${b.title} - ${money(b.amount, b.currency)} due ${fmtDate(b.dueDate)}${overdue.some((o: any) => o.id === b.id) ? ' (overdue)' : ''}`).join('\n')}`;
    }
  } else if (/\b(appointment|meeting|schedule|calendar)\b/.test(p) && !/\b(create|add|schedule a|new)\b/.test(p)) {
    text = context.appointments.length ? `**Upcoming appointments (next 7 days)**\n\n${context.appointments.map((a: any) => `- ${a.title} - ${fmtDate(a.date)}${a.time ? ` at ${a.time}` : ''}${a.location ? ` (${a.location})` : ''}`).join('\n')}` : 'You have no appointments scheduled in the next 7 days.';
  } else if (/\b(reminder)\b/.test(p) && !/\b(create|add|new)\b/.test(p)) {
    text = context.reminders.length ? `**Active/upcoming reminders**\n\n${context.reminders.slice(0, 10).map((r: any) => `- ${r.title} - ${fmtDate(r.dueDate)}${r.dueTime ? ` ${r.dueTime}` : ''} (${r.status})`).join('\n')}` : 'You have no active reminders right now.';
  } else if (/\b(task|todo)\b/.test(p) && !/\b(create|add|new)\b/.test(p)) {
    text = context.tasks.length ? `**Open tasks**\n\n${context.tasks.slice(0, 12).map((t: any) => `- ${t.title} - ${t.dueDate ? `due ${fmtDate(t.dueDate)}` : 'no due date'} (${t.priority || 'medium'})`).join('\n')}` : 'You have no open tasks right now.';
  } else if (/\b(document|file)\b/.test(p)) {
    text = context.documents.length ? `**Recent documents**\n\n${context.documents.map((d: any) => `- ${d.name}${d.type ? ` (${d.type})` : ''}`).join('\n')}` : "I don't see any documents in your account yet.";
  } else if (action?.kind === 'create' || action?.kind === 'delete' || action?.kind === 'complete') {
    text = action.confirmationText;
  } else if (/\b(hello|hi|hey|help)\b/.test(p) || p.trim().length < 4) {
    text = "Hi - I'm LifeBuddy, your LifeAdmin assistant. I can summarize your real tasks, bills, appointments, reminders, and documents, help you prioritize, and prepare actions like creating a reminder (with your confirmation before saving). What would you like to look at?";
  } else {
    text = `I can help using your LifeAdmin data. Right now I see ${context.summary.overdueTaskCount} overdue task(s), ${context.summary.overdueBillCount} overdue bill(s), ${context.summary.upcomingAppointmentCount} appointment(s) in the next 7 days, and ${context.summary.activeReminderCount} active reminder(s). Try: "What should I focus on today?", "What bills are overdue?", "What do I have scheduled this week?", or "Create a reminder to call the dentist tomorrow at 10:00".`;
    if (action?.kind === 'search') text += `\n\nTell me the ${action.type || 'item'} name and I'll look it up from your records.`;
  }
  return { text, proposedActions };
}

function buildGeminiPrompt(context: any, history: Array<{ role: string; content: string }>, message: string) {
  const recent = history.slice(-10).map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join('\n');
  return `You are LifeBuddy, the friendly in-app assistant for LifeAdmin.
Use ONLY the authenticated user's data below. Never invent records, dates, IDs, amounts, or statuses. If data is missing, say so clearly.
Be supportive, concise, and practical. Do not be repetitive.
You may propose actions (create task/reminder/appointment) but you MUST ask for confirmation before any create/edit/delete; never claim an action was completed.
Currency is INR unless the record specifies otherwise.
Current user data JSON:
${JSON.stringify({ summary: context.summary, tasks: context.tasks.slice(0, 15), bills: context.bills.slice(0, 15), appointments: context.appointments.slice(0, 12), reminders: context.reminders.slice(0, 12), documents: context.documents.slice(0, 8) })}
Recent conversation:
${recent || '(none)'}
User message:
${message}
Respond in plain helpful text. If the user asked to create/add/schedule something and enough detail exists, end with PROPOSED_ACTION_JSON: followed by one JSON object {"type":"reminder|task|appointment|bill","title":"...","dueDate":"YYYY-MM-DD","dueTime":"HH:mm","requiresConfirmation":true}. Omit that line if details are insufficient or destructive.`;
}

function parseGeminiAction(text: string): { cleanText: string; proposedActions: any[] } {
  const proposedActions: any[] = [];
  const idx = text.indexOf('PROPOSED_ACTION_JSON:');
  if (idx === -1) return { cleanText: text.trim(), proposedActions };
  const cleanText = text.slice(0, idx).trim();
  const jsonPart = text.slice(idx + 'PROPOSED_ACTION_JSON:'.length).trim();
  try {
    const obj = JSON.parse(jsonPart);
    if (obj && ACTION_TYPES.has(obj.type) && typeof obj.title === 'string' && obj.title.trim()) {
      proposedActions.push({ type: obj.type, title: obj.title.trim().slice(0, 120), description: typeof obj.description === 'string' ? obj.description.slice(0, 500) : undefined, dueDate: toIsoDate(obj.dueDate), dueTime: typeof obj.dueTime === 'string' && /^\d{2}:\d{2}$/.test(obj.dueTime) ? obj.dueTime : undefined, date: toIsoDate(obj.date) || toIsoDate(obj.dueDate), time: typeof obj.time === 'string' ? obj.time.slice(0, 20) : (typeof obj.dueTime === 'string' ? obj.dueTime : undefined), amount: Number.isFinite(Number(obj.amount)) ? Number(obj.amount) : undefined, currency: obj.currency || '₹', priority: PRIORITIES.has(obj.priority) ? obj.priority : undefined, requiresConfirmation: true, confirmationText: `Review and confirm to create this ${obj.type}.` });
    }
  } catch {}
  return { cleanText: cleanText || 'I can help with that. Please confirm any action before I create or change data.', proposedActions };
}

async function saveInteraction(userId: mongoose.Types.ObjectId, conversationId: string | undefined, userMessage: string, assistantMessage: string) {
  let interaction = null;
  if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) interaction = await AIInteraction.findOne({ _id: conversationId, userId });
  if (!interaction) interaction = new AIInteraction({ userId, type: 'chat', messages: [] });
  interaction.messages.push({ role: 'user', content: userMessage, timestamp: new Date() } as any);
  interaction.messages.push({ role: 'assistant', content: assistantMessage, timestamp: new Date() } as any);
  if (interaction.messages.length > 60) interaction.messages = interaction.messages.slice(-60) as any;
  await interaction.save();
  return interaction;
}

router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await AIInteraction.find({ userId: req.user!._id, type: 'chat' }).sort({ updatedAt: -1 }).limit(10).select('_id updatedAt messages').lean();
    res.json({ conversations: items.map((it: any) => ({ id: String(it._id), updatedAt: it.updatedAt, preview: ([...(it.messages || [])].reverse().find((m: any) => m.role === 'user')?.content || 'Conversation').slice(0, 90) })) });
  } catch (error) { console.error('AI conversations error:', error); res.status(500).json({ message: 'Failed to load conversations' }); }
});

router.get('/conversations/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) { res.status(404).json({ message: 'Conversation not found' }); return; }
    const item = await AIInteraction.findOne({ _id: id, userId: req.user!._id, type: 'chat' }).lean();
    if (!item) { res.status(404).json({ message: 'Conversation not found' }); return; }
    res.json({ conversation: { id: String(item._id), messages: (item.messages || []).map((m: any) => ({ role: m.role, content: m.content, timestamp: m.timestamp })) } });
  } catch (error) { console.error('AI conversation detail error:', error); res.status(500).json({ message: 'Failed to load conversation' }); }
});

router.post('/chat', [body('message').notEmpty().withMessage('Message is required')], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
    const { message, conversationId } = req.body;
    const userId = req.user!._id as mongoose.Types.ObjectId;
    const context = await getUserLifeAdminContext(userId);
    let interaction: any = null;
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) interaction = await AIInteraction.findOne({ _id: conversationId, userId, type: 'chat' }).lean();
    const history = (interaction?.messages || []).map((m: any) => ({ role: m.role, content: m.content }));
    let replyText = '';
    let proposedActions: any[] = [];
    let source: 'ai' | 'fallback' = 'fallback';
    if (geminiModel) {
      try {
        const result = await geminiModel.generateContent(buildGeminiPrompt(context, history, String(message)));
        const parsed = parseGeminiAction(result.response.text() || '');
        replyText = parsed.cleanText; proposedActions = parsed.proposedActions; source = 'ai';
      } catch (apiErr) { console.warn('Gemini chat failed, using fallback:', apiErr); }
    }
    if (!replyText) { const fallback = generateFallbackResponse(String(message), context); replyText = fallback.text; proposedActions = fallback.proposedActions; }
    proposedActions = proposedActions.map((a) => ({ ...a, requiresConfirmation: true }));
    const saved = await saveInteraction(userId, conversationId, String(message).slice(0, 4000), replyText.slice(0, 8000));
    res.json({ reply: replyText, proposedActions, suggestions: proposedActions, conversationId: String(saved._id), source });
  } catch (error) { console.error('AI Chat error:', error); res.status(500).json({ message: 'Failed to process AI chat request' }); }
});

router.post('/plan', [body('goal').notEmpty().withMessage('Goal or scenario is required')], async (req: Request, res: Response): Promise<void> => {
  try {
    const { goal, targetDate } = req.body;
    const baseDate = targetDate ? new Date(targetDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (geminiModel) {
      try {
        const result = await geminiModel.generateContent(`Plan for: "${String(goal).slice(0, 300)}" targeting ${baseDate.toLocaleDateString('en-IN')}. Return ONLY JSON: {"plan":"...","tasks":[{"title":"...","dueDate":"YYYY-MM-DD","priority":"low|medium|high|urgent","category":"Personal"}]} (3-5 tasks).`);
        const jsonMatch = (result.response.text() || '').match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const tasks = (parsed.tasks || []).slice(0, 6).map((t: any) => ({ type: 'task', status: 'suggestion', requiresConfirmation: true, title: String(t.title || '').slice(0, 120), dueDate: toIsoDate(t.dueDate), priority: PRIORITIES.has(t.priority) ? t.priority : 'medium', category: typeof t.category === 'string' ? t.category.slice(0, 40) : 'Personal' })).filter((t: any) => t.title);
          if (tasks.length) { res.json({ plan: parsed.plan || `Plan for "${goal}"`, tasks, source: 'ai' }); return; }
        }
      } catch (apiErr) { console.warn('Gemini plan failed, fallback:', apiErr); }
    }
    const mk = (daysBefore: number, title: string, priority: string) => ({ type: 'task', title, dueDate: new Date(Math.max(baseDate.getTime() - daysBefore * 86400000, Date.now())).toISOString().split('T')[0], priority, category: 'Personal', status: 'suggestion', requiresConfirmation: true });
    res.json({ plan: `Template plan for "${String(goal).slice(0, 120)}" (review before adding).`, tasks: [mk(5, `Outline steps for: ${String(goal).slice(0, 80)}`, 'medium'), mk(3, `Complete main work for: ${String(goal).slice(0, 80)}`, 'high'), mk(1, `Final review for: ${String(goal).slice(0, 80)}`, 'urgent')], source: 'template' });
  } catch (error) { console.error('AI Plan error:', error); res.status(500).json({ message: 'Failed to generate plan' }); }
});

router.post('/detect', [body('text').notEmpty().withMessage('Text snippet is required')], async (req: Request, res: Response): Promise<void> => {
  try {
    const text = String(req.body.text || '').slice(0, 4000);
    if (geminiModel) {
      try {
        const result = await geminiModel.generateContent(`Extract actionable LifeAdmin items from text. ONLY use information explicitly present. Return ONLY JSON: {"summary":"...","detectedItems":[{"type":"task|bill|appointment|reminder","title":"...","description":"...","dueDate":"YYYY-MM-DD?","amount":123,"currency":"INR","confidence":"high|medium|low"}]}\nText: """${text}"""`);
        const jsonMatch = (result.response.text() || '').match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const items = (parsed.detectedItems || []).slice(0, 12).map((item: any) => ({ ...item, type: ACTION_TYPES.has(item.type) ? item.type : 'task', title: String(item.title || 'Detected item').slice(0, 120), status: 'suggestion', requiresConfirmation: true, currency: item.currency || '₹' }));
          res.json({ summary: parsed.summary || `Found ${items.length} potential item(s). Review before adding.`, detectedItems: items, source: 'ai' }); return;
        }
      } catch (apiErr) { console.warn('Gemini detect failed, fallback:', apiErr); }
    }
    const detectedItems: any[] = [];
    const amountMatches = text.matchAll(/(?:₹|rs\.?|inr)\s?([\d,]+(?:\.\d{1,2})?)/gi);
    for (const m of amountMatches) { const amount = parseFloat(m[1].replace(/,/g, '')); if (Number.isFinite(amount)) detectedItems.push({ type: 'bill', title: `Possible payment of INR ${amount.toLocaleString('en-IN')}`, description: text.slice(Math.max(0, (m.index || 0) - 50), Math.min(text.length, (m.index || 0) + 80)).trim(), amount, currency: '₹', status: 'suggestion', requiresConfirmation: true, confidence: 'medium' }); }
    const dueDate = parseDateFromText(text);
    if (dueDate) { const lower = text.toLowerCase(); const type = /appointment|meeting|visit|doctor/.test(lower) ? 'appointment' : /bill|pay|rent|invoice/.test(lower) ? 'bill' : 'task'; detectedItems.push({ type, title: `Date mentioned: ${dueDate}`, description: text.slice(0, 160), dueDate, date: dueDate, status: 'suggestion', requiresConfirmation: true, confidence: 'medium' }); }
    if (!detectedItems.length && /\b(due|deadline|submit|appointment|meeting|pay|bill)\b/i.test(text)) detectedItems.push({ type: 'task', title: 'Possible action item (review details)', description: text.slice(0, 160), status: 'suggestion', requiresConfirmation: true, confidence: 'low' });
    res.json({ summary: detectedItems.length ? `Found ${detectedItems.length} potential item(s) by pattern matching. Review carefully before adding.` : 'No clear dates/amounts/action items detected. Try text with explicit dates or amounts.', detectedItems, source: 'pattern-matching' });
  } catch (error) { console.error('AI Detect error:', error); res.status(500).json({ message: 'Failed to detect responsibilities' }); }
});

function validateAction(item: any): { ok: true; value: any } | { ok: false; message: string } {
  if (!item || !ACTION_TYPES.has(item.type)) return { ok: false, message: 'Invalid action type' };
  const title = typeof item.title === 'string' ? item.title.trim().slice(0, 120) : '';
  if (!title) return { ok: false, message: 'Action title is required' };
  const base = { title, description: typeof item.description === 'string' ? item.description.slice(0, 1000) : undefined };
  if (item.type === 'task') return { ok: true, value: { ...base, dueDate: toIsoDate(item.dueDate), priority: PRIORITIES.has(item.priority) ? item.priority : 'medium', status: 'todo', category: typeof item.category === 'string' ? item.category.slice(0, 40) : 'Personal' } };
  if (item.type === 'bill') return { ok: true, value: { ...base, name: title, amount: Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0, currency: item.currency || '₹', dueDate: toIsoDate(item.dueDate) || new Date().toISOString().split('T')[0], paymentStatus: 'pending', category: typeof item.category === 'string' ? item.category.slice(0, 40) : 'Finance', provider: typeof item.provider === 'string' ? item.provider.slice(0, 80) : undefined } };
  if (item.type === 'appointment') return { ok: true, value: { ...base, date: toIsoDate(item.date) || toIsoDate(item.dueDate) || new Date().toISOString().split('T')[0], time: typeof item.time === 'string' ? item.time.slice(0, 20) : (typeof item.dueTime === 'string' ? item.dueTime : undefined), location: typeof item.location === 'string' ? item.location.slice(0, 120) : undefined, category: typeof item.category === 'string' ? item.category.slice(0, 40) : 'Personal' } };
  return { ok: true, value: { ...base, dueDate: toIsoDate(item.dueDate) || toIsoDate(item.date) || new Date().toISOString().split('T')[0], dueTime: typeof item.dueTime === 'string' && /^\d{2}:\d{2}$/.test(item.dueTime) ? item.dueTime : undefined, priority: PRIORITIES.has(item.priority) ? item.priority : 'medium', status: 'active', category: typeof item.category === 'string' ? item.category.slice(0, 40) : 'Personal', reminderOffsetMinutes: [0] } };
}

router.post('/actions/execute', [body('confirmed').equals('true').withMessage('Explicit confirmation required')], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ message: errors.array()[0].msg }); return; }
    const { action } = req.body;
    if (!req.body.confirmed) { res.status(400).json({ message: 'Explicit confirmation required' }); return; }
    const userId = req.user!._id;
    const validated = validateAction(action);
    if (!validated.ok) { res.status(400).json({ message: validated.message }); return; }
    const v = validated.value;
    let created: any = null;
    if (action.type === 'task') created = await Task.create({ userId, title: v.title, description: v.description || 'Created by LifeBuddy after confirmation', dueDate: v.dueDate, priority: v.priority, status: 'todo', category: v.category, aiGenerated: true, aiConfirmed: true });
    if (action.type === 'bill') created = await Bill.create({ userId, name: v.name, provider: v.provider, amount: v.amount, currency: v.currency, dueDate: v.dueDate, category: v.category, paymentStatus: 'pending', notes: v.description || 'Created by LifeBuddy after confirmation', aiGenerated: true, aiConfirmed: true });
    if (action.type === 'appointment') created = await Appointment.create({ userId, title: v.title, date: v.date, time: v.time, location: v.location, notes: v.description || 'Created by LifeBuddy after confirmation', category: v.category, aiGenerated: true, aiConfirmed: true });
    if (action.type === 'reminder') created = await Reminder.create({ userId, title: v.title, description: v.description || 'Created by LifeBuddy after confirmation', dueDate: v.dueDate, dueTime: v.dueTime, priority: v.priority, status: 'active', category: v.category, reminderOffsetMinutes: v.reminderOffsetMinutes, recurrence: { type: 'none', interval: 1 }, aiGenerated: true, aiConfirmed: true });
    if (!created) { res.status(400).json({ message: 'Unsupported action' }); return; }
    res.status(201).json({ message: `Created ${action.type} after confirmation`, result: { type: action.type, id: String(created._id), title: created.title || created.name } });
  } catch (error) { console.error('AI action execute error:', error); res.status(500).json({ message: 'Failed to execute confirmed action' }); }
});

router.post('/accept-suggestions', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, confirmed } = req.body;
    if (confirmed !== true) { res.status(400).json({ message: 'Explicit confirmation required before creating items' }); return; }
    const userId = req.user!._id;
    if (!Array.isArray(items) || items.length === 0) { res.status(400).json({ message: 'No items provided to create' }); return; }
    const createdResults: any[] = [];
    for (const item of items.slice(0, 20)) {
      const validated = validateAction(item);
      if (!validated.ok) continue;
      const v = validated.value;
      if (item.type === 'task') createdResults.push({ type: 'task', item: await Task.create({ userId, title: v.title, description: v.description || 'Created via LifeBuddy suggestion', dueDate: v.dueDate, priority: v.priority, category: v.category, status: 'todo', aiGenerated: true, aiConfirmed: true }) });
      else if (item.type === 'bill') createdResults.push({ type: 'bill', item: await Bill.create({ userId, name: v.name, provider: v.provider, amount: v.amount, currency: v.currency || '₹', dueDate: v.dueDate, category: v.category, paymentStatus: 'pending', notes: v.description || 'Created via LifeBuddy suggestion', aiGenerated: true, aiConfirmed: true }) });
      else if (item.type === 'appointment') createdResults.push({ type: 'appointment', item: await Appointment.create({ userId, title: v.title, date: v.date, time: v.time, location: v.location, notes: v.description || 'Created via LifeBuddy suggestion', category: v.category, aiGenerated: true, aiConfirmed: true }) });
      else if (item.type === 'reminder') createdResults.push({ type: 'reminder', item: await Reminder.create({ userId, title: v.title, description: v.description || 'Created via LifeBuddy suggestion', dueDate: v.dueDate, dueTime: v.dueTime, priority: v.priority, status: 'active', category: v.category, reminderOffsetMinutes: [0], recurrence: { type: 'none', interval: 1 }, aiGenerated: true, aiConfirmed: true }) });
    }
    res.status(201).json({ message: `Created ${createdResults.length} item(s) after confirmation`, results: createdResults });
  } catch (error) { console.error('Accept suggestions error:', error); res.status(500).json({ message: 'Failed to create suggested items' }); }
});

export default router;
