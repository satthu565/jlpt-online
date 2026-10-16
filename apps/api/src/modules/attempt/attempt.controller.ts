import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Headers,
  Ip,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AllowGuest } from '../../common/decorators/allow-guest.decorator.js';
import { CurrentUser, CurrentGuestId } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { AttemptService } from './attempt.service.js';
import {
  AttemptInitInputSchema,
  NextSectionInputSchema,
  AnswerSheetUpdateInputSchema,
  AttemptSubmitInputSchema,
  CheckAnswerInputSchema,
} from '@jlpt/schema';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';

@Controller()
export class AttemptController {
  constructor(private readonly attemptService: AttemptService) {}

  @Post('attempts')
  @HttpCode(HttpStatus.CREATED)
  @AllowGuest()
  @RateLimit({ limit: 120, windowSec: 60 })
  async createAttempt(
    @Body() body: unknown,
    @CurrentUser() user?: AuthUserContext,
    @CurrentGuestId() guestId?: string,
    @Headers('cf-turnstile-response') turnstileHeader?: string,
    @Ip() clientIp?: string,
  ) {
    const input = AttemptInitInputSchema.parse(body);
    const turnstileToken =
      turnstileHeader || ((body as Record<string, unknown>)?.['turnstileToken'] as string | undefined);

    return this.attemptService.createAttempt(input, user, guestId, turnstileToken, clientIp);
  }

  @Post('attempts/:id/sections/next')
  @HttpCode(HttpStatus.OK)
  @AllowGuest()
  async nextSection(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: AuthUserContext,
    @CurrentGuestId() guestId?: string,
  ) {
    const input = NextSectionInputSchema.parse(body);
    return this.attemptService.nextSection(id, input, user, guestId);
  }

  @Put('attempts/:id/sheet')
  @HttpCode(HttpStatus.OK)
  @AllowGuest()
  async updateSheet(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: AuthUserContext,
    @CurrentGuestId() guestId?: string,
  ) {
    const parseResult = AnswerSheetUpdateInputSchema.safeParse(body);
    if (!parseResult.success) {
      const isOptionExceeded = parseResult.error.issues.some(
        (issue) => issue.code === 'too_big' && (issue.path.includes('answers') || issue.path.includes('v')),
      );
      if (isOptionExceeded) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Lựa chọn phương án vượt quá số phương án của câu hỏi.',
        });
      }
      throw parseResult.error;
    }
    return this.attemptService.updateSheet(id, parseResult.data, user, guestId);
  }

  @Post('attempts/:id/submit')
  @HttpCode(HttpStatus.OK)
  @AllowGuest()
  async submitAttempt(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: AuthUserContext,
    @CurrentGuestId() guestId?: string,
  ) {
    const input = AttemptSubmitInputSchema.parse(body);
    return this.attemptService.submitAttempt(id, input, user, guestId);
  }

  @Post('attempts/:id/resume')
  @HttpCode(HttpStatus.OK)
  @AllowGuest()
  async resumeAttempt(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUserContext,
    @CurrentGuestId() guestId?: string,
  ) {
    return this.attemptService.resumeAttempt(id, user, guestId);
  }

  @Post('attempts/:id/media-token')
  @HttpCode(HttpStatus.OK)
  @AllowGuest()
  async getMediaToken(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUserContext,
    @CurrentGuestId() guestId?: string,
  ) {
    return this.attemptService.getMediaToken(id, user, guestId);
  }

  @Get('attempts/:id')
  @AllowGuest()
  async getAttemptDetail(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUserContext,
    @CurrentGuestId() guestId?: string,
  ) {
    return this.attemptService.getAttemptDetail(id, user, guestId);
  }

  @Get('attempts/:id/review')
  @AllowGuest()
  async reviewAttempt(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUserContext,
    @CurrentGuestId() guestId?: string,
  ) {
    return this.attemptService.reviewAttempt(id, user, guestId);
  }

  @Post('attempts/:id/check')
  @HttpCode(HttpStatus.OK)
  @AllowGuest()
  async checkAnswer(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user?: AuthUserContext,
    @CurrentGuestId() guestId?: string,
  ) {
    const input = CheckAnswerInputSchema.parse(body);
    return this.attemptService.checkAnswer(id, input, user, guestId);
  }

  @Get('me/attempts')
  async listMyAttempts(
    @CurrentUser() user: AuthUserContext,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 20;
    return this.attemptService.listUserAttempts(user.userId, cursor, parsedLimit);
  }

  @Post('auth/attach-guest')
  @HttpCode(HttpStatus.OK)
  async attachGuest(
    @CurrentUser() user: AuthUserContext,
    @CurrentGuestId() cookieGuestId?: string,
    @Body('guestId') bodyGuestId?: string,
  ) {
    const targetGuestId = bodyGuestId || cookieGuestId;
    if (!targetGuestId) {
      return { attachedCount: 0 };
    }
    const count = await this.attemptService.attachGuestAttempts(user.userId, targetGuestId);
    return { attachedCount: count };
  }
}
