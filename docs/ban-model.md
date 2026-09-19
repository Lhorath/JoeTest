# Ban & Identity Restriction System - TheQueue

TheQueue enforces a multi-tier, GDPR-compliant ban management system to exclude malicious actors, mitigate chargeback fraud, and protect streamers from harassment.

---

## 1. Multi-Scope Restriction Limits

Bans can be targeted at specific system modules to enforce selective restrictions:

- **`ACCOUNT`**: Excludes the user from logging in.
- **`HOST_PRIVILEGES`**: revokes host application eligibility.
- **`SUBMISSIONS`**: Prevokes queue submission privileges (standard free or paid).
- **`PAYMENTS`**: Blocks payment intents (chargeback mitigation).
- **`PAYOUTS`**: Holds connected Stripe Connect bank transfers.
- **`CONTENT_UPLOAD`**: Blocks music track uploads.
- **`FULL_PLATFORM`**: System-wide ban.

---

## 2. Privacy-Preserving Identifiers (Hashed Values)

To maintain GDPR compliance and safeguard personally identifiable information (PII):

- We **never** store raw banned emails, raw banned IP addresses, or sensitive device fingerprints directly in general logs.
- Instead, banned identifiers are secure-hashed using **SHA-256** prior to database writes in the `BanIdentifier` table.
- At runtime, query emails and IP addresses are hashed using the exact same SHA-256 process before matching against `BanIdentifier.hashedValue`. This preserves perfect privacy.

---

## 3. Stripe & PayPal Integration Restrictions

Bans extend to payment provider profiles:

- **Stripe Account ID**: Prevents banned hosts from creating new Stripe Connected accounts.
- **Stripe Customer ID**: Prevents banned users from checking out with cards linked to their Stripe profiles.

---

## 4. MAC Address Ban Exclusion (Technical Boundary)

Web browsers run inside a heavily restricted sandbox environment and **cannot** read or retrieve a machine's local MAC address:

- Consequently, we explicitly exclude MAC-address columns from our database schema.
- Hardware and client-side device blocks are modeled using time-ordered, approximate **device fingerprint hashes** or standard mobile device risk attestation signals.
