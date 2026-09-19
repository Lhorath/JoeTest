import { Injectable, Logger } from "@nestjs/common";
import {
  PrismaClient,
  PaymentStatus,
  QueueStatus,
  generateUuidV7,
} from "@platform/database";
import { QueueOrderingService } from "../live-sessions/queue-ordering/queue-ordering.service";
import { ReorderIntent } from "../live-sessions/dto/live-session.dto";
import Stripe from "stripe";
import * as crypto from "crypto";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly queueOrderingService: QueueOrderingService,
  ) {}

  async processEvent(event: Stripe.Event, rawBody: string) {
    const payloadHash = crypto
      .createHash("sha256")
      .update(rawBody)
      .digest("hex");

    // Idempotency / deduplication check
    const existingEvent = await this.prisma.paymentProviderEvent.findUnique({
      where: { providerEventId: event.id },
    });

    if (existingEvent && existingEvent.processingState === "COMPLETED") {
      this.logger.log(`Skipping already completed webhook event: ${event.id}`);
      return;
    }

    const providerEvent = await this.prisma.paymentProviderEvent.upsert({
      where: { providerEventId: event.id },
      update: {
        processingAttempts: { increment: 1 },
      },
      create: {
        id: generateUuidV7(),
        provider: "STRIPE",
        providerEventId: event.id,
        eventType: event.type,
        payloadHash,
        payloadText: JSON.stringify(event.data.object),
        processingState: "PENDING",
      },
    });

    try {
      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentIntentSucceeded(paymentIntent);
      } else if (
        event.type === "payment_intent.payment_failed" ||
        event.type === "payment_intent.canceled"
      ) {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentIntentFailed(paymentIntent);
      }

      // Mark as completed
      await this.prisma.paymentProviderEvent.update({
        where: { id: providerEvent.id },
        data: {
          processingState: "COMPLETED",
          processedAt: new Date(),
          errorState: null,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error processing webhook event ${event.id}: ${error.message}`,
      );
      await this.prisma.paymentProviderEvent.update({
        where: { id: providerEvent.id },
        data: { processingState: "FAILED", errorState: error.message },
      });
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    // Perform all state transitions in a single atomic transaction
    await this.prisma.$transaction(async (tx) => {
      // Find the payment record
      const payment = await tx.payment.findUnique({
        where: { providerPaymentId: paymentIntent.id },
        include: {
          submission: {
            include: { queueEntry: true },
          },
        },
      });

      if (!payment) {
        throw new Error(
          `Payment record not found for PaymentIntent: ${paymentIntent.id}`,
        );
      }

      if (payment.status === PaymentStatus.SETTLED) {
        // Already processed
        return;
      }

      // 1. Mark Payment as SETTLED
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SETTLED, settledAt: new Date() },
      });

      const destinationAccount =
        (paymentIntent.transfer_data?.destination as string) || "";

      // 2. Create Payment Allocation
      await tx.paymentAllocation.create({
        data: {
          id: generateUuidV7(),
          paymentId: payment.id,
          grossAmountCents: payment.grossAmountCents,
          hostPercentage: 85.0,
          platformPercentage: 15.0,
          hostAmountCents: payment.hostAllocationCents,
          platformGrossAmountCents: payment.platformAllocationCents,
          currency: payment.currency,
          stripeConnectedAccountDest: destinationAccount,
        },
      });

      // 3. Create Ledger Transaction
      await tx.ledgerTransaction.create({
        data: {
          id: generateUuidV7(),
          idempotencyKey: `webhook_${paymentIntent.id}_capture`,
          description: `Capture payment ${payment.id}`,
          systemSource: "PAYMENT_CAPTURE",
          paymentId: payment.id,
          isPosted: true,
          effectiveAt: new Date(),
        },
      });

      // 4. Activate Submission & Queue Entry
      if (payment.submission && payment.submission.queueEntry) {
        const isUpgrade = paymentIntent.metadata?.upgradeSubmissionId;

        if (isUpgrade) {
          const submission = payment.submission;
          const liveSessionId = submission.liveSessionId;
          const newTierSnapshotId = paymentIntent.metadata.tierSnapshotId;

          // Get target tier details
          const newTier = await tx.livePriorityTierSnapshot.findUnique({
            where: { id: newTierSnapshotId },
          });

          if (!newTier) throw new Error("Target tier not found for upgrade");

          const destinationEntries = await tx.queueEntry.findMany({
            where: {
              liveSessionId,
              priorityRank: newTier.priorityRank,
              status: { in: ["QUEUED", "NEXT"] },
            },
            orderBy: { sortOrder: "asc" },
          });

          const { midpoint: newSortOrder, needsRebalance } =
            this.queueOrderingService.calculateNewSortOrder(
              ReorderIntent.BOTTOM,
              destinationEntries as any,
              undefined,
            );

          // Update Submission to priority
          await tx.submission.update({
            where: { id: submission.id },
            data: {
              isPriority: true,
              priorityTierSnapshotId: newTierSnapshotId,
              currentQueueStatus: QueueStatus.QUEUED,
            },
          });

          if (needsRebalance) {
            const rebalanced =
              this.queueOrderingService.generateRebalanceUpdates([
                ...destinationEntries,
                submission.queueEntry,
              ]);
            for (const update of rebalanced) {
              await tx.queueEntry.update({
                where: { id: update.id },
                data: {
                  sortOrder: update.sortOrder,
                  ...(update.id === submission.queueEntry.id
                    ? {
                        priorityRank: newTier.priorityRank,
                        status: QueueStatus.QUEUED,
                      }
                    : {}),
                },
              });
            }
          } else {
            // Update QueueEntry
            await tx.queueEntry.update({
              where: { id: submission.queueEntry.id },
              data: {
                priorityRank: newTier.priorityRank,
                sortOrder: newSortOrder!,
                status: QueueStatus.QUEUED,
              },
            });
          }

          // Decrement active Free capacity if applicable, but retain historical usage.
          const usage = await tx.userLiveSubmissionUsage.findUnique({
            where: {
              userId_liveSessionId: {
                userId: submission.submittingUserId,
                liveSessionId,
              },
            },
          });

          if (usage) {
            await tx.userLiveSubmissionUsage.update({
              where: { id: usage.id },
              data: {
                paidUsedCount: { increment: 1 },
              },
            });
          }

          await tx.submissionUpgrade.create({
            data: {
              id: generateUuidV7(),
              submissionId: submission.id,
              queueEntryId: submission.queueEntry.id,
              previousTierSnapshotId: submission.priorityTierSnapshotId || null,
              newTierSnapshotId: newTierSnapshotId,
              originalPaymentId: null,
              upgradePaymentId: payment.id,
              previousTotalPaidCents: 0,
              upgradeAmountCents: payment.grossAmountCents,
              newTotalPaidCents: payment.grossAmountCents,
              upgradedByUserId: payment.payingUserId,
            },
          });

          // Queue Audit Event for Upgrade
          await tx.queueEvent.create({
            data: {
              id: generateUuidV7(),
              queueEntryId: submission.queueEntry.id,
              liveSessionId,
              actingUserId: payment.payingUserId,
              eventType: "TIER_UPGRADE",
              newState: QueueStatus.QUEUED,
            },
          });
        } else {
          // New Submission
          const submission = payment.submission;
          const liveSessionId = submission.liveSessionId;
          const priorityRank = submission.queueEntry.priorityRank;

          const destinationEntries = await tx.queueEntry.findMany({
            where: {
              liveSessionId,
              priorityRank,
              status: { in: [QueueStatus.QUEUED, QueueStatus.NEXT] },
            },
            orderBy: { sortOrder: "asc" },
          });

          const { midpoint: newSortOrder, needsRebalance } =
            this.queueOrderingService.calculateNewSortOrder(
              ReorderIntent.BOTTOM,
              destinationEntries as any,
              undefined,
            );

          await tx.submission.update({
            where: { id: submission.id },
            data: { currentQueueStatus: QueueStatus.QUEUED },
          });

          if (needsRebalance) {
            const rebalanced =
              this.queueOrderingService.generateRebalanceUpdates([
                ...destinationEntries,
                submission.queueEntry,
              ]);
            for (const update of rebalanced) {
              await tx.queueEntry.update({
                where: { id: update.id },
                data: {
                  sortOrder: update.sortOrder,
                  ...(update.id === submission.queueEntry.id
                    ? { status: QueueStatus.QUEUED }
                    : {}),
                },
              });
            }
          } else {
            await tx.queueEntry.update({
              where: { id: submission.queueEntry.id },
              data: {
                status: QueueStatus.QUEUED,
                sortOrder: newSortOrder!,
              },
            });
          }

          // Queue Audit Event for Submission
          await tx.queueEvent.create({
            data: {
              id: generateUuidV7(),
              queueEntryId: submission.queueEntry.id,
              liveSessionId,
              actingUserId: payment.payingUserId,
              eventType: "SUBMIT",
              newState: QueueStatus.QUEUED,
            },
          });
        }

        // Consume active reservation
        await tx.priorityTierReservation.updateMany({
          where: {
            userId: payment.payingUserId,
            trackId: payment.submission.sourceTrackId,
            status: "ACTIVE",
          },
          data: {
            status: "CONSUMED",
            consumedAt: new Date(),
          },
        });

        // Increment queueRevision to notify clients of the change
        await tx.liveSession.update({
          where: { id: payment.submission.liveSessionId },
          data: { queueRevision: { increment: 1 } },
        });
      }
    });
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { providerPaymentId: paymentIntent.id },
        include: {
          submission: {
            include: { queueEntry: true },
          },
        },
      });

      if (!payment || payment.status === PaymentStatus.SETTLED) {
        return;
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
        },
      });

      if (payment.submission) {
        // Release active reservation
        await tx.priorityTierReservation.updateMany({
          where: {
            userId: payment.payingUserId,
            trackId: payment.submission.sourceTrackId,
            status: "ACTIVE",
          },
          data: {
            status: "RELEASED",
            releasedAt: new Date(),
          },
        });

        const isUpgrade = paymentIntent.metadata?.upgradeSubmissionId;
        if (
          !isUpgrade &&
          payment.submission.currentQueueStatus === QueueStatus.AWAITING_PAYMENT
        ) {
          // Never convert to free line; reject failed paid submission
          await tx.submission.update({
            where: { id: payment.submission.id },
            data: {
              currentQueueStatus: QueueStatus.REJECTED,
            },
          });

          if (payment.submission.queueEntry) {
            await tx.queueEntry.update({
              where: { id: payment.submission.queueEntry.id },
              data: {
                status: QueueStatus.REMOVED,
              },
            });
          }
        }
      }
    });
  }
}
