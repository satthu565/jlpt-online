import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { JlptScheduleService } from './jlpt-schedule.service.js';

@Controller()
@RateLimit({ limit: 1000, windowSec: 60, keyPrefix: 'jlpt-schedules' })
export class JlptScheduleController {
  constructor(private readonly scheduleService: JlptScheduleService) {}

  /**
   * Public: List all published JLPT exam schedules in Vietnam.
   * "API công khai đọc lịch. Không seed ngày thi giả: thiếu dữ liệu thì API trả rỗng."
   */
  @Public()
  @Get(['jlpt-schedules', 'exams/schedules'])
  async listPublicSchedules(@Query('level') level?: string) {
    const items = await this.scheduleService.listPublicSchedules({ level });
    return { items };
  }

  /**
   * Public: Get published JLPT exam schedule details by ID.
   * Only returns published schedules; draft/archived returns 404.
   */
  @Public()
  @Get(['jlpt-schedules/:id', 'exams/schedules/:id'])
  async getPublicSchedule(@Param('id') id: string) {
    return this.scheduleService.getPublicScheduleById(id);
  }
}
