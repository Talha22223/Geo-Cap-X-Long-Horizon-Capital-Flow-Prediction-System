import { Injectable } from '@nestjs/common';
import { CustomLogger } from '../logger/winston.logger.js';

@Injectable()
export class EmailService {
  private readonly logger = new CustomLogger();
  private transporter: any = null;

  constructor() {
    this.initTransporter();
  }

  private async initTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        const nodemailer = await (eval("import('nodemailer')") as Promise<any>);
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } catch (err) {
        this.logger.warn('Failed to load nodemailer transporter:', 'EmailService');
      }
    }
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || '"GeoCap-X Support" <noreply@geocapx.com>',
          to,
          subject,
          html,
        });
        return;
      } catch (err: any) {
        this.logger.error(`Failed to send email to ${to}: ${err.message}`, 'EmailService');
      }
    }

    // local developer logs fallback
    this.logger.log(`[EMAIL SEND SANDBOX] To: ${to} | Subject: ${subject}\nHTML: ${html.slice(0, 150)}...`, 'EmailService');
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2>Verify your GeoCap-X Account</h2>
        <p>Thank you for signing up! Please confirm your email address by clicking the link below:</p>
        <a href="${url}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">Verify Email</a>
      </div>
    `;
    await this.sendEmail(email, 'Verify your GeoCap-X Account', html);
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<void> {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2>Reset your GeoCap-X Password</h2>
        <p>We received a request to reset your password. Click the link below to set a new password:</p>
        <a href="${url}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">Reset Password</a>
      </div>
    `;
    await this.sendEmail(email, 'Reset your GeoCap-X Password', html);
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2>Welcome to GeoCap-X, ${name}!</h2>
        <p>Your workspace sandbox is ready. Explore advanced LSTM forecasts and event attribution matrices from your dashboard.</p>
      </div>
    `;
    await this.sendEmail(email, 'Welcome to GeoCap-X!', html);
  }

  async sendBillingInvoiceEmail(email: string, invoiceId: string, amount: number, pdfUrl?: string): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2>Payment Invoice Confirmation</h2>
        <p>We successfully processed your payment of <strong>$${amount.toFixed(2)}</strong>.</p>
        <p>Invoice ID: ${invoiceId}</p>
        ${pdfUrl ? `<p><a href="${pdfUrl}">Download Invoice Receipt</a></p>` : ''}
      </div>
    `;
    await this.sendEmail(email, `Receipt for Invoice ${invoiceId}`, html);
  }

  async sendSubscriptionChangeEmail(email: string, planName: string, status: string): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2>Subscription Status Update</h2>
        <p>Your subscription plan <strong>${planName}</strong> is now <strong>${status}</strong>.</p>
      </div>
    `;
    await this.sendEmail(email, 'Subscription Plan Status Update', html);
  }

  async sendNotificationEmail(email: string, title: string, message: string): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2>${title}</h2>
        <p>${message}</p>
      </div>
    `;
    await this.sendEmail(email, `GeoCap-X: ${title}`, html);
  }
}
