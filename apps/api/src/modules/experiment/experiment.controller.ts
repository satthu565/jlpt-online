import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { ExperimentService } from './experiment.service.js';
import type {
  CreateExperimentDto,
  TrackEventDto,
  TrackExposureDto,
} from './experiment.types.js';

@Controller('experiments')
export class ExperimentController {
  constructor(private readonly experimentService: ExperimentService) {}

  @Get()
  @Roles('admin')
  async listExperiments(@CurrentUser() user?: AuthUserContext) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu quyền quản trị viên.',
      });
    }
    return this.experimentService.listExperiments();
  }

  @Post()
  @Roles('admin')
  async createExperiment(
    @Body() dto: CreateExperimentDto,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu quyền quản trị viên.',
      });
    }
    return this.experimentService.createExperiment(dto);
  }

  @Get(':id/evaluate')
  @Roles('admin')
  async evaluateExperiment(
    @Param('id') id: string,
    @CurrentUser() user?: AuthUserContext,
  ) {
    if (!user) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu quyền quản trị viên.',
      });
    }
    return this.experimentService.evaluateExperiment(id);
  }

  @Post(':id/assign')
  async assignVariant(
    @Param('id') id: string,
    @Body('subjectId') subjectId: string,
  ) {
    return this.experimentService.getOrAssignVariant(id, subjectId);
  }

  @Post('exposure')
  async trackExposure(@Body() dto: TrackExposureDto) {
    return this.experimentService.trackExposure(dto);
  }

  @Post('events')
  async trackEvent(@Body() dto: TrackEventDto) {
    return this.experimentService.trackAnalyticsEvent(dto);
  }
}
