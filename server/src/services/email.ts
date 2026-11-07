import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import config from '../config';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const { host, port, user, pass, secure } = config.smtp;

  if (!host || !user || !pass) {
    throw new Error(
      'Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally SMTP_FROM) in server/.env to enable password reset emails.'
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

export interface EmailResult {
  accepted: string[];
  rejected: string[];
  messageId: string;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<EmailResult> {
  const transporter = getTransporter();
  const from = config.smtp.from || 'noreply@lifeadmin.local';

  const info = await transporter.sendMail({
    from: `"LifeAdmin" <${from}>`,
    to,
    subject: 'Reset your LifeAdmin password',
    text: `You requested a password reset for your LifeAdmin account.

Click the link below to set a new password. This link expires in 30 minutes:

${resetUrl}

If you didn't request this, you can safely ignore this email. Your password will not change.

— The LifeAdmin Team`,
    html: `
      <div style="font-family: Inter, system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1f2933;">
        <h2 style="color: #0f172a;">Reset your LifeAdmin password</h2>
        <p>You requested a password reset for your LifeAdmin account.</p>
        <p>Click the button below to set a new password. This link expires in 30 minutes.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${resetUrl}" target="_blank"
                 style="display: inline-block; background: #36B8AE; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 24px; font-weight: 600; font-size: 14px;">
                Reset Password
              </a>
            </td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 13px;">
          If you didn't request this, you can safely ignore this email. Your password will not change.
        </p>
        <p style="color: #9ca3af; font-size: 12px;">— The LifeAdmin Team</p>
      </div>
    `,
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
