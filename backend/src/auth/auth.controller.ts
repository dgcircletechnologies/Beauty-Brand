import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('auth')
export class AuthController {
  private readonly refreshCookieName = 'refreshToken';

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ResponseMessage('Account created successfully')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @ResponseMessage('Email verified successfully')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification-email')
  @ResponseMessage('Verification email sent')
  resendVerificationEmail(@Body() dto: ResendVerificationEmailDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  @Post('login')
  @ResponseMessage('Login successful')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(dto, request);
    this.setRefreshCookie(response, session.refreshToken);

    return {
      user: session.user,
      accessToken: session.accessToken,
    };
  }

  @Post('refresh')
  @ResponseMessage('Token refreshed successfully')
  async refresh(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.refresh(
      request.user.id,
      request.refreshToken ?? '',
      request,
    );
    this.setRefreshCookie(response, session.refreshToken);

    return {
      user: session.user,
      accessToken: session.accessToken,
    };
  }

  @Post('forgot-password')
  @ResponseMessage('Password reset email sent')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ResponseMessage('Password reset successfully')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @ResponseMessage('Logged out successfully')
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(
      request.user.id,
      request.refreshToken ?? '',
    );
    this.clearRefreshCookie(response);

    return result;
  }

  @Post('logout-all')
  @ResponseMessage('Logged out from all devices successfully')
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logoutAll(request.user.id);
    this.clearRefreshCookie(response);

    return result;
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie(this.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: this.isSecureCookieEnabled(),
      sameSite: this.getCookieSameSite(),
      path: '/api/v1',
      maxAge: this.getRefreshCookieMaxAge(),
    });
  }

  private clearRefreshCookie(response: Response) {
    response.clearCookie(this.refreshCookieName, {
      httpOnly: true,
      secure: this.isSecureCookieEnabled(),
      sameSite: this.getCookieSameSite(),
      path: '/api/v1',
    });
  }

  private isSecureCookieEnabled() {
    return process.env.AUTH_COOKIE_SECURE
      ? process.env.AUTH_COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production';
  }

  private getRefreshCookieMaxAge() {
    const seconds = Number(process.env.JWT_REFRESH_EXPIRES_IN_SECONDS);

    return (Number.isFinite(seconds) && seconds > 0 ? seconds : 604800) * 1000;
  }

  private getCookieSameSite(): 'lax' | 'strict' | 'none' {
    const sameSite = process.env.AUTH_COOKIE_SAME_SITE?.toLowerCase();

    return sameSite === 'strict' || sameSite === 'none' ? sameSite : 'lax';
  }
}
