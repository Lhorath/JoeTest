# Double-Entry Financial Ledger Foundation - TheQueue

TheQueue enforces a highly secure, append-only, balanced double-entry accounting ledger to track all transactions, allocations, refunds, disputes, and payouts. This prevents un-auditable updates and simplifies financial reconciliation.

---

## 1. Double-Entry Accounts Hierarchy

Our ledger accounts are mapped under standard accounting codes:

| Account Code              | Category  | Description                                                                                  | Normal Balance        |
| ------------------------- | --------- | -------------------------------------------------------------------------------------------- | --------------------- |
| **`PAYMENT_CLEARING`**    | ASSET     | Holds customer priority payments before Stripe settlements.                                  | Debit (+ / positive)  |
| **`HOST_PAYABLE`**        | LIABILITY | Represents Stripe Connect gross allocation (85%) payable directly to host connected balance. | Credit (- / negative) |
| **`PLATFORM_COMMISSION`** | REVENUE   | TheQueue's gross platform application fee portion (15%).                                     | Credit (- / negative) |
| **`PROCESSOR_EXPENSE`**   | EXPENSE   | Stripe transaction processing fees (deducted from TheQueue's 15%).                           | Debit (+ / positive)  |
| **`REFUND_LIABILITY`**    | LIABILITY | Customer refund reserve account.                                                             | Credit (- / negative) |
| **`DISPUTE_RESERVE`**     | LIABILITY | Disputes holding reserve account.                                                            | Credit (- / negative) |
| **`TAX_PAYABLE`**         | LIABILITY | Sales taxes collected on commission charges.                                                 | Credit (- / negative) |
| **`PAYOUT_CLEARING`**     | ASSET     | Payout clearing destination for Stripe external payouts.                                     | Debit (+ / positive)  |

---

## 2. Balanced Posting Examples (USD integer cents)

### Scenario A: Capturing a $20.00 USD priority track submission

- Stripe takes a processing fee of $0.88 (4.4% of gross) which is deducted strictly from TheQueue's 15% platform allocation.

**Posting ledger entries:**

1. **DEBIT** `PAYMENT_CLEARING` (Asset): **+2000 cents** ($20.00 USD)
2. **CREDIT** `HOST_PAYABLE` (Liability): **-1700 cents** ($17.00 USD / Host's 85% share)
3. **CREDIT** `PLATFORM_COMMISSION` (Revenue): **-300 cents** ($3.00 USD / TheQueue's 15% application fee)
4. **DEBIT** `PROCESSOR_EXPENSE` (Expense): **+88 cents** (Stripe processing fee paid by platform)
5. **CREDIT** `PAYMENT_CLEARING` (Asset): **-88 cents** (Adjustment for fee deduction)

- **Total Transaction sum**: `(+2000) + (-1700) + (-300) + (+88) + (-88) = 0` (Perfect balance!)

---

## 3. Append-Only Reversals Mechanics

The financial ledger is **append-only**. We never mutate or overwrite original transactions or allocations during refunds or disputes. Instead, we create a corresponding reversal transaction with reversed amount signs:

### Scenario B: Refunding $20.00 USD back to customer

1. **CREDIT** `PAYMENT_CLEARING` (Asset): **-2000 cents** (Reversing payment receipt)
2. **DEBIT** `HOST_PAYABLE` (Liability): **+1700 cents** (Reversing host payable obligation)
3. **DEBIT** `PLATFORM_COMMISSION` (Revenue): **+300 cents** (Reversing platform commission)
4. **CREDIT** `PROCESSOR_EXPENSE` (Expense): **-88 cents** (Stripe processing fee adjustment if refunded)
5. **DEBIT** `PAYMENT_CLEARING` (Asset): **+88 cents** (Stripe processing fee adjustment)

- **Total Reversal sum**: `-2000 + 1700 + 300 - 88 + 88 = 0` (Perfect balance!)
- This preserves the original historical transaction while recording the exact refund event.
