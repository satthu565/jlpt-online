import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ExamEventService } from './exam-event.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import type { CreateExamEventDto } from './classroom.types.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('exam-events')
export class ExamEventController {
  constructor(private readonly examEventService: ExamEventService) {}

  @Public()
  @Get()
  async listExamEvents() {
    return this.examEventService.listExamEvents();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createExamEvent(
    @CurrentUser() user: AuthUserContext,
    @Body() body: CreateExamEventDto,
  ) {
    return this.examEventService.createExamEvent(user, body);
  }

  @Public()
  @Get(':id')
  async getExamEvent(@Param('id') id: string) {
    return this.examEventService.getExamEvent(id);
  }

  @Post(':id/register')
  @HttpCode(HttpStatus.OK)
  async registerExamEvent(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.examEventService.registerExamEvent(id, user);
  }

  @Get(':id/lobby')
  async getExamEventLobby(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.examEventService.getExamEventLobby(id, user);
  }

  @Post(':id/attempts')
  @HttpCode(HttpStatus.OK)
  async startExamEventAttempt(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserContext,
  ) {
    return this.examEventService.startExamEventAttempt(id, user);
  }

  @Public()
  @Get(':id/results')
  async getExamEventResults(@Param('id') id: string) {
    return this.examEventService.getExamEventResults(id);
  }
}
