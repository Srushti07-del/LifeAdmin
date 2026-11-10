import nodemailer, { Transporter } from 'nodemailer';
import config from '../config';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const { host, port, user, pass, secure } = config.smtp;

  if (!host || !user || !pass) {
    throw new Error(
      'Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally SMTP_FROM) in server/.env to enable email notifications.'
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

export interface EmailSendResult {
  accepted: string[];
  rejected: string[];
  messageId: string;
}

export interface NotificationEmailData {
  to: string;
  userName: string;
  type: 'task_deadline' | 'overdue_task' | 'bill_payment' | 'appointment' | 'reminder' | 'document_deadline';
  title: string;
  dueDate?: string;
  dueTime?: string;
  amount?: number;
  currency?: string;
  provider?: string;
  location?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  message?: string;
  actionUrl: string;
  actionLabel: string;
}

const APP_NAME = 'LifeAdmin';
const ACCENT_COLOR = '#36B8AE';
const ACCENT_DARK = '#087E83';
const BG_COLOR = '#F5F7F5';
const CARD_BG = '#FFFFFF';
const TEXT_MAIN = '#1D3032';
const TEXT_SECONDARY = '#526967';
const BORDER_COLOR = '#E1E9E6';

function baseTemplate(title: string, body: string, actionUrl: string, actionLabel: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${BG_COLOR}; color: ${TEXT_MAIN}; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_COLOR}; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: ${CARD_BG}; border-radius: 16px; border: 1px solid ${BORDER_COLOR}; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, ${ACCENT_COLOR} 0%, ${ACCENT_DARK} 100%); padding: 32px 24px 24px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">L</td>
                  <td align="right" style="color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">LifeAdmin</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 24px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: ${TEXT_MAIN}; line-height: 1.3;">${title}</h1>
              ${body}
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 24px 24px 32px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: ${ACCENT_COLOR}; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 14px 28px; font-weight: 600; font-size: 14px; letter-spacing: 0.02em; border: none;">
                      ${actionLabel}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px; border-top: 1px solid ${BORDER_COLOR};">
              <p style="margin: 0; font-size: 11px; color: ${TEXT_SECONDARY}; line-height: 1.5;">
                You're receiving this because you have email notifications enabled in LifeAdmin.<br>
                Manage your preferences in Settings &gt; Notification Preferences.<br><br>
                &copy; ${new Date().getFullYear()} LifeAdmin. 100% Free &middot; No Paywalls &middot; Privacy-focused.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function detailRow(label: string, value: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 12px 0;">
      <tr>
        <td style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: ${TEXT_SECONDARY}; padding-bottom: 4px;">${label}</td>
      </tr>
      <tr>
        <td style="font-size: 15px; color: ${TEXT_MAIN}; font-weight: 500;">${value}</td>
      </tr>
    </table>
  `;
}

export async function sendNotificationEmail(data: NotificationEmailData): Promise<EmailSendResult> {
  const transporter = getTransporter();
  const from = config.smtp.from || 'noreply@lifeadmin.local';

  const userName = data.userName || 'there';
  const typeConfig: Record<string, { subject: string; iconColor: string; badge: string }> = {
    task_deadline: { subject: `Upcoming deadline: ${data.title}`, iconColor: '#F59E0B', badge: 'Deadline' },
    overdue_task: { subject: `Overdue: ${data.title}`, iconColor: '#EF4444', badge: 'Overdue' },
    bill_payment: { subject: `Bill due: ${data.title}`, iconColor: '#8B5CF6', badge: 'Bill Payment' },
    appointment: { subject: `Upcoming appointment: ${data.title}`, iconColor: '#10B981', badge: 'Appointment' },
    reminder: { subject: `Reminder: ${data.title}`, iconColor: '#3B82F6', badge: 'Reminder' },
    document_deadline: { subject: `Document deadline: ${data.title}`, iconColor: '#6366F1', badge: 'Document' },
  };

  const cfg = typeConfig[data.type] || typeConfig.task_deadline;
  const subject = cfg.subject;
  const badge = `<span style="display: inline-block; background-color: ${cfg.iconColor}20; color: ${cfg.iconColor}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 8px; border-radius: 6px; margin-bottom: 12px; display: inline-block;">${cfg.badge}</span>`;

  let body = badge;

  body += detailRow('Title', data.title);

  if (data.dueDate) {
    body += detailRow('Due Date', data.dueDate);
  }
  if (data.dueTime) {
    body += detailRow('Due Time', data.dueTime);
  }
  if (data.amount !== undefined && data.currency) {
    body += detailRow('Amount', `${data.amount.toLocaleString()} ${data.currency}`);
  }
  if (data.provider) {
    body += detailRow('Provider', data.provider);
  }
  if (data.location) {
    body += detailRow('Location', data.location);
  }
  if (data.category) {
    body += detailRow('Category', data.category);
  }
  if (data.priority) {
    body += detailRow('Priority', data.priority.charAt(0).toUpperCase() + data.priority.slice(1));
  }
  if (data.message) {
    body += detailRow('Details', data.message);
  }

  const html = baseTemplate(subject, body, data.actionUrl, data.actionLabel);

  const info = await transporter.sendMail({
    from: `"${APP_NAME}" <${from}>`,
    to: data.to,
    subject,
    html,
    // Text fallback for clients that don't render HTML
    text: `${subject}\n\n${data.title}\n${data.dueDate || ''} ${data.dueTime || ''}\n${data.message || ''}\n\nView in LifeAdmin: ${data.actionUrl}`,
  });

  return {
    accepted: info.accepted ?? [],
    rejected: info.rejected ?? [],
    messageId: info.messageId,
  };
}

export function isEmailConfigured(): boolean {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}
