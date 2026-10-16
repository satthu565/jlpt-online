import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import {
  NotificationService,
  type UserNotificationPreferencesData,
} from './notification.service.js';

@Controller('me/notification-preferences')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getPreferences(@CurrentUser() user: AuthUserContext) {
    return this.notificationService.getPreferences(user.userId);
  }

  @Patch()
  async updatePreferences(
    @CurrentUser() user: AuthUserContext,
    @Body() body: Partial<UserNotificationPreferencesData>,
  ) {
    return this.notificationService.updatePreferences(user.userId, body);
  }
}
