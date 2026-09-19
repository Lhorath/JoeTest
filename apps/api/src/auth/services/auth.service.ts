import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { PrismaClient } from "@platform/database";
import {
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashToken,
} from "@platform/auth";
import { AccountStatus } from "@platform/types";
import {
  SignUpInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  EmailVerificationConfirmInput,
} from "@platform/validation";
import { UserRepository } from "../repositories/user.repository";
import { SessionService } from "./session.service";
import { AuthProtectionService } from "../protection/auth-protection.service";
import { MailDeliveryService } from "../../mail/mail.interface";
import { TokenRepository } from "../repositories/token.repository";
import { SecurityEventRepository } from "../repositories/security-event.repository";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly authProtectionService: AuthProtectionService,
    private readonly tokenRepository: TokenRepository,
    private readonly securityEventRepository: SecurityEventRepository,
    @Inject("MailDeliveryService")
    private readonly mailService: MailDeliveryService,
  ) {}

  async register(input: SignUpInput, ipAddress: string): Promise<void> {
    await this.authProtectionService.verifyActionAllowed(
      input.email,
      ipAddress,
    );

    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      await this.authProtectionService.recordAttempt(
        input.email,
        ipAddress,
        undefined,
        false,
        "Registration failed: Email exists",
      );
      throw new BadRequestException("Email is already registered");
    }

    const passwordHash = await hashPassword(input.password);

    await this.prisma.$transaction(async (tx: any) => {
      const user = await this.userRepository.create(tx, {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash,
      });

      const rawVerificationToken = generateSecureToken();
      const tokenHash = hashToken(rawVerificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.tokenRepository.createEmailVerificationToken(
        tx,
        user.email,
        tokenHash,
        expiresAt,
      );

      await this.securityEventRepository.logEvent(tx, {
        userId: user.id,
        eventType: "USER_REGISTERED",
        ipAddress,
      });

      // Fire and forget email delivery
      this.mailService
        .sendEmailVerification(user.email, rawVerificationToken)
        .catch(() => {});
    });

    await this.authProtectionService.recordAttempt(
      input.email,
      ipAddress,
      undefined,
      true,
    );
  }

  async login(
    input: LoginInput,
    ipAddress: string,
    userAgent?: string,
  ): Promise<{ cookie: string }> {
    await this.authProtectionService.verifyActionAllowed(
      input.email,
      ipAddress,
    );

    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      await this.authProtectionService.recordAttempt(
        input.email,
        ipAddress,
        userAgent,
        false,
        "Login failed: User not found",
      );
      throw new UnauthorizedException("Invalid email or password"); // Neutral message
    }

    const isValidPassword = await verifyPassword(
      user.passwordHash,
      input.password,
    );
    if (!isValidPassword) {
      await this.authProtectionService.recordAttempt(
        input.email,
        ipAddress,
        userAgent,
        false,
        "Login failed: Invalid password",
      );
      throw new UnauthorizedException("Invalid email or password");
    }

    if (
      user.accountStatus === AccountStatus.BANNED ||
      user.accountStatus === AccountStatus.SUSPENDED ||
      user.accountStatus === AccountStatus.DEACTIVATED ||
      user.accountStatus === AccountStatus.DELETION_PENDING
    ) {
      await this.authProtectionService.recordAttempt(
        input.email,
        ipAddress,
        userAgent,
        false,
        `Login failed: Account ${user.accountStatus}`,
      );
      throw new UnauthorizedException(`Account is ${user.accountStatus}`);
    }

    if (
      user.accountStatus === AccountStatus.PENDING_EMAIL_VERIFICATION &&
      !user.emailVerified
    ) {
      // Enforce verified email restriction if policy demands it.
      // For now, we allow login but UI restricts features based on accountStatus.
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await this.securityEventRepository.logEvent(tx, {
        userId: user.id,
        eventType: "LOGIN_SUCCESS",
        ipAddress,
        userAgent,
      });
    });

    await this.authProtectionService.recordAttempt(
      input.email,
      ipAddress,
      userAgent,
      true,
    );

    const cookie = await this.sessionService.createSessionCookie(
      user.id,
      ipAddress,
      userAgent,
    );
    return { cookie };
  }

  async verifyEmail(
    input: EmailVerificationConfirmInput,
    ipAddress: string,
  ): Promise<void> {
    const tokenHash = hashToken(input.token);
    const record =
      await this.tokenRepository.findEmailVerificationToken(tokenHash);

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    const user = await this.userRepository.findByEmail(record.email);
    if (!user) {
      throw new BadRequestException("Invalid verification token");
    }

    await this.prisma.$transaction(async (tx: any) => {
      await this.tokenRepository.markEmailVerificationTokenUsed(tx, record.id);

      const newStatus =
        user.accountStatus === AccountStatus.PENDING_EMAIL_VERIFICATION
          ? AccountStatus.ACTIVE
          : (user.accountStatus as AccountStatus);

      await this.userRepository.updateAccountStatus(
        tx,
        user.id,
        newStatus,
        true,
      );

      await this.securityEventRepository.logEvent(tx, {
        userId: user.id,
        eventType: "EMAIL_VERIFIED",
        ipAddress,
      });
    });
  }

  async requestPasswordReset(
    input: PasswordResetRequestInput,
    ipAddress: string,
  ): Promise<void> {
    await this.authProtectionService.verifyActionAllowed(
      input.email,
      ipAddress,
    );
    const user = await this.userRepository.findByEmail(input.email);

    // Always return neutral success to avoid email enumeration
    if (!user) {
      return;
    }

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await this.prisma.$transaction(async (tx: any) => {
      await this.tokenRepository.createPasswordResetToken(
        tx,
        user.email,
        tokenHash,
        expiresAt,
      );
      await this.securityEventRepository.logEvent(tx, {
        userId: user.id,
        eventType: "PASSWORD_RESET_REQUESTED",
        ipAddress,
      });
    });

    this.mailService.sendPasswordReset(user.email, rawToken).catch(() => {});
  }

  async confirmPasswordReset(
    input: PasswordResetConfirmInput,
    ipAddress: string,
  ): Promise<void> {
    const tokenHash = hashToken(input.token);
    const record = await this.tokenRepository.findPasswordResetToken(tokenHash);

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const user = await this.userRepository.findByEmail(record.email);
    if (!user) {
      throw new BadRequestException("Invalid reset token");
    }

    const newPasswordHash = await hashPassword(input.password);

    await this.prisma.$transaction(async (tx: any) => {
      await this.tokenRepository.markPasswordResetTokenUsed(tx, record.id);
      await this.userRepository.updatePassword(tx, user.id, newPasswordHash);

      // Revoke all sessions on password reset
      await this.sessionService.revokeAllSessions(user.id, ipAddress);

      await this.securityEventRepository.logEvent(tx, {
        userId: user.id,
        eventType: "PASSWORD_CHANGED",
        ipAddress,
      });
    });
  }
}
