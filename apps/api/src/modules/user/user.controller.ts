import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import { UserService, type UpdateProfileDto } from './user.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';

@Controller('me')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * ACC-01, ACC-07, ACC-10: Xem profile và số đề đã hoàn thành
   */
  @Get()
  async getProfile(@CurrentUser() user: AuthUserContext) {
    return this.userService.getProfile(user.userId);
  }

  /**
   * ACC-07: Chọn cấp độ JLPT đang ôn: N1–N5
   */
  @Patch()
  async updateProfile(
    @CurrentUser() user: AuthUserContext,
    @Body() body: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.userId, body);
  }

  /**
   * ACC-12: Quản lý thiết bị và phiên đăng nhập - Xem danh sách phiên
   */
  @Get('sessions')
  async getSessions(@CurrentUser() user: AuthUserContext) {
    const items = await this.userService.getSessions(user.userId, user.sessionId);
    return { items };
  }

  /**
   * ACC-12: Hủy một phiên đăng nhập cụ thể
   */
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @CurrentUser() user: AuthUserContext,
    @Param('id') sessionId: string,
  ) {
    await this.userService.revokeSession(user.userId, sessionId);
  }

  /**
   * ACC-12: Hủy tất cả các phiên đăng nhập khác (Đăng xuất khỏi thiết bị khác)
   */
  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  async revokeAllOtherSessions(@CurrentUser() user: AuthUserContext) {
    return this.userService.revokeAllOtherSessions(user.userId, user.sessionId);
  }
}
