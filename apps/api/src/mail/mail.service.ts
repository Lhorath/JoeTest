import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { MailDeliveryService } from "./mail.interface";

@Injectable()
export class NodemailerMailDeliveryService implements MailDeliveryService {
  private readonly logger = new Logger(NodemailerMailDeliveryService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private configService: ConfigService) {
    this.fromAddress = process.env.SMTP_FROM || "noreply@thequeue.com";

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "1025", 10),
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
  }

  async sendEmailVerification(email: string, rawToken: string): Promise<void> {
    const verificationUrl = `${this.configService.get<string>("NEXT_PUBLIC_WEB_URL")}/verify-email?token=${rawToken}`;

    const text = `Please verify your email for TheQueue by visiting this link: ${verificationUrl}`;
    const html = `<p>Please verify your email for TheQueue by clicking <a href="${verificationUrl}">here</a>.</p>`;

    await this.sendMail(email, "Verify your email for TheQueue", text, html);
  }

  async sendPasswordReset(email: string, rawToken: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>("NEXT_PUBLIC_WEB_URL")}/reset-password?token=${rawToken}`;

    const text = `You requested a password reset for TheQueue. Reset your password here: ${resetUrl}\nIf you did not request this, please ignore this email.`;
    const html = `<p>You requested a password reset for TheQueue. Reset your password <a href="${resetUrl}">here</a>.</p><p>If you did not request this, please ignore this email.</p>`;

    await this.sendMail(email, "Password Reset Request - TheQueue", text, html);
  }

  async sendAdminInvitation(
    email: string,
    rawToken: string,
    role: string,
  ): Promise<void> {
    const inviteUrl = `${this.configService.get<string>("NEXT_PUBLIC_WEB_URL")}/admin/invite?token=${rawToken}`;

    const text = `You have been invited to join TheQueue as a ${role}. Accept your invitation here: ${inviteUrl}`;
    const html = `<p>You have been invited to join TheQueue as a <strong>${role}</strong>. Accept your invitation <a href="${inviteUrl}">here</a>.</p>`;

    await this.sendMail(email, "Admin Invitation - TheQueue", text, html);
  }

  private async sendMail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email sent to ${to} (Subject: ${subject})`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to} (Subject: ${subject})`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new Error("Failed to deliver email");
    }
  }
}

@Injectable()
export class InMemoryMailDeliveryService implements MailDeliveryService {
  private readonly logger = new Logger(InMemoryMailDeliveryService.name);
  public sentEmails: Array<{
    to: string;
    subject: string;
    token: string;
  }> = [];

  async sendEmailVerification(email: string, rawToken: string): Promise<void> {
    this.sentEmails.push({
      to: email,
      subject: "Verify your email for TheQueue",
      token: rawToken,
    });
    this.logger.debug(`[MOCK EMAIL] Verification email sent to ${email}`);
  }

  async sendPasswordReset(email: string, rawToken: string): Promise<void> {
    this.sentEmails.push({
      to: email,
      subject: "Password Reset Request - TheQueue",
      token: rawToken,
    });
    this.logger.debug(`[MOCK EMAIL] Password reset email sent to ${email}`);
  }

  async sendAdminInvitation(
    email: string,
    rawToken: string,
    role: string,
  ): Promise<void> {
    this.sentEmails.push({
      to: email,
      subject: "Admin Invitation - TheQueue",
      token: rawToken,
    });
    this.logger.debug(
      `[MOCK EMAIL] Admin invitation (${role}) sent to ${email}`,
    );
  }

  clear() {
    this.sentEmails = [];
  }
}
