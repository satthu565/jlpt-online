import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';

interface SignUpBody {
  email: string;
  password: string;
  name?: string;
}

interface SignInBody {
  email: string;
  password: string;
}

interface ForgotPasswordBody {
  email: string;
}

interface ResetPasswordBody {
  token: string;
  newPassword: string;
}

interface ConfirmTotpBody {
  code: string;
}

interface ChallengeTotpBody {
  code?: string;
}

interface RecoveryTotpBody {
  code: string;
}

interface DisableTotpBody {
  code?: string;
  password?: string;
  targetUserId?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * ACC-01: Đăng ký tài khoản bằng email
   */
  @Public()
  @Post('sign-up/email')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() body: SignUpBody) {
    return this.authService.signUpEmail({
      email: body.email,
      password: body.password,
      name: body.name,
    });
  }

  /**
   * ACC-02: Đăng nhập bằng email
   */
  @Public()
  @Post('sign-in/email')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() body: SignInBody,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const userAgent = req.headers['user-agent'] as string | undefined;
    const ipAddress = req.ip;

    const result = await this.authService.signInEmail({
      email: body.email,
      password: body.password,
      userAgent,
      ipAddress,
    });

    // Set HTTP-only session cookie
    res.header(
      'Set-Cookie',
      `auth_token=${encodeURIComponent(result.session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
    );

    return result;
  }

  /**
   * ACC-02: Đăng xuất
   */
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @CurrentUser() user: AuthUserContext | undefined,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    if (user?.sessionToken) {
      await this.authService.signOut(user.sessionToken);
    }

    res.header(
      'Set-Cookie',
      'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    );

    return { success: true, message: 'Đăng xuất thành công.' };
  }

  /**
   * ACC-05: Xác minh email
   */
  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  /**
   * ACC-04 & NOTI-02: Quên mật khẩu
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordBody) {
    return this.authService.forgotPassword(body.email);
  }

  /**
   * ACC-04: Đặt lại mật khẩu (Reset một lần)
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordBody) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  /**
   * ACC-03: Đăng nhập bằng Google (bắt đầu flow)
   */
  @Public()
  @Get('google')
  async googleOAuth(@Query('redirectUrl') redirectUrl?: string) {
    return this.authService.initiateGoogleOAuth(redirectUrl);
  }

  /**
   * ACC-03: Google OAuth callback (kiểm tra state và redirect allowlist)
   */
  @Public()
  @Get('google/callback')
  async googleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('redirectUrl') redirectUrl?: string,
  ) {
    return this.authService.handleGoogleOAuthCallback({
      code: code || 'mock_auth_code',
      state: state || '',
      redirectUrl,
    });
  }

  /**
   * Kiểm tra phiên đăng nhập hiện tại
   */
  @Public()
  @Get('session')
  async getSession(@CurrentUser() user: AuthUserContext | undefined) {
    if (!user) {
      return { user: null, session: null };
    }
    return {
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
      },
      session: {
        id: user.sessionId,
        twoFactorVerified: user.twoFactorVerified ?? false,
      },
    };
  }

  // =========================================================================
  // I08: Two-Factor Authentication (TOTP & Recovery) Endpoints
  // =========================================================================

  /**
   * 1. Đăng ký TOTP: sinh secret lưu mã hóa, tạo otpauth URI và mã khôi phục (I08).
   */
  @Post('totp/setup')
  @HttpCode(HttpStatus.OK)
  async setupTotp(@CurrentUser() user: AuthUserContext | undefined) {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập trước khi thiết lập 2FA.',
      });
    }
    return this.authService.initiateTotpSetup(user.userId, user.email);
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  async setup2faAlias(@CurrentUser() user: AuthUserContext | undefined) {
    return this.setupTotp(user);
  }

  /**
   * 2. Xác nhận đăng ký TOTP bằng mã 6 số (I08).
   */
  @Post('totp/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmTotp(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: ConfirmTotpBody,
  ) {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }
    if (!body?.code) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã xác thực TOTP không được để trống.',
      });
    }
    return this.authService.confirmTotpSetup(user.userId, body.code, user.sessionId);
  }

  @Post('2fa/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm2faAlias(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: ConfirmTotpBody,
  ) {
    return this.confirmTotp(user, body);
  }

  /**
   * 3. Thử thách TOTP sau khi đăng nhập mật khẩu (I08).
   */
  @Post('totp/challenge')
  @HttpCode(HttpStatus.OK)
  async challengeTotp(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: ChallengeTotpBody,
    @Req() req: FastifyRequest,
  ) {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    const headerCode = req.headers['x-totp-code'];
    const code =
      body?.code || (typeof headerCode === 'string' ? headerCode : undefined);

    if (!code) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã xác thực TOTP không được để trống.',
      });
    }

    return this.authService.verifyTotpChallenge(user.userId, code, user.sessionId);
  }

  @Post('2fa/challenge')
  @HttpCode(HttpStatus.OK)
  async challenge2faAlias(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: ChallengeTotpBody,
    @Req() req: FastifyRequest,
  ) {
    return this.challengeTotp(user, body, req);
  }

  /**
   * 4. Xác thực và tiêu thụ mã khôi phục dùng một lần (I08).
   */
  @Post('totp/recovery')
  @HttpCode(HttpStatus.OK)
  async recoveryTotp(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: RecoveryTotpBody,
  ) {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    if (!body?.code) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Mã khôi phục không được để trống.',
      });
    }

    return this.authService.verifyRecoveryCode(user.userId, body.code, user.sessionId);
  }

  @Post('2fa/recovery')
  @HttpCode(HttpStatus.OK)
  async recovery2faAlias(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: RecoveryTotpBody,
  ) {
    return this.recoveryTotp(user, body);
  }

  /**
   * 5. Tắt/Đặt lại 2FA có ghi nhận kiểm toán (I08).
   */
  @Post('totp/disable')
  @HttpCode(HttpStatus.OK)
  async disableTotp(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: DisableTotpBody,
  ) {
    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Yêu cầu đăng nhập.',
      });
    }

    const targetUserId = body?.targetUserId || user.userId;
    return this.authService.disableTotp(user, targetUserId, body);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  async disable2faAlias(
    @CurrentUser() user: AuthUserContext | undefined,
    @Body() body: DisableTotpBody,
  ) {
    return this.disableTotp(user, body);
  }
}
