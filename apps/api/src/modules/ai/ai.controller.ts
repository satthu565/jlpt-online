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
import { AiService } from './ai.service.js';
import type {
  AiRequestResponseDto,
  AiReviewDto,
  AiUsageDto,
  CreateAiRequestDto,
} from './ai.types.js';

@Controller('api/v1')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ai/requests')
  async createRequest(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() dto: CreateAiRequestDto,
  ): Promise<AiRequestResponseDto> {
    if (!user) {
      throw new UnauthorizedException('Authentication required for AI actions.');
    }
    return this.aiService.processAiRequest(user.userId, dto);
  }

  @Get('ai/requests/:id')
  async getRequest(
    @CurrentUser() user: AuthUserContext | undefined,
    @Param('id') id: string,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.aiService.getAiRequest(id, user.userId);
  }

  @Get('me/ai-usage')
  async getMyUsage(
    @CurrentUser() user: AuthUserContext | undefined,
  ): Promise<AiUsageDto> {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.aiService.getUserUsage(user.userId);
  }

  @Roles('admin', 'reviewer')
  @Post('admin/ai-content/:id/reviews')
  async reviewAiContent(
    @CurrentUser() user: AuthUserContext | undefined,
    @Param('id') contentId: string,
    @Body() body: { approvalStatus: 'approved' | 'rejected'; reviewNotes?: string },
  ) {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    const reviewDto: AiReviewDto = {
      contentId,
      approvalStatus: body.approvalStatus,
      reviewerId: user.userId,
      reviewNotes: body.reviewNotes,
    };
    return this.aiService.reviewAiContent(reviewDto);
  }

  @Get(['ai/generated-questions/:id/practice', 'learning/generated-questions/:id/practice'])
  async getGeneratedQuestionForPractice(
    @CurrentUser() user: AuthUserContext | undefined,
    @Param('id') contentId: string,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.aiService.getApprovedGeneratedQuestionForPractice(contentId);
  }

  @Post(['ai/generated-questions/:id/submit', 'learning/generated-questions/:id/submit'])
  async submitGeneratedQuestion(
    @CurrentUser() user: AuthUserContext | undefined,
    @Param('id') contentId: string,
    @Body() body: { selectedOptionIndex: number },
  ) {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.aiService.submitGeneratedQuestionAnswer(
      user.userId,
      contentId,
      body.selectedOptionIndex,
    );
  }
}
