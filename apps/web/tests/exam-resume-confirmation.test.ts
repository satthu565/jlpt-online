import { describe, expect, it, vi } from 'vitest';
import { ResumeConfirmation } from '../features/exam/utils/resume-confirmation';
import { ExamApiClient } from '../features/exam/api/exam-api';

describe('Explicit attempt resume confirmation', () => {
  it('never posts resume when a link opens or confirmation is cancelled', () => {
    const fetcher = vi.fn();
    const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher });
    const onChange = vi.fn();
    const confirmation = new ResumeConfirmation(onChange);
    confirmation.request('attempt-1');
    expect(onChange).toHaveBeenLastCalledWith('attempt-1');
    expect(fetcher).not.toHaveBeenCalled();
    confirmation.cancel();
    expect(onChange).toHaveBeenLastCalledWith(null);
    void confirmation.confirm(async id => { await client.resumeAttempt(id); });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('posts once after confirmation even with rapid repeated clicks and requests', async () => {
    let release!: (response: Response) => void;
    const fetcher = vi.fn((_url: RequestInfo | URL, _init?: RequestInit) => new Promise<Response>(resolve => { release = resolve; }));
    const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher });
    const confirmation = new ResumeConfirmation(vi.fn());
    const resume = async (id: string) => { await client.resumeAttempt(id); };
    confirmation.request('attempt-1');
    const firstClick = confirmation.confirm(resume);
    confirmation.request('attempt-1');
    await confirmation.confirm(resume);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe('/api/v1/attempts/attempt-1/resume');
    release(new Response(JSON.stringify({ lease: 'new-lease' })));
    await firstClick;
    await confirmation.confirm(resume);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
