import { Injectable } from "@nestjs/common";
import { QueueEntry } from "@platform/database";
import { ReorderIntent } from "../dto/live-session.dto";
import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface ReorderClampResult {
  intent: ReorderIntent;
  clamped: boolean;
}

export interface RebalanceNeededResult {
  needsRebalance: boolean;
  midpoint?: Decimal;
}

@Injectable()
export class QueueOrderingService {
  private readonly MIN_GAP = new Decimal("0.00000001");
  private readonly SPACING = new Decimal("1000");

  /**
   * Clamps the reorder intent if moving across priority boundaries.
   */
  clampIntent(
    movedEntry: Pick<QueueEntry, "priorityRank">,
    targetEntry: Pick<QueueEntry, "priorityRank"> | null,
    requestedIntent: ReorderIntent,
  ): ReorderClampResult {
    if (
      !targetEntry ||
      requestedIntent === ReorderIntent.TOP ||
      requestedIntent === ReorderIntent.BOTTOM
    ) {
      return { intent: requestedIntent, clamped: false };
    }

    if (targetEntry.priorityRank > movedEntry.priorityRank) {
      // Trying to move above a higher priority group -> Clamp to TOP of own group
      return { intent: ReorderIntent.TOP, clamped: true };
    }

    if (targetEntry.priorityRank < movedEntry.priorityRank) {
      // Trying to move below a lower priority group -> Clamp to BOTTOM of own group
      return { intent: ReorderIntent.BOTTOM, clamped: true };
    }

    return { intent: requestedIntent, clamped: false };
  }

  /**
   * Calculates the exact mathematical midpoint between two Decimals, rounded to 8 decimal places.
   */
  calculateMidpoint(
    prev: Decimal | number | string,
    next: Decimal | number | string,
  ): Decimal {
    const p = new Decimal(prev);
    const n = new Decimal(next);

    // (prev + next) / 2
    return p.plus(n).dividedBy(2).toDecimalPlaces(8);
  }

  /**
   * Determines if the space between prev and next is exhausted based on minimum gap.
   */
  isSpaceExhausted(
    prev: Decimal | number | string,
    next: Decimal | number | string,
  ): boolean {
    const p = new Decimal(prev);
    const n = new Decimal(next);
    const gap = n.minus(p);
    return gap.lessThanOrEqualTo(this.MIN_GAP);
  }

  /**
   * Calculates the appropriate sortOrder for a new placement,
   * returning whether a rebalance is needed due to precision exhaustion.
   */
  calculateNewSortOrder(
    intent: ReorderIntent,
    groupEntries: QueueEntry[],
    targetEntryId?: string,
  ): RebalanceNeededResult {
    // We assume groupEntries is already sorted by sortOrder ASC within the SAME priorityRank group
    if (groupEntries.length === 0) {
      return { needsRebalance: false, midpoint: this.SPACING };
    }

    if (intent === ReorderIntent.TOP) {
      const first = new Decimal(groupEntries[0].sortOrder);
      const newTop = first.minus(this.SPACING);
      return { needsRebalance: false, midpoint: newTop };
    }

    if (intent === ReorderIntent.BOTTOM) {
      const last = new Decimal(groupEntries[groupEntries.length - 1].sortOrder);
      const newBottom = last.plus(this.SPACING);
      return { needsRebalance: false, midpoint: newBottom };
    }

    if (!targetEntryId) {
      throw new Error(
        "Target entry ID is required for BEFORE or AFTER intents",
      );
    }

    const targetIndex = groupEntries.findIndex((e) => e.id === targetEntryId);
    if (targetIndex === -1) {
      throw new Error("Target entry not found in group");
    }

    const targetOrder = new Decimal(groupEntries[targetIndex].sortOrder);

    if (intent === ReorderIntent.BEFORE) {
      if (targetIndex === 0) {
        return {
          needsRebalance: false,
          midpoint: targetOrder.minus(this.SPACING),
        };
      }
      const prevOrder = new Decimal(groupEntries[targetIndex - 1].sortOrder);

      if (this.isSpaceExhausted(prevOrder, targetOrder)) {
        return { needsRebalance: true };
      }
      return {
        needsRebalance: false,
        midpoint: this.calculateMidpoint(prevOrder, targetOrder),
      };
    }

    if (intent === ReorderIntent.AFTER) {
      if (targetIndex === groupEntries.length - 1) {
        return {
          needsRebalance: false,
          midpoint: targetOrder.plus(this.SPACING),
        };
      }
      const nextOrder = new Decimal(groupEntries[targetIndex + 1].sortOrder);

      if (this.isSpaceExhausted(targetOrder, nextOrder)) {
        return { needsRebalance: true };
      }
      return {
        needsRebalance: false,
        midpoint: this.calculateMidpoint(targetOrder, nextOrder),
      };
    }

    throw new Error("Invalid intent");
  }

  /**
   * Generates a clean set of sortOrder updates for a priority group.
   * Spacing is 1000, 2000, 3000...
   */
  generateRebalanceUpdates(
    groupEntries: Pick<QueueEntry, "id">[],
  ): { id: string; sortOrder: Decimal }[] {
    return groupEntries.map((entry, index) => ({
      id: entry.id,
      sortOrder: this.SPACING.times(index + 1),
    }));
  }

  /**
   * Checks if moving an entry to the target placement is a no-op
   * (it would end up in the exact same relative position).
   */
  isNoOp(
    movedEntryId: string,
    intent: ReorderIntent,
    groupEntries: QueueEntry[],
    targetEntryId?: string,
  ): boolean {
    if (targetEntryId && targetEntryId === movedEntryId) {
      return true; // Moving relative to self is a no-op
    }

    // Find where the entry currently is
    const currentIndex = groupEntries.findIndex((e) => e.id === movedEntryId);
    if (currentIndex === -1) return false;

    // Remove the moved entry from the list to simulate the state before insertion
    const listWithoutMoved = groupEntries.filter((e) => e.id !== movedEntryId);

    if (intent === ReorderIntent.TOP) {
      return currentIndex === 0;
    }

    if (intent === ReorderIntent.BOTTOM) {
      return currentIndex === groupEntries.length - 1;
    }

    if (!targetEntryId) return false;

    const targetIndexWithoutMoved = listWithoutMoved.findIndex(
      (e) => e.id === targetEntryId,
    );
    if (targetIndexWithoutMoved === -1) return false;

    // If we want BEFORE target
    if (intent === ReorderIntent.BEFORE) {
      // It's a no-op if in the original list, moved is exactly 1 index before target
      const originalTargetIndex = groupEntries.findIndex(
        (e) => e.id === targetEntryId,
      );
      return currentIndex === originalTargetIndex - 1;
    }

    // If we want AFTER target
    if (intent === ReorderIntent.AFTER) {
      // It's a no-op if in the original list, moved is exactly 1 index after target
      const originalTargetIndex = groupEntries.findIndex(
        (e) => e.id === targetEntryId,
      );
      return currentIndex === originalTargetIndex + 1;
    }

    return false;
  }
}
