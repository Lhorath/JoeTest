import {
  AccountStatus,
  Role,
  AdminPermission,
  PermissionOverrideType,
} from "@platform/types";
import * as crypto from "crypto";
import * as argon2 from "argon2";

// 1. Static Role-to-Permission Mappings
export const ROLE_PERMISSIONS: Record<Role, Set<AdminPermission>> = {
  [Role.USER]: new Set(),
  [Role.HOST]: new Set(),
  [Role.MODERATOR]: new Set([
    AdminPermission.STRIPE_PLATFORM_VIEW_STATUS,
    AdminPermission.HOST_APPLICATION_MANAGE,
    AdminPermission.USER_BAN_MANAGE,
    AdminPermission.CONTENT_MODERATE,
    AdminPermission.PAYMENT_RECORD_VIEW,
    AdminPermission.REFUND_MANAGE,
    AdminPermission.DISPUTE_REVIEW,
    AdminPermission.AUDIT_LOG_VIEW,
  ]),
  [Role.OWNER_ADMIN]: new Set(Object.values(AdminPermission)),
};

// 2. Authenticated User interface
export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  roles: Role[];
  permissions: Set<AdminPermission>;
}

// 3. Permission Resolver
export interface PermissionOverride {
  permission: AdminPermission;
  type: PermissionOverrideType;
}

export function resolveUserPermissions(
  roles: Role[],
  overrides: PermissionOverride[],
): Set<AdminPermission> {
  const isOwnerAdmin = roles.includes(Role.OWNER_ADMIN);
  if (isOwnerAdmin) {
    // OWNER_ADMIN gets everything, overriding all denials
    return new Set(Object.values(AdminPermission));
  }

  const effectivePermissions = new Set<AdminPermission>();

  // 1. Resolve union of baseline permissions from roles
  for (const role of roles) {
    const baseline = ROLE_PERMISSIONS[role];
    if (baseline) {
      for (const perm of baseline) {
        effectivePermissions.add(perm);
      }
    }
  }

  // 2. Apply explicit user permission overrides
  for (const override of overrides) {
    if (override.type === PermissionOverrideType.GRANT) {
      // Safety guard: Don't allow explicit grants of OWNER_ADMIN-only permissions to non-owners
      const ownerOnlyPerms = new Set([
        AdminPermission.ADMIN_MODERATOR_MANAGE,
        AdminPermission.ADMIN_ROLE_MANAGE,
        AdminPermission.STRIPE_PLATFORM_CONFIGURE,
        AdminPermission.PAYMENT_CONFIGURATION_MANAGE,
        AdminPermission.PLATFORM_COMMISSION_MANAGE,
        AdminPermission.ADMIN_PLATFORM_FULL,
      ]);

      if (!ownerOnlyPerms.has(override.permission)) {
        effectivePermissions.add(override.permission);
      }
    } else if (override.type === PermissionOverrideType.DENY) {
      effectivePermissions.delete(override.permission);
    }
  }

  return effectivePermissions;
}

// 4. Role-checking and permission-checking helpers
export function isUserAdmin(user: AuthenticatedUser): boolean {
  return (
    (user.roles.includes(Role.OWNER_ADMIN) ||
      user.roles.includes(Role.MODERATOR)) &&
    user.accountStatus === AccountStatus.ACTIVE
  );
}

export function isUserHost(user: AuthenticatedUser): boolean {
  return (
    user.roles.includes(Role.HOST) &&
    user.accountStatus === AccountStatus.ACTIVE
  );
}

export function isUserActive(user: AuthenticatedUser): boolean {
  return user.accountStatus === AccountStatus.ACTIVE;
}

export function hasPermission(
  user: AuthenticatedUser,
  permission: AdminPermission,
): boolean {
  if (!isUserActive(user)) return false;
  return (
    user.permissions.has(permission) || user.roles.includes(Role.OWNER_ADMIN)
  );
}

// 3. Cryptographically secure random token generator for sessions/secrets
// Secure tokens (session tokens, password resets) use secure bytes, NOT UUIDs.
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// 4. Argon2 Password Hashing
// Argon2id with production-safe parameters
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  passwordHash: string,
  passwordAttempt: string,
): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, passwordAttempt);
  } catch (err) {
    return false;
  }
}

// 5. Session Abstraction (Metadata payload format for application layer)
export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt?: Date;
  revocationReason?: string;
  ipAddress?: string;
  userAgent?: string;
}

// 6. Authentication Error Types
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = "Access denied") {
    super(message, "FORBIDDEN", 403);
  }
}

export class SessionExpiredError extends AuthError {
  constructor(message = "Session has expired") {
    super(message, "SESSION_EXPIRED", 401);
  }
}
