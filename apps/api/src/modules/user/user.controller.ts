import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  UserService,
  type UpdateProfileDto,
  type ConsentInputItem,
} from './user.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';

@Controller('me')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * ACC-01, ACC-06, ACC-07, ACC-10: Xem profile
   */
  @Get()
  async getProfile(@CurrentUser() user: AuthUserContext) {
    return this.userService.getProfile(user.userId);
  }

  /**
   * ACC-06, ACC-07, ACC-08, ACC-09: Cập nhật profile, mục tiêu kỳ thi (tháng 7/12) và điểm số
   */
  @Patch()
  async updateProfile(
    @CurrentUser() user: AuthUserContext,
    @Body() body: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.userId, body);
  }

  /**
   * ACC-06: Tải lên ảnh đại diện
   */
  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  async uploadAvatar(
    @CurrentUser() user: AuthUserContext,
    @Body() body: { avatarUrl?: string },
  ) {
    const avatarUrl = body?.avatarUrl || `/avatars/user-${user.userId}.png`;
    return this.userService.uploadAvatar(user.userId, avatarUrl);
  }

  /**
   * ACC-06, Acceptance 5: Xóa ảnh đại diện
   */
  @Delete('avatar')
  @HttpCode(HttpStatus.OK)
  async deleteAvatar(@CurrentUser() user: AuthUserContext) {
    return this.userService.deleteAvatar(user.userId);
  }

  /**
   * ACC-11: Xem thời gian đã dành cho việc ôn tập và phân tích kỹ năng
   */
  @Get('analytics')
  async getUserAnalytics(@CurrentUser() user: AuthUserContext) {
    return this.userService.getUserAnalytics(user.userId);
  }

  /**
   * ACC-13: Yêu cầu xuất toàn bộ dữ liệu cá nhân (GDPR)
   */
  @Post('data-exports')
  @HttpCode(HttpStatus.OK)
  async requestDataExport(
    @CurrentUser() user: AuthUserContext,
    @Body() body?: { kind?: string },
  ) {
    return this.userService.requestDataExport(user.userId, body);
  }

  /**
   * ACC-13, SYS-19: Xem trạng thái yêu cầu xóa tài khoản
   */
  @Get('deletion-request')
  async getDeletionRequestStatus(@CurrentUser() user: AuthUserContext) {
    return this.userService.getDeletionRequestStatus(user.userId);
  }

  /**
   * ACC-13, SYS-19: Gửi yêu cầu xóa tài khoản
   */
  @Post('deletion-request')
  @HttpCode(HttpStatus.OK)
  async createDeletionRequest(
    @CurrentUser() user: AuthUserContext,
    @Body() body?: { reason?: string; confirmation?: string },
  ) {
    return this.userService.createDeletionRequest(user.userId, body);
  }

  /**
   * Danh sách chấp thuận xử lý dữ liệu (Consents)
   */
  @Get('consents')
  async getUserConsents(@CurrentUser() user: AuthUserContext) {
    return this.userService.getUserConsents(user.userId);
  }

  /**
   * Cập nhật chấp thuận xử lý dữ liệu (Consents)
   */
  @Patch('consents')
  @HttpCode(HttpStatus.OK)
  async updateUserConsents(
    @CurrentUser() user: AuthUserContext,
    @Body() body: { consents: ConsentInputItem[] },
  ) {
    return this.userService.updateUserConsents(user.userId, body.consents);
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
