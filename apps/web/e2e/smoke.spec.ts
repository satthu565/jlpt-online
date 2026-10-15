import { test, expect } from '@playwright/test';

test.describe('Web smoke e2e', () => {
  test('healthz endpoint returns status ok', async ({ request }) => {
    const response = await request.get('/healthz');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
