import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const smtpPort = Number(this.configService.get<string>('SMTP_PORT') ?? 587);

    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('SMTP_HOST'),
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: this.configService.getOrThrow<string>('SMTP_USER'),
        pass: this.configService.getOrThrow<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(params: {
    to: string;
    name: string;
    token: string;
  }) {
    const verifyUrl = this.buildFrontendUrl('/verify-email', params.token);

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
    const resetUrl = this.buildFrontendUrl('/reset-password', params.token);

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

  async sendWelcomeEmail(params: { to: string; name: string }) {
    const homeUrl = this.buildFrontendUrl('/');
    const supportEmail =
      this.configService.get<string>('SUPPORT_EMAIL') ??
      this.configService.get<string>('SMTP_FROM') ??
      this.configService.getOrThrow<string>('SMTP_USER');

    await this.sendMail({
      to: params.to,
      subject: 'Welcome to BlueWave Skincare',
      text: `Hi ${params.name}, welcome to BlueWave Skincare. Start shopping here: ${homeUrl}. Need help? Contact ${supportEmail}.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.6; max-width: 620px; margin: 0 auto;">
          <div style="border-bottom: 1px solid #e5e7eb; padding: 20px 0;">
            <p style="margin: 0; color: #1868db; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;">BlueWave Skincare</p>
            <h1 style="margin: 8px 0 0; font-size: 28px;">Your account is verified</h1>
          </div>
          <div style="padding: 22px 0;">
            <p>Hi ${params.name},</p>
            <p>Welcome to BlueWave Skincare. Your email has been verified and your account is ready.</p>
            <p>You can now browse products, add favorites to your wishlist, manage addresses, and place orders securely.</p>
            <p>
              <a href="${homeUrl}" style="display: inline-block; background: #1868db; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none; font-weight: 700;">Start shopping</a>
            </p>
            <p>If you need help with your account or an order, contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding: 16px 0; color: #64748b; font-size: 13px;">
            <p style="margin: 0;">Thank you for choosing BlueWave Skincare.</p>
          </div>
        </div>
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

  private buildFrontendUrl(path: string, token?: string): string {
    const frontendUrl =
      this.configService.get<string>('APP_FRONTEND_URL') ??
      'http://localhost:3000';

    const url = new URL(path, frontendUrl);

    if (token) {
      url.searchParams.set('token', token);
    }

    return url.toString();
  }
}
