import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { PaymentService } from './payment.service.js';
import type {
  AdminCouponCreateDto,
  AdminPlanCreateDto,
  CheckoutSessionDto,
  PlanDto,
  RefundRequestDto,
  RevenueReportDto,
  TransactionItemDto,
  UserSubscriptionDto,
} from './payment.types.js';
import { PaymentCreateSchema, type PaymentCreate } from '@jlpt/schema';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // -------------------------------------------------------------------------
  // Public Plans API (PAY-01, PAY-02)
  // -------------------------------------------------------------------------

  @Get('plans')
  @Public()
  async listPlans(): Promise<{ items: PlanDto[] }> {
    return this.paymentService.getPlans();
  }

  // -------------------------------------------------------------------------
  // Checkout & Transactions API (PAY-04, PAY-06, PAY-07)
  // -------------------------------------------------------------------------

  @Post('checkout-sessions')
  async createCheckoutSession(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: PaymentCreate,
  ): Promise<CheckoutSessionDto> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập trước khi thanh toán.',
      });
    }

    const validated = PaymentCreateSchema.parse(body);
    return this.paymentService.createCheckoutSession(user.userId, validated);
  }

  @Get('me/transactions')
  async listUserTransactions(
    @CurrentUser() user: AuthUserContext | undefined,
  ): Promise<{ items: TransactionItemDto[] }> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    return this.paymentService.getUserTransactions(user.userId);
  }

  // -------------------------------------------------------------------------
  // Subscriptions & Refunds (PAY-05, PAY-08, PAY-09)
  // -------------------------------------------------------------------------

  @Get('me/subscription')
  async getUserSubscription(
    @CurrentUser() user: AuthUserContext | undefined,
  ): Promise<UserSubscriptionDto> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    return this.paymentService.getUserSubscription(user.userId);
  }

  @Post('me/subscription/change')
  async changeSubscriptionPlan(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: { newPlanId: string },
  ): Promise<{ updated: boolean }> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    return this.paymentService.changeSubscriptionPlan(user.userId, body.newPlanId);
  }

  @Post('me/subscription/cancel')
  async cancelSubscription(
    @CurrentUser() user: AuthUserContext | undefined,
  ): Promise<{ cancelled: boolean }> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    return this.paymentService.cancelSubscription(user.userId);
  }

  @Post('me/subscription/renew')
  async renewSubscription(
    @CurrentUser() user: AuthUserContext | undefined,
  ): Promise<{ renewed: boolean }> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    return this.paymentService.renewSubscription(user.userId);
  }

  @Post('me/refund-requests')
  async requestRefund(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: RefundRequestDto,
  ): Promise<{ refundId: string; status: string }> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    return this.paymentService.requestRefund(user.userId, body);
  }

  // -------------------------------------------------------------------------
  // Webhooks (Signature Only, Deduplication, Out-of-Order Reconcile)
  // -------------------------------------------------------------------------

  @Post('webhooks/payment/:provider')
  @Public()
  async handlePaymentWebhook(
    @Param('provider') provider: string,
    @Req() req: FastifyRequest,
    @Headers('x-signature') signatureHeader?: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.body as Record<string, unknown> | string | Buffer;
    const headers = req.headers as Record<string, string | string[] | undefined>;

    return this.paymentService.handleWebhook(provider, rawBody, signatureHeader, headers);
  }

  // -------------------------------------------------------------------------
  // Admin Commercial Endpoints (ADM-15, ADM-16, PAY-12)
  // -------------------------------------------------------------------------

  @Get('admin/plans')
  @Roles('admin', 'billing_admin')
  async adminListPlans(): Promise<{ items: PlanDto[] }> {
    return this.paymentService.getAdminPlans();
  }

  @Post('admin/plans')
  @Roles('admin', 'billing_admin')
  async adminCreatePlan(@Body() body: AdminPlanCreateDto): Promise<PlanDto> {
    return this.paymentService.createAdminPlan(body);
  }

  @Get('admin/coupons')
  @Roles('admin', 'billing_admin')
  async adminListCoupons() {
    return this.paymentService.getAdminCoupons();
  }

  @Post('admin/coupons')
  @Roles('admin', 'billing_admin')
  async adminCreateCoupon(@Body() body: AdminCouponCreateDto) {
    return this.paymentService.createAdminCoupon(body);
  }

  @Get('admin/payments')
  @Roles('admin', 'billing_admin')
  async adminListPayments() {
    return this.paymentService.getAdminPayments();
  }

  @Get('admin/refunds')
  @Roles('admin', 'billing_admin')
  async adminListRefunds() {
    return this.paymentService.getAdminRefunds();
  }

  @Post('admin/refunds/:id/approve')
  @Roles('admin', 'billing_admin')
  async adminApproveRefund(
    @Param('id') refundId: string,
    @CurrentUser() admin?: AuthUserContext,
  ) {
    return this.paymentService.approveRefund(admin?.userId || 'system_admin', refundId);
  }

  @Post('admin/refunds/:id/reject')
  @Roles('admin', 'billing_admin')
  async adminRejectRefund(
    @Param('id') refundId: string,
    @Body('reason') reason?: string,
  ) {
    return this.paymentService.rejectRefund(refundId, reason);
  }

  @Get('admin/subscriptions')
  @Roles('admin', 'billing_admin')
  async adminListSubscriptions() {
    return this.paymentService.getAdminSubscriptions();
  }

  @Get('admin/reports/revenue')
  @Roles('admin', 'billing_admin')
  async adminGetRevenueReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('currency') currency?: string,
  ): Promise<RevenueReportDto> {
    return this.paymentService.getRevenueReport({ from, to, currency });
  }
}
