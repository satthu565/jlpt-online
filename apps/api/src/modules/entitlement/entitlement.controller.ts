import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { EntitlementService } from './entitlement.service.js';
import type {
  AIQuotaRefundResult,
  AIQuotaReserveResult,
  AIQuotaSettleParams,
  TenantPlanDetails,
  TenantPlanStatus,
  UserEntitlementItem,
} from './entitlement.types.js';

@Controller()
export class EntitlementController {
  constructor(private readonly entitlementService: EntitlementService) {}

  @Get('me/entitlements')
  async getUserEntitlements(
    @CurrentUser() user?: AuthUserContext,
  ): Promise<{ items: UserEntitlementItem[] }> {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    return this.entitlementService.getUserEntitlements(user.userId);
  }

  @Get('admin/tenants/:id/plan')
  @Roles('admin', 'billing_admin')
  async getTenantPlan(@Param('id') tenantId: string): Promise<TenantPlanDetails> {
    return this.entitlementService.getTenantPlan(tenantId);
  }

  @Post('admin/tenants/:id/plan')
  @Roles('admin', 'billing_admin')
  async updateTenantPlan(
    @Param('id') tenantId: string,
    @Body()
    body: {
      planCode?: string;
      status?: TenantPlanStatus;
      totalSeats?: number;
      usedSeats?: number;
      maxClasses?: number;
    },
  ): Promise<TenantPlanDetails> {
    return this.entitlementService.setTenantPlan(tenantId, body);
  }

  @Post('ai/quota/reserve')
  async reserveAIQuota(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: { estimatedTokens: number; taskType: string; userId?: string },
  ): Promise<AIQuotaReserveResult> {
    const targetUserId = user?.userId || body.userId;
    if (!targetUserId) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    return this.entitlementService.reserveAIQuota({
      userId: targetUserId,
      estimatedTokens: body.estimatedTokens,
      taskType: body.taskType,
    });
  }

  @Post('ai/quota/settle')
  async settleAIQuota(
    @Body() body: AIQuotaSettleParams,
  ): Promise<{ settled: boolean; ledgerId: string }> {
    return this.entitlementService.settleAIQuota(body);
  }

  @Post('ai/quota/refund')
  async refundAIQuota(
    @Body() body: { reservationId: string },
  ): Promise<AIQuotaRefundResult> {
    return this.entitlementService.refundAIQuota(body.reservationId);
  }
}
