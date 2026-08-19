import {
  Body,
  Controller,
  Post,
  Req,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

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
  resendVerificationEmail(
    @Body() dto: ResendVerificationEmailDto,
  ) {
    return this.authService.resendVerificationEmail(
      dto,
    );
  }

  @Post('login')
  @ResponseMessage('Login successful')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ResponseMessage('Token refreshed successfully')
  refresh(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.refresh(
      request.user.id,
      dto,
    );
  }

  @Post('forgot-password')
  @ResponseMessage('Password reset email sent')
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ResponseMessage('Password reset successfully')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @ResponseMessage('Logged out successfully')
  logout(
    @Req() request: AuthenticatedRequest,
    @Body() dto: LogoutDto,
  ) {
    return this.authService.logout(
      request.user.id,
      dto,
    );
  }

  @Post('logout-all')
  @ResponseMessage('Logged out from all devices successfully')
  logoutAll(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.logoutAll(
      request.user.id,
    );
  }
}
