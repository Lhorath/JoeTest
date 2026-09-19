import {
  Injectable,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import {
  PrismaClient,
  ApiIdempotencyStatus,
  generateUuidV7,
} from "@platform/database";

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Attempts to claim an idempotency lock for the given user, key, and path.
   * If the record already exists, it handles the conflict:
   * - If PROCESSING, throws ConflictException (concurrent request).
   * - If COMPLETED, checks fingerprint. If match, returns cached response. If mismatch, throws BadRequestException.
   * - If FAILED, we allow re-claiming by updating to PROCESSING.
   *
   * @returns { claimed: true, record: ApiIdempotencyRecord } if successfully claimed
   * @returns { claimed: false, cachedResponse: any } if it was already completed successfully with same fingerprint
   */
  async claimLock(
    userId: string,
    idempotencyKey: string,
    operationPath: string,
    requestFingerprint: string,
  ) {
    // Attempt to upsert the claim, but only if it doesn't exist OR it exists but has FAILED status
    try {
      const record = await this.prisma.apiIdempotencyRecord.create({
        data: {
          id: generateUuidV7(),
          userId,
          idempotencyKey,
          operationPath,
          requestFingerprint,
          status: ApiIdempotencyStatus.PROCESSING,
          // Set expiry 24 hours from now
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return { claimed: true, record };
    } catch (error: any) {
      if (error.code === "P2002") {
        // Unique constraint violation
        // Record exists, let's fetch it
        const existing = await this.prisma.apiIdempotencyRecord.findUnique({
          where: {
            userId_idempotencyKey_operationPath: {
              userId,
              idempotencyKey,
              operationPath,
            },
          },
        });

        if (!existing) {
          throw new Error(
            "Idempotency record conflict occurred but record could not be found",
          );
        }

        if (existing.status === ApiIdempotencyStatus.PROCESSING) {
          throw new ConflictException(
            "Concurrent request is currently processing",
          );
        }

        if (existing.status === ApiIdempotencyStatus.FAILED) {
          // It failed previously, allow retry by updating it to PROCESSING
          const updated = await this.prisma.apiIdempotencyRecord.update({
            where: { id: existing.id },
            data: {
              status: ApiIdempotencyStatus.PROCESSING,
              requestFingerprint, // update fingerprint on retry
            },
          });
          return { claimed: true, record: updated };
        }

        if (existing.status === ApiIdempotencyStatus.COMPLETED) {
          // Check fingerprint
          if (existing.requestFingerprint !== requestFingerprint) {
            throw new BadRequestException(
              "Idempotency key already used for a different request",
            );
          }

          return {
            claimed: false,
            cachedResponse: existing.responseData
              ? JSON.parse(existing.responseData)
              : null,
          };
        }
      }

      throw error;
    }
  }

  async releaseLock(
    id: string,
    status: ApiIdempotencyStatus,
    responseData?: any,
  ) {
    await this.prisma.apiIdempotencyRecord.update({
      where: { id },
      data: {
        status,
        responseData: responseData ? JSON.stringify(responseData) : null,
      },
    });
  }
}
