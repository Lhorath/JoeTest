import { describe, it, expect } from "vitest";
import {
  AccountStatus,
  Role,
  AdminPermission,
  PermissionOverrideType,
} from "@platform/types";
import {
  isUserAdmin,
  isUserHost,
  isUserActive,
  resolveUserPermissions,
  generateSecureToken,
  hashToken,
  hashPassword,
  verifyPassword,
  AuthenticatedUser,
} from "../index";

describe("Authentication & Authorization Abstraction", () => {
  const activeUser: AuthenticatedUser = {
    id: "0190fd2c-2c90-7d12-bf9e-bfbc36b21590",
    email: "user@thequeue.com",
    username: "user_active",
    displayName: "Active Listener",
    accountStatus: AccountStatus.ACTIVE,
    emailVerified: true,
    roles: [Role.USER],
    permissions: new Set(),
  };

  const activeHost: AuthenticatedUser = {
    ...activeUser,
    username: "host_active",
    displayName: "Stream Host",
    roles: [Role.USER, Role.HOST],
  };

  const activeAdmin: AuthenticatedUser = {
    ...activeUser,
    username: "admin_active",
    displayName: "Administrator",
    roles: [Role.USER, Role.OWNER_ADMIN],
    permissions: new Set(Object.values(AdminPermission)),
  };

  const activeModerator: AuthenticatedUser = {
    ...activeUser,
    username: "moderator_active",
    displayName: "Moderator",
    roles: [Role.USER, Role.MODERATOR],
    permissions: new Set([AdminPermission.CONTENT_MODERATE]),
  };

  const suspendedUser: AuthenticatedUser = {
    ...activeUser,
    accountStatus: AccountStatus.SUSPENDED,
  };

  describe("Role-checking helpers", () => {
    it("should correctly identify active administrators", () => {
      expect(isUserAdmin(activeAdmin)).toBe(true);
      expect(isUserAdmin(activeModerator)).toBe(true);
      expect(isUserAdmin(activeUser)).toBe(false);
      expect(isUserAdmin(activeHost)).toBe(false);
      expect(isUserAdmin(suspendedUser)).toBe(false);
    });

    it("should correctly identify active hosts", () => {
      expect(isUserHost(activeHost)).toBe(true);
      expect(isUserHost(activeUser)).toBe(false);
      expect(isUserHost(suspendedUser)).toBe(false);
    });

    it("should correctly assert status", () => {
      expect(isUserActive(activeUser)).toBe(true);
      expect(isUserActive(suspendedUser)).toBe(false);
    });
  });

  describe("Permission Resolver", () => {
    it("should grant OWNER_ADMIN all permissions", () => {
      const perms = resolveUserPermissions([Role.OWNER_ADMIN], []);
      expect(perms.has(AdminPermission.ADMIN_PLATFORM_FULL)).toBe(true);
      expect(perms.has(AdminPermission.CONTENT_MODERATE)).toBe(true);
    });

    it("should grant MODERATOR baseline permissions", () => {
      const perms = resolveUserPermissions([Role.MODERATOR], []);
      expect(perms.has(AdminPermission.CONTENT_MODERATE)).toBe(true);
      expect(perms.has(AdminPermission.ADMIN_PLATFORM_FULL)).toBe(false);
    });

    it("should apply explicit grants to USER", () => {
      const perms = resolveUserPermissions(
        [Role.USER],
        [
          {
            permission: AdminPermission.CONTENT_MODERATE,
            type: PermissionOverrideType.GRANT,
          },
        ],
      );
      expect(perms.has(AdminPermission.CONTENT_MODERATE)).toBe(true);
    });

    it("should block granting OWNER_ADMIN permissions directly to non-admins", () => {
      const perms = resolveUserPermissions(
        [Role.USER],
        [
          {
            permission: AdminPermission.ADMIN_PLATFORM_FULL,
            type: PermissionOverrideType.GRANT,
          },
        ],
      );
      expect(perms.has(AdminPermission.ADMIN_PLATFORM_FULL)).toBe(false);
    });

    it("should respect DENY overrides", () => {
      const perms = resolveUserPermissions(
        [Role.MODERATOR],
        [
          {
            permission: AdminPermission.CONTENT_MODERATE,
            type: PermissionOverrideType.DENY,
          },
        ],
      );
      expect(perms.has(AdminPermission.CONTENT_MODERATE)).toBe(false);
    });

    it("should ignore DENY overrides for OWNER_ADMIN", () => {
      const perms = resolveUserPermissions(
        [Role.OWNER_ADMIN],
        [
          {
            permission: AdminPermission.CONTENT_MODERATE,
            type: PermissionOverrideType.DENY,
          },
        ],
      );
      expect(perms.has(AdminPermission.CONTENT_MODERATE)).toBe(true);
    });
  });

  describe("Secure Cryptographic Tokens", () => {
    it("should generate secure non-UUID random hex tokens", () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 bytes in hex = 64 characters
      // Ensure it is not a UUID
      expect(token).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it("should generate distinct sha256 hashes of secure tokens", () => {
      const token = "my_secret_token";
      const hash = hashToken(token);
      expect(hash).toHaveLength(64);
      expect(hash).toBe(
        "ddd26ab8c5140fb0dc5bd8cdccd6a0102d09c9bdf2466a5cd718373fd42a17b1",
      );
    });
  });

  describe("Argon2id Password Hashing", () => {
    it("should hash and verify passwords using production parameters", async () => {
      const password = "StrongPassword!123";
      const hash = await hashPassword(password);

      expect(hash).toContain("$argon2id$");
      expect(hash).toContain("m=65536,t=3,p=4"); // Assert secure production metadata parameters

      const isMatch = await verifyPassword(hash, password);
      expect(isMatch).toBe(true);

      const isNotMatch = await verifyPassword(hash, "wrong_password");
      expect(isNotMatch).toBe(false);
    });
  });
});
