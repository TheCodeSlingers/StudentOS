# StudentOS — Pricing & Plan Definition

**Status:** Production specification for initial billing plans. Everything below is the starting configuration based on the PRD limits. The structure (which fields exist, how overrides work) is locked for Plan rows and is checked against by the SubscriptionModule.

---

## 1. Why This Doc Exists

`Subscription`/`Plan` in your schema needs real rows before anything else can be seeded or tested against realistic limits. `BatchModule`, `OrgModule`, and `StudentImportModule` all call `SubscriptionModule.checkLimit()` — that function is meaningless without actual tier values to check against.

---

## 2. Proposed Tiers

| Field            | **Free**                          | **Starter**   | **Growth**                           |
| ---------------- | --------------------------------- | ------------- | ------------------------------------ |
| `maxBatches`     | 1                                 | 3             | 10                                   |
| `maxStudents`    | 30                                | 150           | 500                                  |
| `maxEmployees`   | 2                                 | 5             | 15                                   |
| `priceCents`     | 0                                 | 1900 ($19/mo) | 4900 ($49/mo)                        |
| Fraud detection  | Basic (rotating code + duplicate) | Basic         | Basic + review queue prioritization  |
| Report export    | CSV only                          | CSV + Excel   | CSV + Excel + Dynamic Report Builder |
| Discord webhooks | ❌                                | ✅            | ✅                                   |
| Support          | Community/email                   | Email         | Priority email                       |

**Rationale for these specific numbers:**

- **Free = 1 batch** directly matches the v1 solo-founder use case already built into your role model (`ADMIN` with implicit batch access) — a free user's whole experience should work without ever hitting a wall they can't explain.
- **`maxStudents` at 30 for Free** is generous enough that a small bootcamp cohort (typical size 15–30) fits entirely on the free tier — this is a deliberate growth lever: let people fully experience the product before they need to pay, then the _second_ batch or a bigger cohort is what triggers upgrade.
- **Growth at 500 students / 10 batches** should comfortably fit a mid-size training org running several concurrent cohorts — the ceiling above that is where a future custom/Enterprise tier with negotiated limits (via `Subscription.override*` fields) takes over rather than a fourth fixed tier.

**Open questions for the founder to decide (not something I can determine for you):**

- Is $19/$49 the right price point for your target market (bootcamps, training programs)? This depends on what they currently pay for the Google Sheets + manual labor alternative you're replacing — worth a few conversations with actual prospective users before finalizing.
- Annual billing discount? Common SaaS pattern is ~15–20% off for annual — worth deciding once Paddle/billing integration is actually being built, not before.
- Trial length on paid tiers — 14 days is a common default if you want one.

---

## 3. Feature Flags (`Plan.featureFlags` JSON shape)

Rather than adding a new boolean column to `Plan` every time a feature becomes tier-gated, use the existing `featureFlags Json` field:

```json
{
  "dynamicReportBuilder": false,
  "discordWebhooks": false,
  "fraudReviewPrioritization": false,
  "csvExport": true,
  "excelExport": false
}
```

Check flags in code via `plan.featureFlags.dynamicReportBuilder === true` rather than hardcoding tier-name comparisons (`plan.name === 'Growth'`) — this way, granting one Starter customer early access to a Growth feature is a one-row database update, not a code change.

---

## 4. Seed Data (for `prisma/seed.ts`)

```typescript
const plans = [
  {
    name: "Free",
    maxBatches: 1,
    maxStudents: 30,
    maxEmployees: 2,
    priceCents: 0,
    featureFlags: {
      dynamicReportBuilder: false,
      discordWebhooks: false,
      fraudReviewPrioritization: false,
      csvExport: true,
      excelExport: false,
    },
  },
  {
    name: "Starter",
    maxBatches: 3,
    maxStudents: 150,
    maxEmployees: 5,
    priceCents: 1900,
    featureFlags: {
      dynamicReportBuilder: false,
      discordWebhooks: true,
      fraudReviewPrioritization: false,
      csvExport: true,
      excelExport: true,
    },
  },
  {
    name: "Growth",
    maxBatches: 10,
    maxStudents: 500,
    maxEmployees: 15,
    priceCents: 4900,
    featureFlags: {
      dynamicReportBuilder: true,
      discordWebhooks: true,
      fraudReviewPrioritization: true,
      csvExport: true,
      excelExport: true,
    },
  },
];

for (const plan of plans) {
  await prisma.plan.upsert({
    where: { name: plan.name },
    update: plan,
    create: plan,
  });
}
```

Every new signup's `Subscription` defaults to `planId` = Free, `status: TRIAL` (per your `SubscriptionStatus` enum) — decide trial length as a config value, not hardcoded in the seed.

---

## 5. Enterprise / Custom Limits

Rather than a fourth fixed tier, use `Subscription.overrideMaxBatches` / `overrideMaxStudents` / `overrideMaxEmployees` (already in your schema) for negotiated deals — a Platform Admin sets these manually per org, with `overrideReason` documenting why. This matches how you described handling "manually override plan limits for a specific org" in the PRD's platform-admin section, and avoids needing to invent a new tier every time one large customer needs slightly different numbers than the next.

---

## 6. What NOT to Decide Right Now

Two weeks is too short to also solve billing-provider integration, invoicing, or tax handling — that's explicitly out of scope for this sprint. This document only needs to unblock **seeding the `Plan` table and testing limit-enforcement logic** — actual checkout/payment flow is a separate, later effort. (Worth noting: you previously identified Paddle as your preferred payment processor for a different project, WorkLedger — if you want the same choice here, that's worth an explicit decision rather than an assumption carried over.)
