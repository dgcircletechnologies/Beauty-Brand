import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const smtpPort = Number(
      this.configService.get<string>('SMTP_PORT') ?? 587,
    );

    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>(
        'SMTP_HOST',
      ),
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: this.configService.getOrThrow<string>(
          'SMTP_USER',
        ),
        pass: this.configService.getOrThrow<string>(
          'SMTP_PASS',
        ),
      },
    });
  }

  async sendVerificationEmail(params: {
    to: string;
    name: string;
    token: string;
  }) {
    const verifyUrl = this.buildFrontendUrl(
      '/verify-email',
      params.token,
    );

    await this.sendMail({
      to: params.to,
      subject: 'Verify your skincare account',
      text: `Hi ${params.name}, verify your account here: ${verifyUrl}`,
      html: `
        <p>Hi ${params.name},</p>
        <p>Please verify your account by opening this link:</p>
        <p><a href="${verifyUrl}">Verify account</a></p>
        <p>If you did not create this account, you can ignore this email.</p>
      `,
    });
  }

  async sendPasswordResetEmail(params: {
    to: string;
    name: string;
    token: string;
  }) {
    const resetUrl = this.buildFrontendUrl(
      '/reset-password',
      params.token,
    );

    await this.sendMail({
      to: params.to,
      subject: 'Reset your skincare account password',
      text: `Hi ${params.name}, reset your password here: ${resetUrl}`,
      html: `
        <p>Hi ${params.name},</p>
        <p>You can reset your password by opening this link:</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });
  }

  private async sendMail(params: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) {
    await this.transporter.sendMail({
      from:
        this.configService.get<string>('SMTP_FROM') ??
        this.configService.getOrThrow<string>('SMTP_USER'),
      ...params,
    });
  }

  private buildFrontendUrl(
    path: string,
    token: string,
  ): string {
    const frontendUrl =
      this.configService.get<string>('APP_FRONTEND_URL') ??
      'http://localhost:3000';

    const url = new URL(path, frontendUrl);
    url.searchParams.set('token', token);

    return url.toString();
  }
}
