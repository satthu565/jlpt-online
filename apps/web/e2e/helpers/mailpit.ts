/**
 * Mailpit Helper for Web E2E Tests (I05 / I00)
 * Interacts with Mailpit REST API to poll and verify emails during browser integration runs.
 */

export interface MailpitAddress {
  Name: string;
  Address: string;
}

export interface MailpitMessageSummary {
  ID: string;
  MessageID: string;
  Read: boolean;
  From: MailpitAddress;
  To: MailpitAddress[];
  Subject: string;
  Created: string;
  Size: number;
}

export interface MailpitMessageDetail extends MailpitMessageSummary {
  Text: string;
  HTML: string;
}

export interface MailpitListResponse {
  total: number;
  unread: number;
  count: number;
  messages: MailpitMessageSummary[];
}

export class MailpitHelper {
  public readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ||
      process.env.MAILPIT_URL ||
      process.env.MAILPIT_BASE_URL ||
      'http://127.0.0.1:8025';
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/info`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listMessages(limit = 50): Promise<MailpitMessageSummary[]> {
    const res = await fetch(`${this.baseUrl}/api/v1/messages?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Mailpit listMessages failed: HTTP ${res.status}`);
    }
    const data = (await res.json()) as MailpitListResponse;
    return data.messages || [];
  }

  async getMessage(id: string): Promise<MailpitMessageDetail> {
    const res = await fetch(`${this.baseUrl}/api/v1/message/${id}`);
    if (!res.ok) {
      throw new Error(`Mailpit getMessage failed for ${id}: HTTP ${res.status}`);
    }
    return (await res.json()) as MailpitMessageDetail;
  }

  async waitForEmail(
    toAddress: string,
    timeoutMs = 15000,
    pollIntervalMs = 500,
  ): Promise<MailpitMessageDetail> {
    const target = toAddress.toLowerCase().trim();
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const messages = await this.listMessages();
      const match = messages.find((m) =>
        m.To.some((recipient) => recipient.Address.toLowerCase().trim() === target),
      );

      if (match) {
        return this.getMessage(match.ID);
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timeout after ${timeoutMs}ms waiting for email to ${toAddress} in Mailpit`);
  }

  extractVerificationToken(message: MailpitMessageDetail): string | null {
    const combined = `${message.HTML || ''}\n${message.Text || ''}`;
    const match = combined.match(/[?&]token=([a-f0-9]{32,64})/i);
    return match ? match[1]! : null;
  }
}
