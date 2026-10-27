import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * Resend mailer for transactional emails (account invites, temp passwords, notifications).
 *
 * Configure via env:
 *   RESEND_API_KEY — API key from https://resend.com
 *   MAIL_FROM      — sender identity (defaults to Resend's test sender)
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private resend: Resend | null = null;
  private initialized = false;

  private getClient(): Resend | null {
    if (this.initialized) return this.resend;
    this.initialized = true;

    const key = process.env.RESEND_API_KEY;
    this.resend = key ? new Resend(key) : null;

    if (!this.resend) {
      this.logger.warn('Resend not configured — set RESEND_API_KEY');
    }

    return this.resend;
  }

  /**
   * Generic method to send an email via Resend.
   */
  async sendEmail(opts: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    const client = this.getClient();
    if (!client) {
      this.logger.warn(
        `Resend not configured — could not send email to ${opts.to}`,
      );
      return { success: false, error: 'Resend not configured' };
    }

    const { data, error } = await client.emails.send({
      from:
        opts.from ??
        process.env.MAIL_FROM ??
        'DoodleBlue <onboarding@resend.dev>',
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    if (error) {
      this.logger.error(
        `Failed to send email to ${opts.to}: ${error.message}`,
      );
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  }

  /**
   * Sends a newly provisioned account's temporary password.
   * Returns false (without throwing) when Resend is not configured or send fails.
   */
  async sendTempPasswordEmail(opts: {
    to: string;
    name: string;
    password: string;
  }): Promise<boolean> {
    const client = this.getClient();
    if (!client) {
      this.logger.warn(
        `Resend not configured — could not send credentials to ${opts.to}`,
      );
      return false;
    }

    const loginUrl = `${process.env.CLIENT_URL ?? 'http://localhost:3000'}/login`;

    const { data, error } = await client.emails.send({
      from: process.env.MAIL_FROM ?? 'DoodleBlue <onboarding@resend.dev>',
      to: opts.to,
      subject: 'Your account is ready',
      html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 8px">Welcome, ${opts.name}</h2>
        <p style="color:#555">An account has been created for you. Sign in with these credentials:</p>
        <div style="background:#f5f5f7;border:1px solid #e2e2e8;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>Email:</strong> ${opts.to}</p>
          <p style="margin:0"><strong>Temporary password:</strong>
            <code style="background:#ececf1;padding:2px 8px;border-radius:6px;font-size:15px">${opts.password}</code>
          </p>
        </div>
        <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-weight:600">Log in</a>
        <p style="color:#555;font-size:13px;margin-top:16px">
          For security, you will be required to set a new password the first time you log in.
        </p>
      </div>
    `,
    });

    if (error) {
      this.logger.error(
        `Failed to send credentials to ${opts.to}: ${error.message}`,
      );
      return false;
    }

    this.logger.log(`Credentials sent to ${opts.to} (id: ${data?.id})`);
    return true;
  }
}
