import net from 'node:net';
import crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import type { SendEmailOptions, SentEmailRecord } from './email.types.js';
import { renderPasswordResetEmail, renderVerificationEmail } from './email.templates.js';
import { maskEmail } from '../../common/utils/pii.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sentEmails: SentEmailRecord[] = [];

  getDriver(): string {
    return process.env.EMAIL_DRIVER || 'smtp';
  }

  getDefaultFrom(): string {
    return process.env.EMAIL_FROM || 'no-reply@localhost';
  }

  getSmtpConfig(): { host: string; port: number } {
    const rawUrl = process.env.SMTP_URL || 'smtp://127.0.0.1:1025';
    try {
      const parsed = new URL(rawUrl);
      return {
        host: parsed.hostname || '127.0.0.1',
        port: parsed.port ? parseInt(parsed.port, 10) : 1025,
      };
    } catch {
      return { host: '127.0.0.1', port: 1025 };
    }
  }

  getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  getLastEmail(): SentEmailRecord | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clearSentEmails(): void {
    this.sentEmails.length = 0;
  }

  async sendEmail(options: SendEmailOptions): Promise<{ messageId: string }> {
    const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}@jlpt.local>`;
    const from = options.from || this.getDefaultFrom();

    const record: SentEmailRecord = {
      id: messageId,
      to: options.to,
      from,
      subject: options.subject,
      text: options.text,
      html: options.html,
      sentAt: new Date(),
    };
    this.sentEmails.push(record);

    this.logger.log(`Dispatching email to ${maskEmail(options.to)}: "${options.subject}"`);

    const driver = this.getDriver();
    if (driver === 'memory') {
      return { messageId };
    }

    if (driver === 'smtp') {
      await this.sendViaSmtp(options, messageId, from);
      return { messageId };
    }

    // Default / fallback
    return { messageId };
  }

  async sendVerificationEmail(
    to: string,
    verificationUrl: string,
    name?: string,
  ): Promise<{ messageId: string }> {
    const { subject, text, html } = renderVerificationEmail({ verificationUrl, name });
    return this.sendEmail({ to, subject, text, html });
  }

  async sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    name?: string,
  ): Promise<{ messageId: string }> {
    const { subject, text, html } = renderPasswordResetEmail({ resetUrl, name });
    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Raw RFC 5321 SMTP delivery over TCP socket (e.g. to Mailpit on port 1025).
   */
  private async sendViaSmtp(
    options: SendEmailOptions,
    messageId: string,
    from: string,
  ): Promise<void> {
    const { host, port } = this.getSmtpConfig();

    return new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host, port }, () => {
        // Connected
      });

      socket.setTimeout(5000);
      let step = 0;
      let buffer = '';

      const boundary = `----=_Part_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const rfcMimeData = [
        `From: ${from}`,
        `To: ${options.to}`,
        `Subject: ${options.subject}`,
        `Message-ID: ${messageId}`,
        `Date: ${new Date().toUTCString()}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        options.text,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        options.html,
        '',
        `--${boundary}--`,
        '',
        '.',
      ].join('\r\n');

      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\r\n');
        buffer = lines.pop() ?? ''; // keep trailing incomplete line

        for (const line of lines) {
          if (!line) continue;
          const code = parseInt(line.slice(0, 3), 10);

          if (step === 0 && code === 220) {
            step = 1;
            socket.write('EHLO localhost\r\n');
          } else if (step === 1 && code === 250) {
            // After EHLO finishes (if multi-line, 250 followed by space indicates completion)
            if (line.charAt(3) === ' ') {
              step = 2;
              socket.write(`MAIL FROM:<${from}>\r\n`);
            }
          } else if (step === 2 && code === 250) {
            step = 3;
            socket.write(`RCPT TO:<${options.to}>\r\n`);
          } else if (step === 3 && code === 250) {
            step = 4;
            socket.write('DATA\r\n');
          } else if (step === 4 && code === 354) {
            step = 5;
            socket.write(`${rfcMimeData}\r\n`);
          } else if (step === 5 && code === 250) {
            step = 6;
            socket.write('QUIT\r\n');
          } else if (step === 6 && (code === 221 || code === 250)) {
            socket.end();
            resolve();
          } else if (code >= 400) {
            socket.destroy();
            reject(new Error(`SMTP server responded with error: ${line}`));
          }
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`SMTP connection timed out to ${host}:${port}`));
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });

      socket.on('close', () => {
        if (step < 6) {
          reject(new Error('SMTP socket closed prematurely before delivery completion'));
        }
      });
    });
  }
}
