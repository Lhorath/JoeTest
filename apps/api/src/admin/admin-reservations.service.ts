import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@platform/database";
import { ReservationStatus } from "@platform/types";

@Injectable()
export class AdminReservationsService {
  private readonly logger = new Logger(AdminReservationsService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Cleanup expired PriorityTierReservations:
   * Transitions any ACTIVE reservation whose expiresAt is in the past to EXPIRED.
   * Safe to call repeatedly and concurrently.
   */
  async cleanupExpiredReservations(): Promise<{
    success: boolean;
    expiredCount: number;
    message: string;
  }> {
    const now = new Date();
    try {
      const result = await this.prisma.priorityTierReservation.updateMany({
        where: {
          status: ReservationStatus.ACTIVE,
          expiresAt: { lt: now },
        },
        data: {
          status: ReservationStatus.EXPIRED,
        },
      });

      this.logger.log(
        `Expired reservation cleanup executed: ${result.count} reservations marked as EXPIRED`,
      );

      return {
        success: true,
        expiredCount: result.count,
        message: `Successfully released ${result.count} expired reservations`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to cleanup expired reservations: ${err.message}`);
      return {
        success: false,
        expiredCount: 0,
        message: `Error during cleanup: ${err.message}`,
      };
    }
  }
}
