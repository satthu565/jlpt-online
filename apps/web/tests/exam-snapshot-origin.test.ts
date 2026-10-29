import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExamApiClient } from '../features/exam/api/exam-api';

afterEach(() => vi.unstubAllGlobals());

describe('Snapshot URLs across public, LAN and Tailscale origins', () => {
  const path = '/api/v1/exams/0192f000-0001-7000-8000-000000000001/v1/snapshot.json?t=test-signature';
  const data = { examId: 'test-exam', version: 1, sections: [] };

  it('loads an API snapshot from the current browser origin before a private LAN URL', async () => {
    vi.stubGlobal('window', {});
    const fetcher = vi.fn(async () => new Response(JSON.stringify(data)));
    const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher });
    expect(await client.fetchSnapshot('http://192.168.114.206:3000' + path)).toEqual(data);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(path, { credentials: 'include' });
  });

  it('uses the configured internal API for server-side fetching and retains the signed query', async () => {
    vi.stubGlobal('window', undefined);
    const fetcher = vi.fn(async () => new Response(JSON.stringify(data)));
    const client = new ExamApiClient({ baseUrl: 'http://127.0.0.1:4000/api/v1', fetcher });
    await client.fetchSnapshot('http://192.168.114.206:3000' + path);
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:4000' + path, { credentials: 'include' });
  });

  it('keeps a separately hosted CDN snapshot as the first choice', async () => {
    vi.stubGlobal('window', {});
    const fetcher = vi.fn(async () => new Response(JSON.stringify(data)));
    const client = new ExamApiClient({ baseUrl: '/api/v1', fetcher });
    const cdn = 'https://cdn.example.test/exams/external/v1/snapshot.json?t=external-signature';
    await client.fetchSnapshot(cdn);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(cdn, { credentials: 'include' });
  });
});
