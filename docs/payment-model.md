# Payment Gateway & Stripe Connect - TheQueue

TheQueue (thequeue.live) integrates **Stripe Connect** as the sole payment and payout gateway for its initial production release. It is designed to offer secure, immediate payments, flexible broadcaster priority pricing, and streamlined automated bank payouts.

---

## 1. Stripe Connect Integration Architecture

The platform uses Stripe Connect **Destination Charges with an Application Fee**.

### The Transaction Flow:

1. **Initiation**: An artist wants to submit a track to an approved host's priority tier. They purchase a priority slot.
2. **Charge Processing**: Stripe processes the gross payment (e.g. $20.00 USD) through our main Stripe account.
3. **Immediate Allocation (85/15 Split)**:
   - **Host Balance**: 85% ($17.00 USD) is immediately transferred directly into the host's Stripe Connected account balance.
   - **Platform Application Fee**: 15% ($3.00 USD) is retained in TheQueue's platform Stripe account.
   - **Processing Fees**: Stripe processing fees are deducted strictly from TheQueue's 15% application fee portion. The host connected account receives their entire $17.00 USD without any processor fee deduction.
4. **Playback Hold Independent**: We do not implement a playback hold on host earnings. Earnings are allocated to the host's Connected Stripe balance immediately upon successful checkout, not upon stream playback.

---

## 2. No Platform Wallet or withdrawal Controls

TheQueue **does not** manage host payout requests, maintain an internal platform wallet, or initiate bank payouts:

- Stripe Connected Accounts directly control the payout schedule, settlement eligibility, timing, and transfers.
- Our database models (`Payout` and `PayoutHold`) act strictly as **read-only informational status synchronization records** updated via Stripe Connect webhook events.
- TheQueue does not initiate, schedule, or promise external bank settlements.

---

## 3. Minimum Price Floor Guard (Validation)

Because Stripe processing fees are paid strictly from TheQueue's 15% application fee:

- A flat fee like $0.30 + 2.9% on small payments could result in zero or negative net revenue for the platform.
- E.g. A $2.00 USD payment results in:
  - Gross fee: $0.30 USD
  - Stripe processing fee: $0.36 USD
  - Net revenue: -$0.06 USD
- Therefore, we enforce a strict **minimum price floor configuration** of **$2.00 USD (200 cents)** on all custom host priority-tier creations and edits, validated natively by `@platform/validation` input schemas.

---

## 4. Stripe Platform Account Configuration & Metadata Security

To safeguard production credential keys, we **never** store live Stripe secret keys as plaintext database values. Production keys must be stored in encrypted environment variables or a dedicated secrets manager.

The database stores only **non-secret configuration metadata** in `StripePlatformConfiguration`:

- `stripe_platform_account_id`: e.g. `acct_1Pzq8...`
- `stripe_platform_display_name`: Display name on Stripe invoices
- `stripe_platform_mode`: TEST or LIVE (Never confused!)
- `stripe_platform_connected`: Active connection verification state.

### Webhook Endpoint Tracking

We track Stripe webhook endpoints in `StripeWebhookEndpointReference` (webhook ID, environment, endpoint URL, enabled state). Webhook signing secrets are NEVER stored in the database.

---

## 5. Payment Emergency Controls

Owner Administrators can stop new paid submissions instantly without deleting or altering the Stripe configuration:

- States: `PAYMENTS_ENABLED`, `PAYMENTS_PAUSED`, `PAYMENTS_DISABLED`.
- Triggered by Owner Admin, completely tracked with reasons and audit timestamps.
- Moderators may view this state, but cannot modify it. Free line submissions can continue while paid submissions are paused.
