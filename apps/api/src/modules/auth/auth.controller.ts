import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
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
      },
      session: {
        id: user.sessionId,
      },
    };
  }
}
