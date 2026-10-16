export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
}

export interface SentEmailRecord {
  id: string;
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  sentAt: Date;
}
