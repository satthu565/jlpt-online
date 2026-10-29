/** Opening an attempt link must never transfer ownership by itself. */
export class ResumeConfirmation {
  private pendingId: string | null = null;
  private confirming = false;

  constructor(private onChange: (attemptId: string | null) => void) {}

  request(attemptId: string): void {
    if (this.confirming) return;
    this.pendingId = attemptId;
    this.onChange(attemptId);
  }

  cancel(): void {
    this.pendingId = null;
    this.onChange(null);
  }

  async confirm(resume: (attemptId: string) => Promise<void>): Promise<void> {
    if (this.confirming || !this.pendingId) return;
    const attemptId = this.pendingId;
    this.confirming = true;
    this.cancel();
    try { await resume(attemptId); }
    finally { this.confirming = false; }
  }
}
