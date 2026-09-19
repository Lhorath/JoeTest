# TheQueue - Production Database Architecture and Conventions

This document details the database configurations, connection rules, raw SQL triggers, and database-level constraints established in **TheQueue** (thequeue.live).

---

## 1. Engine Specifications

- **Database Engine**: PostgreSQL 16+ (Authoritative Source of Truth)
- **Object Relational Mapper**: Prisma ORM v5
- **Primary Identifiers**: **UUIDv7** time-ordered identifiers (128-bit, stored as PostgreSQL native `uuid` type).

---

## 2. Global Naming & Mapping Conventions

- **Table Mapping**: Database tables are mapped using plural, lowercase snake_case words (e.g. `users`, `user_profiles`, `ledger_entries`) using Prisma's `@@map` directive.
- **Fields**: camelCase in Prisma, mapped natively to standard column types.
- **Enums**: Upper snake_case keys mapped to native schema types.

---

## 3. Strict Integrity Constraints (Raw SQLCHECKs)

Prisma is unable to express complex SQL assertions natively. We enforce these constraints via raw PostgreSQL database constraints:

### A. Nonnegative Monetary Amounts

All cash parameters must be non-negative integer cents:

- `priceCents >= 0` on `PriorityTier` / `LivePriorityTierSnapshot` / `PriorityTierReservation`
- `grossAmountCents >= 0` on `Payment`
- `hostAllocationCents >= 0` on `Payment`
- `platformAllocationCents >= 0` on `Payment`
- `processorFeeCents >= 0` on `Payment`
- `taxAmountCents >= 0` on `Payment`
- `refundedAmountCents >= 0` on `Payment`
- `disputedAmountCents >= 0` on `Payment`
- `amountCents >= 0` on `PaymentAttempt` / `Refund` / `Dispute`
- `grossAmountCents >= 0`, `hostShareCents >= 0` on `HostEarning`
- `grossPayoutCents > 0` on `Payout` (Payouts must be strictly positive)

### B. Split Percentage Boundaries (Stripe Connect 85/15)

- `hostPercentage >= 0.00 AND hostPercentage <= 100.00`
- `platformPercentage >= 0.00 AND platformPercentage <= 100.00`
- `hostAllocationCents + platformAllocationCents = grossAmountCents` on `Payment`
- `hostReversalAmountCents + platformReversalAmountCents = amountCents` on `Refund`

---

## 4. Balanced Double-Entry Accounting Constraints

To enforce double-entry accounting integrity, any `LedgerTransaction` marked `isPosted = true` must have entries (`LedgerEntry[]`) whose sum of `amountCents` is exactly `0`.
We enforce this via a custom PostgreSQL database trigger:

```sql
CREATE OR REPLACE FUNCTION verify_ledger_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
    entry_sum INT;
BEGIN
    SELECT SUM("amountCents") INTO entry_sum
    FROM "ledger_entries"
    WHERE "transactionId" = NEW."id";

    IF NEW."isPosted" = true THEN
        IF entry_sum IS NULL OR entry_sum <> 0 THEN
            RAISE EXCEPTION 'Ledger transaction % cannot be posted because its entries do not balance to zero.', NEW."id";
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

This guarantees absolute ledger immutability and transactional safety.

---

## 5. High-Security Owner Admin Retention Failsafes

To ensure at least one active Owner Administrator always remains in the system (preventing accidental lockouts or moderator escalation loops), we enforce a database-level trigger:

```sql
CREATE OR REPLACE FUNCTION verify_owner_admin_retention()
RETURNS TRIGGER AS $$
DECLARE
    active_owner_admin_count INT;
BEGIN
    IF (TG_OP = 'DELETE' AND OLD.role = 'OWNER_ADMIN') OR
       (TG_OP = 'UPDATE' AND OLD.role = 'OWNER_ADMIN' AND NEW.role <> 'OWNER_ADMIN') THEN

        SELECT COUNT(*) INTO active_owner_admin_count
        FROM "user_role_assignments"
        WHERE role = 'OWNER_ADMIN' AND "userId" <> OLD."userId";

        IF active_owner_admin_count = 0 THEN
            RAISE EXCEPTION 'Database operation aborted: The final Owner Administrator cannot be removed, demoted, or deactivated.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

This is attached to `user_role_assignments` and natively protects Owner Administrator accounts.
