import { PrismaClient } from "@prisma/client";
import { uuidv7 } from "uuidv7";

// Export Prisma Client types and enums
export * from "@prisma/client";

// 1. Centralized UUIDv7 generator
export function generateUuidV7(): string {
  return uuidv7();
}

// 2. Global PrismaClient Instance Lifecycle Management
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 3. Database connectivity and health check helper
export async function testDbConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("❌ Database connectivity check failed:", error);
    return false;
  }
}

// 4. Test Database Safety Guard (Prevents destructive scripts against prod/dev)
export function assertTestDatabase(): void {
  const dbUrl = process.env.DATABASE_URL || "";
  const isTest = dbUrl.includes("test") || process.env.NODE_ENV === "test";
  if (!isTest) {
    console.error(
      "❌ CRITICAL FAILSAGE TRIGGERED: Attempted a destructive action against a non-test database!",
      {
        databaseUrl: dbUrl.replace(/:([^:@]+)@/, ":****@"), // Sanitize credentials in logs
      },
    );
    throw new Error(
      "Database action aborted: Destination is not an isolated test environment database.",
    );
  }
}

// 5. Pagination Primitives
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export async function paginate<T, Args>(
  model: {
    findMany: (args: Args & { skip: number; take: number }) => Promise<T[]>;
    count: (args: { where?: any }) => Promise<number>;
  },
  args: Args & { where?: any },
  params: PaginationParams = {},
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 10)); // Cap limit at 100 max for safety
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({ ...args, skip, take: limit }),
    model.count({ where: args.where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

// 6. Database Error Normalizer
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export function normalizeDatabaseError(error: unknown): DatabaseError {
  const isErrorObject =
    error instanceof Error || (error !== null && typeof error === "object");

  if (isErrorObject) {
    const prismaError = error as any;
    if (prismaError.code) {
      switch (prismaError.code) {
        case "P2002":
          return new DatabaseError(
            `Unique constraint violation: record already exists on fields (${prismaError.meta?.target?.join(", ") || ""})`,
            prismaError.code,
            error,
          );
        case "P2003":
          return new DatabaseError(
            "Foreign key constraint violation: a referenced entity does not exist.",
            prismaError.code,
            error,
          );
        case "P2025":
          return new DatabaseError(
            "Record to operate on was not found.",
            prismaError.code,
            error,
          );
        default:
          return new DatabaseError(
            prismaError.message || "Prisma database transaction failure.",
            prismaError.code,
            error,
          );
      }
    }
    if (prismaError.message) {
      return new DatabaseError(prismaError.message, undefined, error);
    }
  }
  return new DatabaseError(
    "An unknown database error occurred.",
    undefined,
    error,
  );
}

// 7. Soft Delete Query Filters & Active Record Retrievers
export function whereNotDeleted<T extends Record<string, any>>(
  whereClause: T,
): T & { deletedAt: null } {
  return {
    ...whereClause,
    deletedAt: null,
  };
}

// 8. Optimistic Concurrency Control Helper
export async function executeOptimisticUpdate<T>(
  updateFn: () => Promise<T>,
): Promise<T> {
  try {
    return await updateFn();
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new DatabaseError(
        "Optimistic lock failed: version mismatch or record deleted.",
        "OPTIMISTIC_LOCK_FAILED",
        error,
      );
    }
    throw normalizeDatabaseError(error);
  }
}

// ============================================================================
// SECTION 18: HIGH-SECURITY OWNER ADMIN SAFEGUARDS & UTILITIES
// ============================================================================

// A. Masking helper for credential replacements
export function maskSecretKey(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "••••••••";
  const prefix = secret.substring(0, 8); // preserve the original key prefix
  const suffix = secret.substring(secret.length - 4);
  return `${prefix}••••••••${suffix}`;
}

// B. Failsafe: Assert that we never delete or demote the final OWNER_ADMIN
export function assertOwnerAdminRetention(activeOwnerCount: number): void {
  if (activeOwnerCount <= 1) {
    throw new DatabaseError(
      "Database operation aborted: The final Owner Administrator cannot be removed or demoted. At least one Owner Admin must always remain.",
      "FINAL_OWNER_ADMIN_RETENTION_VIOLATION",
    );
  }
}

// C. Logger redaction utility for sensitive Stripe credentials
export function redactSecretsFromLog<T extends Record<string, any>>(obj: T): T {
  const redacted = { ...obj };
  const sensitiveKeys = [
    "password",
    "passwordHash",
    "stripeSecretKey",
    "stripe_secret_key",
    "token",
    "tokenHash",
    "secret",
  ];

  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.includes(key)) {
      redacted[key as keyof T] = "[REDACTED]" as any;
    } else if (redacted[key] !== null && typeof redacted[key] === "object") {
      redacted[key as keyof T] = redactSecretsFromLog(redacted[key]) as any;
    }
  }
  return redacted;
}

// ============================================================================
// SECTION 19: LEGAL ACCEPTANCE PERSISTENCE HELPERS
// ============================================================================

export interface EnsureLegalDocumentVersionParams {
  slug: string;
  title: string;
  versionString: string;
  content?: string;
}

export async function ensureLegalDocumentAndVersion(
  params: EnsureLegalDocumentVersionParams,
): Promise<{ documentId: string; versionId: string }> {
  try {
    // 1. Find or create the root legal document by unique slug
    let doc = await prisma.legalDocument.findUnique({
      where: { slug: params.slug },
    });

    if (!doc) {
      const newDocId = generateUuidV7();
      doc = await prisma.legalDocument.upsert({
        where: { slug: params.slug },
        create: {
          id: newDocId,
          slug: params.slug,
          title: params.title,
        },
        update: {
          title: params.title,
        },
      });
    }

    // 2. Find or create the version record for this document
    let version = await prisma.legalDocumentVersion.findUnique({
      where: {
        documentId_versionString: {
          documentId: doc.id,
          versionString: params.versionString,
        },
      },
    });

    if (!version) {
      const newVersionId = generateUuidV7();
      version = await prisma.legalDocumentVersion.upsert({
        where: {
          documentId_versionString: {
            documentId: doc.id,
            versionString: params.versionString,
          },
        },
        create: {
          id: newVersionId,
          documentId: doc.id,
          versionString: params.versionString,
          content:
            params.content ||
            `Official ${params.title} (v${params.versionString}) content.`,
          publishedAt: new Date(),
        },
        update: {},
      });
    }

    return { documentId: doc.id, versionId: version.id };
  } catch (error) {
    throw normalizeDatabaseError(error);
  }
}

export interface PersistLegalAcceptanceInput {
  userId: string;
  documentSlug?: string;
  documentTitle?: string;
  versionString: string;
  acceptanceSource: string;
  ipAddress: string;
  userAgent?: string;
}

export async function persistLegalAcceptanceToDb(
  params: PersistLegalAcceptanceInput,
) {
  try {
    const slug = params.documentSlug || "terms";
    const title =
      params.documentTitle ||
      (slug === "terms" ? "Terms of Service" : "Privacy Policy");

    const { versionId } = await ensureLegalDocumentAndVersion({
      slug,
      title,
      versionString: params.versionString,
    });

    // Idempotency check on @@unique([userId, versionId])
    const existing = await prisma.legalAcceptance.findUnique({
      where: {
        userId_versionId: {
          userId: params.userId,
          versionId,
        },
      },
      include: {
        version: {
          include: {
            document: true,
          },
        },
      },
    });

    if (existing) {
      return existing;
    }

    const id = generateUuidV7();
    return await prisma.legalAcceptance.create({
      data: {
        id,
        userId: params.userId,
        versionId,
        acceptanceSource: params.acceptanceSource,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent || null,
        acceptedAt: new Date(),
      },
      include: {
        version: {
          include: {
            document: true,
          },
        },
      },
    });
  } catch (error) {
    throw normalizeDatabaseError(error);
  }
}

export async function getDbLegalAcceptancesForUser(userId: string) {
  try {
    return await prisma.legalAcceptance.findMany({
      where: { userId },
      include: {
        version: {
          include: {
            document: true,
          },
        },
      },
      orderBy: { acceptedAt: "asc" },
    });
  } catch (error) {
    throw normalizeDatabaseError(error);
  }
}

export async function hasUserAcceptedCurrentVersionInDb(
  userId: string,
  slug: string,
  versionString: string,
): Promise<boolean> {
  try {
    const count = await prisma.legalAcceptance.count({
      where: {
        userId,
        version: {
          versionString,
          document: {
            slug,
          },
        },
      },
    });
    return count > 0;
  } catch (error) {
    throw normalizeDatabaseError(error);
  }
}

