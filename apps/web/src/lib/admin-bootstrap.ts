import { AccountStatus, AdminPermission, Role } from "@platform/types";
import { TERMS_METADATA } from "@platform/config";
import { hashPassword } from "./passwords";
import { recordLegalAcceptance, serverDb } from "./server-state";

let bootstrapped = false;

/** Creates the owner admin once from server environment variables. Never logs the password. */
export async function ensureProductionAdmin(): Promise<void> {
  if (bootstrapped || process.env.NODE_ENV !== "production") return;
  const email = String(process.env.ADMIN_BOOTSTRAP_EMAIL || "").toLowerCase();
  const username = String(process.env.ADMIN_BOOTSTRAP_USERNAME || "");
  const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || "");
  if (!email || !username || !password) return;

  const existing = Array.from(serverDb.users.values()).find(
    (user) =>
      user.email.toLowerCase() === email ||
      user.username.toLowerCase() === username.toLowerCase(),
  );
  if (existing) {
    bootstrapped = true;
    return;
  }

  const adminId = `user-${globalThis.crypto.randomUUID()}`;
  serverDb.users.set(adminId, {
    id: adminId,
    email,
    username,
    displayName: "System Administrator",
    passwordHash: await hashPassword(password),
    accountStatus: AccountStatus.ACTIVE,
    emailVerified: true,
    bio: "",
    avatarUrl: null,
    country: null,
    websiteUrl: null,
    roles: [Role.OWNER_ADMIN],
    permissions: Object.values(AdminPermission) as string[],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  serverDb.userPreferences.set(adminId, {
    emailNotifications: true,
    marketingEmails: false,
    soundEffects: false,
    themeMode: "dark",
  });
  recordLegalAcceptance({
    userId: adminId,
    documentSlug: "terms",
    version: TERMS_METADATA.version,
    acceptanceSource: "SIGNUP",
    ipAddress: "bootstrap",
    userAgent: "server-bootstrap",
  });
  bootstrapped = true;
}
