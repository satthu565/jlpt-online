import { describe, expect, it } from 'vitest';
import { BillingManager } from '../features/billing/billing-service';

describe('Admin Commercial & Billing (ADM-15, ADM-16, PAY-12)', () => {
  describe('ADM-15: Quản lý gói thành viên và mã giảm giá', () => {
    it('liệt kê danh sách các gói dịch vụ mặc định', () => {
      const manager = new BillingManager();
      const plans = manager.listPlans();
      expect(plans.length).toBeGreaterThanOrEqual(3);
      expect(plans.some((p) => p.id === 'free')).toBe(true);
      expect(plans.some((p) => p.id === 'premium_month')).toBe(true);
      expect(plans.some((p) => p.id === 'premium_year')).toBe(true);
    });

    it('tạo gói mới thành công với đầy đủ thông tin và giá hợp lệ', () => {
      const manager = new BillingManager();
      const newPlan = manager.createPlan({
        name: 'Gói Luyện Thi N1 Đặc Biệt',
        code: 'special_n1',
        interval: 'quarter',
        priceMinor: 599000,
        currency: 'VND',
        entitlements: ['unlimited_exams', 'ai_explanations', 'mock_n1_vip'],
      });

      expect(newPlan.id).toBe('special_n1');
      expect(newPlan.version).toBe(1);
      expect(newPlan.priceMinor).toBe(599000);

      const allPlans = manager.listPlans();
      expect(allPlans.some((p) => p.id === 'special_n1')).toBe(true);
    });

    it('từ chối tạo gói nếu giá bán là số âm', () => {
      const manager = new BillingManager();
      expect(() => {
        manager.createPlan({
          name: 'Gói Lỗi',
          code: 'invalid_price',
          interval: 'month',
          priceMinor: -50000,
        });
      }).toThrowError('Giá gói không được nhỏ hơn 0.');
    });

    it('cập nhật gói đã có thì tăng phiên bản version (bảo toàn tính bất biến)', () => {
      const manager = new BillingManager();
      const updated = manager.createPlan({
        name: 'Gói Premium 1 Tháng Mới',
        code: 'premium_month',
        interval: 'month',
        priceMinor: 229000,
      });

      expect(updated.id).toBe('premium_month');
      expect(updated.version).toBe(2);
      expect(updated.priceMinor).toBe(229000);
    });

    it('liệt kê mã giảm giá và tạo mã mới thành công', () => {
      const manager = new BillingManager();
      const coupons = manager.listCoupons();
      expect(coupons.length).toBeGreaterThanOrEqual(2);

      const created = manager.createCoupon({
        code: 'SUMMER30',
        discountPercent: 30,
        maxRedemptions: 50,
        validUntil: '2026-08-31T23:59:59Z',
      });

      expect(created.code).toBe('SUMMER30');
      expect(created.discountPercent).toBe(30);
      expect(created.maxRedemptions).toBe(50);
      expect(created.timesRedeemed).toBe(0);
    });

    it('từ chối mã giảm giá có discountPercent không hợp lệ (> 100 hoặc <= 0)', () => {
      const manager = new BillingManager();
      expect(() => {
        manager.createCoupon({
          code: 'OVER100',
          discountPercent: 120,
          maxRedemptions: 10,
        });
      }).toThrowError('Phần trăm giảm phải từ 1 đến 100.');

      expect(() => {
        manager.createCoupon({
          code: 'ZERO',
          discountPercent: 0,
          maxRedemptions: 10,
        });
      }).toThrowError();
    });

    it('từ chối mã giảm giá trùng lặp', () => {
      const manager = new BillingManager();
      expect(() => {
        manager.createCoupon({
          code: 'JLPT2026',
          discountPercent: 10,
          maxRedemptions: 10,
        });
      }).toThrowError('Mã giảm giá JLPT2026 đã tồn tại.');
    });
  });

  describe('ADM-16 & PAY-12: Quản lý thanh toán, thuê bao, hoàn tiền và báo cáo', () => {
    it('liệt kê danh sách giao dịch thanh toán và thuê bao', () => {
      const manager = new BillingManager();
      const payments = manager.listPayments();
      expect(payments.length).toBeGreaterThanOrEqual(2);
      expect(payments.every((p) => p.orderId && p.totalAmount > 0)).toBe(true);

      const subs = manager.listSubscriptions();
      expect(subs.length).toBeGreaterThanOrEqual(1);
      expect(subs[0]!.status).toBe('active');
    });

    it('quản lý hoàn tiền: phê duyệt yêu cầu hoàn tiền thành công', () => {
      const manager = new BillingManager();
      const refunds = manager.listRefunds();
      expect(refunds.length).toBeGreaterThanOrEqual(1);

      const target = refunds.find((r) => r.status === 'requested')!;
      expect(target).toBeDefined();

      const approved = manager.approveRefund(target.id);
      expect(approved.status).toBe('refunded');

      // Cannot approve already refunded
      expect(() => manager.approveRefund(target.id)).toThrowError();
    });

    it('quản lý hoàn tiền: từ chối yêu cầu kèm lý do', () => {
      const manager = new BillingManager();
      const refunds = manager.listRefunds();
      const target = refunds.find((r) => r.status === 'requested')!;

      const rejected = manager.rejectRefund(target.id, 'Quá thời hạn 7 ngày theo quy định.');
      expect(rejected.status).toBe('rejected');
      expect(rejected.reason).toContain('Quá thời hạn 7 ngày');
    });

    it('báo cáo doanh thu tách theo đơn vị tiền tệ VND (PAY-12)', () => {
      const manager = new BillingManager();
      const report = manager.getRevenueReport('VND');

      expect(report.currency).toBe('VND');
      expect(report.grossMinor).toBeGreaterThan(0);
      expect(report.netMinor).toBe(report.grossMinor - report.refundMinor);
      expect(report.breakdownByCurrency).toBeDefined();
      expect(report.breakdownByCurrency?.['VND']).toBeDefined();
    });

    it('báo cáo doanh thu cho đơn vị tiền tệ JPY không bị lẫn với VND', () => {
      const manager = new BillingManager();
      const reportJPY = manager.getRevenueReport('JPY');

      expect(reportJPY.currency).toBe('JPY');
      expect(reportJPY.grossMinor).toBe(0);
      expect(reportJPY.netMinor).toBe(0);
    });

    it('không trừ chéo hoàn tiền giữa các đơn vị tiền tệ khác nhau (PAY-12)', () => {
      const manager = new BillingManager();
      // Phê duyệt refund VND sẵn có (199.000 VND)
      const vndRefund = manager.listRefunds().find((r) => r.status === 'requested')!;
      manager.approveRefund(vndRefund.id);

      // Thêm một refund đã hoàn tiền bằng JPY (5.000 JPY)
      manager.addRefund({
        id: 'refund-jpy-1',
        orderId: 'order-jpy-1',
        amount: 5000,
        currency: 'JPY',
        status: 'refunded',
        createdAt: '2026-10-15T15:00:00Z',
      });

      // Báo cáo VND chỉ tính refund VND (199.000), không trừ 5.000 JPY
      const reportVND = manager.getRevenueReport('VND');
      expect(reportVND.refundMinor).toBe(199000);
      expect(reportVND.netMinor).toBe(reportVND.grossMinor - 199000);

      // Báo cáo JPY chỉ tính refund JPY (5.000), không trừ 199.000 VND
      const reportJPY = manager.getRevenueReport('JPY');
      expect(reportJPY.refundMinor).toBe(5000);
      expect(reportJPY.netMinor).toBe(-5000);
    });
  });
});
