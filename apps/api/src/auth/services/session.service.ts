import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaClient } from "@platform/database";
import {
  generateSecureToken,
  hashToken,
  AuthenticatedUser,
  resolveUserPermissions,
} from "@platform/auth";
import { SessionRepository } from "../repositories/session.repository";
import { SecurityEventRepository } from "../repositories/security-event.repository";
import {
  AccountStatus,
  Role,
  AdminPermission,
  PermissionOverrideType,
} from "@platform/types";
import { CookieService } from "./cookie.service";

@Injectable()
export class SessionService {
  // Session lifespan config
  private readonly IDLE_EXPIRATION_DAYS = 7;
  private readonly ABSOLUTE_EXPIRATION_DAYS = 30;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly sessionRepository: SessionRepository,
    private readonly securityEventRepository: SecurityEventRepository,
    private readonly cookieService: CookieService,
  ) {}

  /**
   * Creates a new session, storing only the hash in DB, and returns the Set-Cookie string.
   */
  async createSessionCookie(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    const now = new Date();
    const idleExpiresAt = new Date(
      now.getTime() + this.IDLE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );
    const absoluteExpiresAt = new Date(
      now.getTime() + this.ABSOLUTE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.$transaction(async (tx: any) => {
      await this.sessionRepository.createSession(tx, {
        userId,
        tokenHash,
        ipAddress,
        userAgent,
        idleExpiresAt,
        absoluteExpiresAt,
      });

      await this.securityEventRepository.logEvent(tx, {
        userId,
        eventType: "SESSION_CREATED",
        ipAddress: ipAddress || "unknown",
        userAgent,
      });
    });

    const maxAgeSeconds = this.IDLE_EXPIRATION_DAYS * 24 * 60 * 60;
    return this.cookieService.createSessionCookie(rawToken, maxAgeSeconds);
  }

  /**
   * Validates a session from a raw token. Checks expiry, revocation, account status.
   * Caches permissions and updates last seen.
   */
  async validateSession(rawToken: string): Promise<AuthenticatedUser> {
    const tokenHash = hashToken(rawToken);

    const session = await this.sessionRepository.findByTokenHash(tokenHash);
    if (!session || session.revokedAt) {
      throw new UnauthorizedException("Invalid or revoked session");
    }

    const now = new Date();
    if (now > session.idleExpiresAt || now > session.absoluteExpiresAt) {
      throw new UnauthorizedException("Session expired");
    }

    const user = session.user;
    if (
      user.accountStatus !== AccountStatus.ACTIVE &&
      user.accountStatus !== AccountStatus.PENDING_EMAIL_VERIFICATION
    ) {
      throw new UnauthorizedException(`Account is ${user.accountStatus}`);
    }

    // Update last seen asynchronously (fire-and-forget to avoid blocking the request)
    this.sessionRepository.updateLastSeen(session.id).catch(() => {});

    // Resolve permissions once per request
    const roles = user.roleAssignments.map((r: any) => r.role as Role);
    const overrides = user.permissionAssignments.map((p: any) => ({
      permission: p.permission as AdminPermission,
      type: p.type as PermissionOverrideType,
    }));
    const permissions = resolveUserPermissions(roles, overrides);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      accountStatus: user.accountStatus as AccountStatus,
      emailVerified: user.emailVerified,
      roles,
      permissions,
    };
  }

  /**
   * Rotates a session: revokes the old one and issues a new one.
   * Useful after login, password reset, or privilege elevation.
   */
  async rotateSession(
    oldRawToken: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    reason: string = "SESSION_ROTATED",
  ): Promise<string> {
    const oldTokenHash = hashToken(oldRawToken);
    const session = await this.sessionRepository.findByTokenHash(oldTokenHash);

    if (session) {
      await this.prisma.$transaction(async (tx: any) => {
        await this.sessionRepository.revokeSession(tx, session.id, reason);
        await this.securityEventRepository.logEvent(tx, {
          userId,
          eventType: "SESSION_REVOKED",
          ipAddress: ipAddress || "unknown",
          userAgent,
          metadata: { reason },
        });
      });
    }

    return this.createSessionCookie(userId, ipAddress, userAgent);
  }

  async revokeSession(rawToken: string, ipAddress?: string): Promise<string> {
    const tokenHash = hashToken(rawToken);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);

    if (session) {
      await this.prisma.$transaction(async (tx: any) => {
        await this.sessionRepository.revokeSession(
          tx,
          session.id,
          "USER_LOGOUT",
        );
        await this.securityEventRepository.logEvent(tx, {
          userId: session.userId,
          eventType: "LOGOUT",
          ipAddress: ipAddress || "unknown",
        });
      });
    }

    return this.cookieService.createClearSessionCookie();
  }

  async revokeAllSessions(userId: string, ipAddress?: string): Promise<string> {
    await this.prisma.$transaction(async (tx: any) => {
      await this.sessionRepository.revokeAllUserSessions(
        tx,
        userId,
        "USER_LOGOUT_ALL",
      );
      await this.securityEventRepository.logEvent(tx, {
        userId,
        eventType: "LOGOUT_ALL",
        ipAddress: ipAddress || "unknown",
      });
    });

    return this.cookieService.createClearSessionCookie();
  }
}
