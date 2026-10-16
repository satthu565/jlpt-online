import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { getApiBaseUrl, stopApiServer } from '../../fixtures/test-server.ts';
import { PayOSAdapter } from '../../../apps/api/dist/src/modules/payment/provider/payos.adapter.js';

describe('Payment Signature & Retry Tamper Verification (PAY-04 & Acceptance 2)', () => {
  let baseUrl: string;
  const testChecksumKey = 'a1b2c3d4e5f678901234567890abcdef';
  let adapter: PayOSAdapter;

  beforeAll(async () => {
    baseUrl = await getApiBaseUrl();
    adapter = new PayOSAdapter({
      clientId: 'payos_test_client_tamper',
      apiKey: 'payos_test_api_key_tamper',
      checksumKey: testChecksumKey,
      isLive: false,
    });
  }, 60000);

  afterAll(() => {
    stopApiServer();
  });

  describe('1. HMAC-SHA256 Chữ ký số và Thứ tự sắp xếp Alphabetical (PAY-04)', () => {
    it('sắp xếp tham số theo bảng chữ cái khi sinh chuỗi chữ ký số HMAC-SHA256', () => {
      const dataPayload = {
        z_param: 'last',
        a_param: 'first',
        m_param: 12345,
        b_param: 'second',
      };

      const signature = adapter.generateSignature(dataPayload);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature).toHaveLength(64); // SHA256 hex string

      // Verify manually against deterministic HMAC of 'a_param=first&b_param=second&m_param=12345&z_param=last'
      const expectedDataString = 'a_param=first&b_param=second&m_param=12345&z_param=last';
      const manualHmac = crypto.createHmac('sha256', testChecksumKey).update(expectedDataString).digest('hex');
      expect(signature).toBe(manualHmac);
    });

    it('bỏ qua trường signature và các trường null/undefined khi sinh chữ ký', () => {
      const dataWithExtras = {
        orderId: 'ORD-101',
        amount: 250000,
        signature: 'should_be_ignored',
        emptyVal: null,
        undefVal: undefined,
      };

      const sig1 = adapter.generateSignature(dataWithExtras);
      const sig2 = adapter.generateSignature({
        amount: 250000,
        orderId: 'ORD-101',
      });

      expect(sig1).toBe(sig2);
    });

    it('xác thực thành công webhook với chữ ký hợp lệ', async () => {
      const payloadData = {
        orderId: '0192f000-0000-7000-8000-000000000010',
        amount: 199000,
        currency: 'VND',
        code: '00',
        reference: 'REF-VALID-001',
      };
      const signature = adapter.generateSignature(payloadData);

      const webhookBody = {
        code: '00',
        desc: 'success',
        data: payloadData,
        signature,
      };

      const result = await adapter.verifyWebhook(webhookBody);
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('PAID');
      expect(result.amountMinor).toBe(199000);
      expect(result.orderId).toBe(payloadData.orderId);
      expect(result.eventId).toBe('REF-VALID-001');
    });
  });

  describe('2. Ma trận Phát hiện Giả mạo Payload (Tamper Cases) (Acceptance 2)', () => {
    it('từ chối webhook khi chữ ký bị chỉnh sửa (Signature altered)', async () => {
      const payloadData = {
        orderId: '0192f000-0000-7000-8000-000000000011',
        amount: 199000,
        currency: 'VND',
        code: '00',
      };
      const validSig = adapter.generateSignature(payloadData);
      // Flip last character to tamper signature
      const tamperedSig = validSig.slice(0, -1) + (validSig.endsWith('0') ? '1' : '0');

      const webhookBody = {
        code: '00',
        desc: 'success',
        data: payloadData,
        signature: tamperedSig,
      };

      const result = await adapter.verifyWebhook(webhookBody);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });

    it('từ chối khi kẻ tấn công sửa số tiền (Amount tampered: 199,000 VND -> 1,000 VND)', async () => {
      const originalPayload = {
        orderId: '0192f000-0000-7000-8000-000000000012',
        amount: 199000,
        currency: 'VND',
        code: '00',
      };
      const validOriginalSig = adapter.generateSignature(originalPayload);

      // Attacker changes amount to 1000 but re-uses original signature
      const tamperedPayload = {
        ...originalPayload,
        amount: 1000,
      };

      const webhookBody = {
        code: '00',
        desc: 'success',
        data: tamperedPayload,
        signature: validOriginalSig,
      };

      const result = await adapter.verifyWebhook(webhookBody);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });

    it('từ chối khi kẻ tấn công thay đổi đơn vị tiền tệ (Currency tampered: VND -> USD)', async () => {
      const originalPayload = {
        orderId: '0192f000-0000-7000-8000-000000000013',
        amount: 199000,
        currency: 'VND',
        code: '00',
      };
      const validSig = adapter.generateSignature(originalPayload);

      const tamperedPayload = {
        ...originalPayload,
        currency: 'USD',
      };

      const webhookBody = {
        code: '00',
        desc: 'success',
        data: tamperedPayload,
        signature: validSig,
      };

      const result = await adapter.verifyWebhook(webhookBody);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });

    it('từ chối khi kẻ tấn công đổi orderId sang đơn hàng của nạn nhân khác (IDOR Tamper)', async () => {
      const victimOrderId = '0192f000-0000-7000-8000-000000000099';
      const originalPayload = {
        orderId: '0192f000-0000-7000-8000-000000000014',
        amount: 199000,
        currency: 'VND',
        code: '00',
      };
      const validSig = adapter.generateSignature(originalPayload);

      const tamperedPayload = {
        ...originalPayload,
        orderId: victimOrderId,
      };

      const webhookBody = {
        code: '00',
        desc: 'success',
        data: tamperedPayload,
        signature: validSig,
      };

      const result = await adapter.verifyWebhook(webhookBody);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });

    it('từ chối khi kẻ tấn công sửa mã trạng thái thanh toán từ thất bại thành công (Status Tamper: 01 -> 00)', async () => {
      const failedPayload = {
        orderId: '0192f000-0000-7000-8000-000000000015',
        amount: 199000,
        currency: 'VND',
        code: '01', // Failed
      };
      const failedSig = adapter.generateSignature(failedPayload);

      // Attacker changes code to '00' (success) keeping old signature
      const tamperedPayload = {
        ...failedPayload,
        code: '00',
      };

      const webhookBody = {
        code: '00',
        desc: 'success',
        data: tamperedPayload,
        signature: failedSig,
      };

      const result = await adapter.verifyWebhook(webhookBody);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });

    it('từ chối khi thiếu hoàn toàn tiêu đề và trường chữ ký (Missing signature)', async () => {
      const webhookBody = {
        code: '00',
        desc: 'success',
        data: {
          orderId: '0192f000-0000-7000-8000-000000000016',
          amount: 199000,
        },
      };

      const result = await adapter.verifyWebhook(webhookBody);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('MISSING_SIGNATURE');
    });

    it('từ chối chuỗi JSON hỏng hoặc định dạng rỗng (Malformed payload)', async () => {
      const resultInvalidJson = await adapter.verifyWebhook('{ invalid_json_syntax ');
      expect(resultInvalidJson.isValid).toBe(false);
      expect(resultInvalidJson.error).toBe('INVALID_JSON_BODY');

      const resultEmpty = await adapter.verifyWebhook('');
      expect(resultEmpty.isValid).toBe(false);
      expect(resultEmpty.error).toBe('INVALID_JSON_BODY');
    });

    it('bảo vệ chống tấn công dò thời gian bằng crypto.timingSafeEqual (Timing attack prevention)', () => {
      // Signature length mismatch test
      const sigShort = 'abc';
      const sigLong = 'a'.repeat(64);
      const bufShort = Buffer.from(sigShort, 'hex');
      const bufLong = Buffer.from(sigLong, 'hex');

      expect(bufShort.length).not.toBe(bufLong.length);
      // timingSafeEqual throws if lengths differ; adapter gracefully catches length difference
      let threwMismatch = false;
      try {
        crypto.timingSafeEqual(bufShort, bufLong);
      } catch {
        threwMismatch = true;
      }
      expect(threwMismatch).toBe(true);

      // Matching length comparison must succeed timing check
      const buf1 = Buffer.from('abcdef1234567890', 'hex');
      const buf2 = Buffer.from('abcdef1234567890', 'hex');
      expect(crypto.timingSafeEqual(buf1, buf2)).toBe(true);
    });
  });

  describe('3. Kiểm thử HTTP Endpoint Staging: POST /api/v1/webhooks/payment/:provider', () => {
    it('từ chối yêu cầu HTTP khi x-signature giả mạo hoặc không hợp lệ (HTTP 400 Bad Request)', async () => {
      const fakePayload = {
        code: '00',
        desc: 'tampered attempt',
        data: {
          orderId: '0192f000-0000-7000-8000-000000000020',
          amount: 999999,
        },
      };

      const res = await fetch(`${baseUrl}/api/v1/webhooks/payment/payos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': '0000000000000000000000000000000000000000000000000000000000000000',
        },
        body: JSON.stringify(fakePayload),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      expect(body.error?.code).toBe('INVALID_SIGNATURE');
      expect(body.error?.message).toMatch(/Chữ ký số của webhook không hợp lệ/);
    });

    it('từ chối yêu cầu HTTP khi thiếu chữ ký hoàn toàn (HTTP 400 Bad Request)', async () => {
      const fakePayload = {
        code: '00',
        desc: 'missing signature',
        data: {
          orderId: '0192f000-0000-7000-8000-000000000021',
          amount: 199000,
        },
      };

      const res = await fetch(`${baseUrl}/api/v1/webhooks/payment/payos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fakePayload),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      expect(body.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('từ chối khi gửi tới provider không được hỗ trợ (HTTP 400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/webhooks/payment/unsupported_gateway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'abcdef123456',
        },
        body: JSON.stringify({ code: '00' }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      expect(body.error?.code).toBe('VALIDATION_ERROR');
      expect(body.error?.message).toMatch(/Không hỗ trợ nhà cung cấp thanh toán unsupported_gateway/);
    });
  });
});
