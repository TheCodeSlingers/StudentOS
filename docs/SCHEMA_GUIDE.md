# StudentOS — Schema Guide

**Companion to:** `schema.prisma` (v1.0)
**Purpose:** Explain *why* the schema is shaped the way it is, not just what fields exist — so future changes don't accidentally break the assumptions it was built on.

---

## 1. The One Rule Everything Else Follows

> **Every record belongs to an `Organization`, from day one — even though v1 only ever has one Admin per org.**

This is the single decision that makes the "solo founder now, real multi-tenant org later" migration painless. Nothing points at `User` directly except `Membership`. If you're ever tempted to add a shortcut foreign key straight to `User` "because it's simpler," don't — that's exactly the shortcut that costs a migration later.

---

## 2. Identity & Membership

### `User`
One row per human, ever. Never carries a role, an org, or a batch. Just identity: email, name, auth.

### `Membership`
This is where **role lives** — not on `User`. A `Membership` is always scoped to one `Organization` and has exactly one `role` (`ADMIN | MENTOR | STUDENT`).

**Why `@@unique([userId, organizationId, role])` and not `@@unique([userId, organizationId])`:**
A person can hold more than one role in the same org — a founder who's `ADMIN` and also personally mentors a batch would have two `Membership` rows. If the unique key were just `(userId, organizationId)`, that would be structurally impossible without a schema change. This way, it's just "insert another row."

**v1 role collapse:** Owner, Admin, and Manager were merged into a single `ADMIN` role to keep v1 simple. `ADMIN` implicitly has Mentor-level permissions on every batch in its org — enforced in your **permission-resolution code**, not the schema (there's no `BatchMembership` row required for an Admin to act on a batch). When you split Manager or Owner back out later, that's a new enum value plus new rows in your permission map — not a data migration.

**Invite fields** (`inviteToken`, `inviteExpiresAt`, `invitedByMembershipId`) support the "invite an employee" flow: generate a token, email it, and when accepted, either attach to an existing `User` (matched by email) or create a new one.

### `BatchMembership`
This is where the **CR flag lives** (`isCR: Boolean`) — CR is a permission flag on a student's batch enrollment, not a separate account type or role. A batch can have multiple CRs simultaneously; reassigning CR status is just flipping `isCR` on different rows, tracked via `assignedAt`/`revokedAt` so history isn't lost.

**Never hard-delete a `BatchMembership` that has `Attendance` rows** — the schema enforces this for you (see §5).

---

## 3. Organization, Plans & Batches

### `Organization`
Auto-created silently at signup in v1 — there's no "create org" screen yet, but the row exists from the first `User.create()` call. This is what lets you add multi-employee orgs later without backfilling `organizationId` onto years of historical data.

### `Plan` / `Subscription`
Plan limits (`maxBatches`, `maxStudents`, `maxEmployees`) are **data, not code** — don't hardcode "1 batch for free tier" in application logic. Enforce it by checking `Subscription.plan.maxBatches` against a live count, using a Redis atomic counter at the point of creation to avoid race conditions when two batch-creation requests land near the limit simultaneously.

`Subscription` also carries **override fields** (`overrideMaxBatches`, etc.) — these exist for support cases where a Platform Admin manually grants an org more room than their plan allows, without changing their actual plan. If any `override*` field is non-null, your limit-check logic should prefer it over the plan's default.

### `Batch`
Belongs to `Organization`, not to a `User` — the same principle as everywhere else. `lateThresholdMinsOverride` and `attendanceDurationMinsOverride` are nullable; when null, fall back to `OrganizationSettings`. Only set them when a specific batch genuinely needs stricter/looser rules than the org default.

---

## 4. Sessions & Attendance

### `SessionTemplate` → `Session`
A template defines the recurrence pattern (e.g. "Sun/Tue/Thu at 9 PM"); concrete `Session` rows are generated from it by a scheduled job, not created manually each day. One-time sessions skip the template and are created directly.

### Attendance window control
`Session.attendanceOpenedAt` / `attendanceOpenedBy` and their `Closed` counterparts are the enforcement point for "only CR/Mentor can open the window, and only during that window can a student submit." These are real `Membership` foreign keys (not bare strings) so you always know exactly who opened/closed a given session's window.

### `Attendance`
One row per student per session, enforced by `@@unique([sessionId, studentBatchMembershipId])` — this is your hard guarantee against duplicate submissions at the database level, not just application logic.

- **`method`** (`SELF_SUBMITTED` vs `MANUAL`) distinguishes a student's own tap from a CR's manual override — this matters because manual entries are excluded from fraud scoring but tracked for CR-activity auditing.
- **`riskScore` / `isFlagged`** are set asynchronously by your fraud-scoring job — never block a submission waiting on this.
- **`reviewedByMembershipId` / `reviewedAt` / `reviewOutcome`** turn a flag into an actual resolved case. Without these, flagged attendance just sits as `isFlagged: true` forever with no record of anyone having looked at it — this is what makes the "manual review queue" from the PRD a queryable, closeable workflow instead of a permanent list of unresolved suspicions.

### `PresenceHeartbeat`
Deliberately lightweight — just a ping timestamp tied to an `Attendance` row. This is what your gap-pattern-flagging logic reads to distinguish "one short gap = wifi blip" from "long silence then a submission at the very end." It proves the attendance page was open, not that the student was physically present — keep that distinction in your product copy, not just your code comments.

---

## 5. Why Some Relations Cascade and Others Restrict

This is the part most schemas get wrong, so it's worth being explicit:

| Relation | Behavior | Why |
|---|---|---|
| `Membership` → `User`/`Organization` | `Cascade` | In practice you never hard-delete a `User` or `Organization` — you soft-delete (`deletedAt`). Cascade is a safety net for the rare true hard-delete, not the everyday path. |
| `BatchMembership` → `Membership`/`Batch` | `Cascade` | Same reasoning — but see the next row for what actually stops accidental data loss. |
| **`Attendance` → `BatchMembership`** | **`Restrict`** | This is the one that matters most. If a `BatchMembership` has any `Attendance` rows, Postgres will **refuse** to delete it — even if something upstream tries to cascade into it. This is what physically prevents "remove a student from a batch" from silently erasing their attendance history. To remove a student, set `revokedAt`, never delete the row. |
| `AuditLog` → `Organization`/`User` | `SetNull` | The audit log entry survives even if its subject is later deleted — you keep the historical record, just with a null reference instead of a broken one. |
| `Attendance` → `Session` | `Cascade` | Sessions are practically never hard-deleted (they're cancelled via `status`, not removed) so this is a safety net, same as row 1. |

**The pattern:** anything that represents *"this thing happened"* (Attendance, AuditLog, Ticket, PlatformAuditLog) should never silently disappear because something upstream got cleaned up. Anything that represents *"this thing currently exists"* (Membership, BatchMembership, Batch) can safely cascade, because your application layer should be soft-deleting/archiving those anyway.

---

## 6. Tickets — the Informed/Leave State Machine

```
PENDING → CR_ACCEPTED (terminal, INFORMED)
        → CR_REJECTED → APPEALED → MENTOR_ACCEPTED (terminal, INFORMED)
                                  → MENTOR_REJECTED (terminal, ABSENT)
```

`crDecisionBy` / `mentorDecisionBy` are separate `Membership` relations (not one shared field) because a ticket can pass through both a CR's decision and a Mentor's decision at different times — you need both preserved, not overwritten.

`createdAt` doubles as the "was this ticket opened before the session ended" check — enforce that window in your application layer (compare against `Session.scheduledEnd`), since Prisma/Postgres can't express "insert only if before X" as a constraint without a trigger.

---

## 7. Bulk Import (`StudentImportJob` / `StudentImportRow`)

Split into a parent job and per-row children specifically so the result of a CSV upload is a **row-by-row report**, not a single pass/fail. `StudentImportJob.status` tracks the overall job (including `COMPLETED_WITH_ERRORS` — most real imports have a few bad rows), while each `StudentImportRow` keeps the raw data, its individual outcome, and an error message if it failed. This lets your UI show "47 succeeded, 3 failed — here's why" instead of just "import failed."

---

## 8. Platform Admin Layer — Deliberately Separate

`PlatformAdmin`, `PlatformAuditLog`, and `ImpersonationSession` exist **entirely outside** the `Membership`/`Organization` model. This isn't an oversight — platform staff should never be representable as a tenant-side role, because that would blur "runs the SaaS" with "runs one customer's org."

- **`PlatformAuditLog`** is a separate table from tenant `AuditLog` on purpose — a platform admin's actions (suspending an org, overriding a plan limit) should never be queryable or deletable through tenant-facing code paths.
- **`ImpersonationSession`** has a mandatory `reason` and explicit `startedAt`/`endedAt` — this is what lets you (eventually) show the impersonated org "an admin accessed your account on [date] for [reason]," which is the trust mechanism the PRD calls for.

---

## 9. Webhooks

`WebhookConfig` is scoped to an org and optionally narrowed to one batch (`batchId: null` = org-wide). `events: String[]` uses Postgres's native array type — when a `Notification` with `channel: WEBHOOK` needs delivery, your notification-dispatch job looks up active `WebhookConfig` rows matching the org/batch and event type, rather than storing a webhook URL directly on the notification itself. This means changing a Discord URL doesn't require touching historical notification rows.

---

## 10. Fields That Are Deliberately *Not* Soft-Deletable

`Attendance`, `Ticket`, `AuditLog`, `PlatformAuditLog`, and `SessionActivityEvent` do **not** have a `deletedAt` field. This is intentional, not an oversight — these are historical records of things that happened, and the entire audit/trust layer of the product depends on them being permanent. If you ever find yourself wanting to "soft delete" one of these, the real fix is almost always a **correction record** (a new row referencing the old one), not deleting the original — exactly the pattern the Ticket state machine already uses (an appeal doesn't erase the original rejection, it adds a new resolution on top).

`Notification` is the one exception — it got `deletedAt` because a user clearing their notification list is a normal UX action with no audit implications.

---

## 11. Extending This Schema Later

A quick reference for the changes you've already scoped as "future, not v1":

| Future feature | How it plugs in |
|---|---|
| Split `ADMIN` back into Owner + Admin + Manager | Add enum values to `MembershipRole`; add rows to your permission-map; no data migration |
| Delegated batch-scoped Manager | Same `BatchMembership` pattern already used for Mentor — just a new role value |
| Face verification / GPS attendance | New optional fields on `Attendance` (e.g. `verifiedLat`, `verifiedLng`, `faceMatchScore`) — additive, no breaking change |
| AI-based fraud detection | Replace the heuristic that sets `riskScore` — the field itself doesn't change, only what populates it |
| Native Meet/Zoom join verification | New table (`MeetingParticipantEvent` or similar) feeding into the same `PresenceHeartbeat`-style gap analysis, or replacing it entirely once you have real join/leave timestamps |

---

## 12. Quick Field-Ownership Cheat Sheet

When you're not sure where a piece of data belongs, use this:

- **"Who is this person, globally?"** → `User`
- **"What can this person do, in this org?"** → `Membership`
- **"What can this person do, in this specific batch?"** → `BatchMembership`
- **"What happened, and who caused it?"** → `Attendance` / `Ticket` / `SessionActivityEvent` / `AuditLog`
- **"What's the org allowed to do, per their plan?"** → `Plan` / `Subscription`
- **"What did the SaaS operator do to this org?"** → `PlatformAuditLog` / `ImpersonationSession`

---

## 13. Setup & Migrations

```bash
# 1. Install
npm install prisma @prisma/client
npx prisma init   # if not already initialized

# 2. Point DATABASE_URL at your Postgres instance (.env)
DATABASE_URL="postgresql://user:password@localhost:5432/attendanceops"

# 3. Validate the schema compiles
npx prisma format
npx prisma validate

# 4. Create and apply the first migration
npx prisma migrate dev --name init

# 5. Generate the Prisma Client
npx prisma generate
```

After the first migration, every subsequent schema change follows the same `migrate dev --name <description>` pattern — Prisma diffs against the last migration and generates the SQL for you. Never hand-edit a generated migration file after it's been applied to a shared database; add a new migration instead.

**Seeding for local development:** create `prisma/seed.ts` that creates one `Plan` (e.g. "Free" with `maxBatches: 1`), one `Organization`, and one `Membership(role: ADMIN)` — this mirrors exactly what your real signup flow will do, so you're testing against realistic data from day one rather than a hand-crafted fixture that skips the org auto-creation step.

---

## 14. Permission Resolution Pattern

Every guard in the application should resolve permissions the same way — through `Membership`, never a shortcut. Pseudocode for the shape to implement:

```ts
async function can(userId: string, action: string, organizationId: string, batchId?: string): Promise<boolean> {
  const memberships = await prisma.membership.findMany({
    where: { userId, organizationId, status: 'ACTIVE', deletedAt: null }
  });

  for (const m of memberships) {
    if (m.role === 'ADMIN') return true; // implicit full access, incl. all batches in v1

    if (m.role === 'MENTOR' && batchId) {
      const batchMembership = await prisma.batchMembership.findFirst({
        where: { membershipId: m.id, batchId, revokedAt: null }
      });
      if (batchMembership && MENTOR_PERMISSIONS.includes(action)) return true;
    }

    if (m.role === 'STUDENT' && batchId) {
      const batchMembership = await prisma.batchMembership.findFirst({
        where: { membershipId: m.id, batchId, revokedAt: null }
      });
      if (batchMembership?.isCR && CR_PERMISSIONS.includes(action)) return true;
      if (STUDENT_PERMISSIONS.includes(action)) return true;
    }
  }
  return false;
}
```

The important part isn't the exact code — it's the rule: **every check starts from `Membership`, filters by `status`/`deletedAt`, and only descends into `BatchMembership` when the action is batch-scoped.** If you ever find yourself writing `if (session.batch.organizationId === user.orgId)` as a shortcut instead of going through this function, that's a permission bug waiting to happen — it skips role and CR/revocation checks entirely.

---

## Appendix: Full Model Reference

Generated directly from `schema.prisma` — every field, every relation, every constraint, for every model. If this ever looks out of sync with the actual schema file, regenerate it; don't hand-edit it, since drift here is worse than not having it.


### `User`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `email` | `String` |  |
| `name` | `String` |  |
| `passwordHash` | `String?` |  |
| `authProvider` | `String?` | e.g. "email", "google" |
| `createdAt` | `DateTime` |  |
| `updatedAt` | `DateTime` |  |
| `deletedAt` | `DateTime?` | soft delete — never hard-delete a User |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `memberships` | `Membership[]` |  |
| `actorAuditLogs` | `AuditLog[]` |  |
| `tickets` | `Ticket[]` |  |
| `presenceHeartbeats` | `PresenceHeartbeat[]` |  |
| `notifications` | `Notification[]` |  |
| `impersonationSessions` | `ImpersonationSession[]` |  |

**Constraints/Indexes**
```
@@index([email])
@@index([deletedAt])
```

### `Organization`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `name` | `String` |  |
| `logoUrl` | `String?` |  |
| `timezone` | `String` |  |
| `createdAt` | `DateTime` |  |
| `updatedAt` | `DateTime` |  |
| `deletedAt` | `DateTime?` | soft delete — required for §18.8 data/compliance export |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `settings` | `OrganizationSettings?` |  |
| `subscription` | `Subscription?` |  |
| `memberships` | `Membership[]` |  |
| `batches` | `Batch[]` |  |
| `auditLogs` | `AuditLog[]` |  |
| `studentImportJobs` | `StudentImportJob[]` |  |
| `notifications` | `Notification[]` |  |
| `webhookConfigs` | `WebhookConfig[]` |  |

**Constraints/Indexes**
```
@@index([deletedAt])
```

### `OrganizationSettings`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `organizationId` | `String` |  |
| `defaultAttendanceDurationMins` | `Int` |  |
| `lateThresholdMins` | `Int` |  |
| `updatedAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `organization` | `Organization` |  |

### `Membership`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `userId` | `String` |  |
| `organizationId` | `String` |  |
| `role` | `MembershipRole` |  |
| `status` | `MembershipStatus` |  |
| `invitedByMembershipId` | `String?` |  |
| `inviteToken` | `String?` |  |
| `inviteExpiresAt` | `DateTime?` |  |
| `createdAt` | `DateTime` |  |
| `updatedAt` | `DateTime` |  |
| `deletedAt` | `DateTime?` | soft delete — preserve for audit even if removed from org |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `invitedByMembership` | `Membership?` |  |
| `invitedMemberships` | `Membership[]` |  |
| `user` | `User` |  |
| `organization` | `Organization` |  |
| `batchMemberships` | `BatchMembership[]` |  |
| `manualAttendanceMarks` | `Attendance[]` |  |
| `sessionActivityEvents` | `SessionActivityEvent[]` |  |
| `openedSessions` | `Session[]` |  |
| `closedSessions` | `Session[]` |  |
| `crTicketDecisions` | `Ticket[]` |  |
| `mentorTicketDecisions` | `Ticket[]` |  |
| `initiatedImportJobs` | `StudentImportJob[]` |  |
| `reviewedAttendances` | `Attendance[]` |  |

**Constraints/Indexes**
```
@@unique([userId, organizationId, role])
@@index([organizationId])
@@index([organizationId, role])
@@index([userId])
@@index([deletedAt])
```

### `Plan`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `name` | `String` | e.g. "Free", "Growth", "Scale" |
| `maxBatches` | `Int` |  |
| `maxStudents` | `Int` |  |
| `maxEmployees` | `Int` |  |
| `priceCents` | `Int` |  |
| `featureFlags` | `Json` |  |
| `createdAt` | `DateTime` |  |
| `updatedAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `subscriptions` | `Subscription[]` |  |

### `Subscription`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `organizationId` | `String` |  |
| `planId` | `String` |  |
| `status` | `SubscriptionStatus` |  |
| `currentPeriodEnd` | `DateTime?` |  |
| `overrideMaxBatches` | `Int?` |  |
| `overrideMaxStudents` | `Int?` |  |
| `overrideMaxEmployees` | `Int?` |  |
| `overrideReason` | `String?` |  |
| `overriddenByPlatformAdminId` | `String?` |  |
| `createdAt` | `DateTime` |  |
| `updatedAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `organization` | `Organization` |  |
| `plan` | `Plan` |  |
| `overriddenByPlatformAdmin` | `PlatformAdmin?` |  |

**Constraints/Indexes**
```
@@index([status])
@@index([planId])
```

### `Batch`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `organizationId` | `String` |  |
| `name` | `String` |  |
| `startDate` | `DateTime` |  |
| `endDate` | `DateTime?` |  |
| `capacity` | `Int?` |  |
| `defaultMeetLink` | `String?` |  |
| `isArchived` | `Boolean` |  |
| `lateThresholdMinsOverride` | `Int?` |  |
| `attendanceDurationMinsOverride` | `Int?` |  |
| `createdAt` | `DateTime` |  |
| `updatedAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `organization` | `Organization` |  |
| `batchMemberships` | `BatchMembership[]` |  |
| `sessionTemplates` | `SessionTemplate[]` |  |
| `sessions` | `Session[]` |  |
| `studentImportJobs` | `StudentImportJob[]` |  |
| `webhookConfigs` | `WebhookConfig[]` |  |

**Constraints/Indexes**
```
@@index([organizationId])
@@index([isArchived])
```

### `BatchMembership`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `membershipId` | `String` |  |
| `batchId` | `String` |  |
| `isCR` | `Boolean` |  |
| `assignedAt` | `DateTime` |  |
| `revokedAt` | `DateTime?` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `membership` | `Membership` |  |
| `batch` | `Batch` |  |
| `attendances` | `Attendance[]` |  |

**Constraints/Indexes**
```
@@unique([membershipId, batchId])
@@index([batchId])
@@index([membershipId])
@@index([batchId, isCR])
```

### `SessionTemplate`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `batchId` | `String` |  |
| `title` | `String` |  |
| `description` | `String?` |  |
| `recurrenceRule` | `Json` | e.g. { "days": ["SUN","TUE","THU"], "time": "21:00" } |
| `durationMins` | `Int` |  |
| `meetLink` | `String?` |  |
| `isActive` | `Boolean` |  |
| `createdAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `batch` | `Batch` |  |
| `sessions` | `Session[]` |  |

**Constraints/Indexes**
```
@@index([batchId])
```

### `Session`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `batchId` | `String` |  |
| `templateId` | `String?` |  |
| `title` | `String` |  |
| `description` | `String?` |  |
| `scheduledStart` | `DateTime` |  |
| `scheduledEnd` | `DateTime` |  |
| `meetLink` | `String?` |  |
| `type` | `SessionType` |  |
| `status` | `SessionStatus` |  |
| `attendanceOpenedAt` | `DateTime?` |  |
| `attendanceOpenedById` | `String?` |  |
| `attendanceClosedAt` | `DateTime?` |  |
| `attendanceClosedById` | `String?` |  |
| `currentCode` | `String?` |  |
| `codeRotatedAt` | `DateTime?` |  |
| `createdAt` | `DateTime` |  |
| `updatedAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `batch` | `Batch` |  |
| `template` | `SessionTemplate?` |  |
| `attendanceOpenedBy` | `Membership?` |  |
| `attendanceClosedBy` | `Membership?` |  |
| `attendances` | `Attendance[]` |  |
| `activityEvents` | `SessionActivityEvent[]` |  |
| `tickets` | `Ticket[]` |  |

**Constraints/Indexes**
```
@@index([batchId])
@@index([scheduledStart])
@@index([status])
```

### `Attendance`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `sessionId` | `String` |  |
| `studentBatchMembershipId` | `String` |  |
| `status` | `AttendanceStatus` |  |
| `method` | `AttendanceMethod` |  |
| `submittedAt` | `DateTime?` |  |
| `markedByMembershipId` | `String?` |  |
| `manualReason` | `String?` |  |
| `ipAddress` | `String?` |  |
| `deviceFingerprint` | `String?` |  |
| `userAgent` | `String?` |  |
| `riskScore` | `Float?` |  |
| `isFlagged` | `Boolean` |  |
| `reviewedByMembershipId` | `String?` |  |
| `reviewedAt` | `DateTime?` |  |
| `reviewOutcome` | `FraudReviewOutcome?` | null until reviewed |
| `createdAt` | `DateTime` |  |
| `updatedAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `session` | `Session` |  |
| `studentBatchMembership` | `BatchMembership` |  |
| `markedByMembership` | `Membership?` |  |
| `reviewedBy` | `Membership?` |  |
| `presenceHeartbeats` | `PresenceHeartbeat[]` |  |
| `ticket` | `Ticket?` |  |

**Constraints/Indexes**
```
@@unique([sessionId, studentBatchMembershipId]) // one attendance record per student per session
@@index([sessionId])
@@index([studentBatchMembershipId])
@@index([isFlagged])
@@index([status])
@@index([reviewOutcome])
```

### `PresenceHeartbeat`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `attendanceId` | `String` |  |
| `userId` | `String` |  |
| `pingAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `attendance` | `Attendance` |  |
| `user` | `User` |  |

**Constraints/Indexes**
```
@@index([attendanceId, pingAt])
@@index([userId])
```

### `Ticket`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `sessionId` | `String` |  |
| `attendanceId` | `String` |  |
| `studentId` | `String` |  |
| `reason` | `String` |  |
| `status` | `TicketStatus` |  |
| `crDecisionById` | `String?` |  |
| `crDecisionReason` | `String?` |  |
| `crDecisionAt` | `DateTime?` |  |
| `mentorDecisionById` | `String?` |  |
| `mentorDecisionReason` | `String?` |  |
| `mentorDecisionAt` | `DateTime?` |  |
| `createdAt` | `DateTime` | must be before session end — enforced in app layer |
| `updatedAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `session` | `Session` |  |
| `attendance` | `Attendance` |  |
| `student` | `User` |  |
| `crDecisionBy` | `Membership?` |  |
| `mentorDecisionBy` | `Membership?` |  |

**Constraints/Indexes**
```
@@index([sessionId])
@@index([studentId])
@@index([status])
```

### `StudentImportJob`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `organizationId` | `String` |  |
| `batchId` | `String` |  |
| `initiatedByMembershipId` | `String` |  |
| `originalFileName` | `String` |  |
| `status` | `ImportJobStatus` |  |
| `totalRows` | `Int` |  |
| `successCount` | `Int` |  |
| `failureCount` | `Int` |  |
| `createdAt` | `DateTime` |  |
| `completedAt` | `DateTime?` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `organization` | `Organization` |  |
| `batch` | `Batch` |  |
| `initiatedByMembership` | `Membership` |  |
| `rows` | `StudentImportRow[]` |  |

**Constraints/Indexes**
```
@@index([organizationId])
@@index([batchId])
@@index([status])
```

### `StudentImportRow`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `jobId` | `String` |  |
| `rowNumber` | `Int` |  |
| `rawData` | `Json` |  |
| `status` | `ImportRowStatus` |  |
| `errorMessage` | `String?` |  |
| `createdUserId` | `String?` | set if this row successfully created a User |
| `createdAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `job` | `StudentImportJob` |  |

**Constraints/Indexes**
```
@@index([jobId])
@@index([status])
```

### `SessionActivityEvent`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `sessionId` | `String` |  |
| `type` | `String` | STARTED | ATTENDANCE_OPENED | STUDENT_SUBMITTED | MANUAL_EDIT | ATTENDANCE_CLOSED | ENDED | CANCELLED |
| `actorMembershipId` | `String?` |  |
| `metadata` | `Json?` |  |
| `createdAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `session` | `Session` |  |
| `actorMembership` | `Membership?` |  |

**Constraints/Indexes**
```
@@index([sessionId, createdAt])
@@index([actorMembershipId])
```

### `AuditLog`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `organizationId` | `String?` |  |
| `actorUserId` | `String?` |  |
| `action` | `String` | e.g. "attendance.manual_mark", "ticket.cr_reject", "membership.role_change" |
| `targetType` | `String` | e.g. "Attendance", "Ticket", "Membership" |
| `targetId` | `String` |  |
| `beforeValue` | `Json?` |  |
| `afterValue` | `Json?` |  |
| `reason` | `String?` |  |
| `createdAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `organization` | `Organization?` |  |
| `actorUser` | `User?` |  |

**Constraints/Indexes**
```
@@index([organizationId])
@@index([targetType, targetId])
@@index([createdAt])
```

### `Notification`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `userId` | `String` |  |
| `organizationId` | `String?` |  |
| `type` | `String` | e.g. "SESSION_REMINDER", "ATTENDANCE_OPENED", "TICKET_DECISION" |
| `channel` | `NotificationChannel` |  |
| `payload` | `Json` |  |
| `isRead` | `Boolean` |  |
| `createdAt` | `DateTime` |  |
| `deletedAt` | `DateTime?` | user-clearable — unlike audit records, notifications aren't historical evidence |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `user` | `User` |  |
| `organization` | `Organization?` |  |

**Constraints/Indexes**
```
@@index([userId, isRead])
@@index([organizationId])
@@index([deletedAt])
```

### `WebhookConfig`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `organizationId` | `String` |  |
| `batchId` | `String?` | null = applies to the whole org |
| `url` | `String` |  |
| `events` | `String[]` | e.g. ["SESSION_REMINDER", "ATTENDANCE_SUMMARY"] |
| `isActive` | `Boolean` |  |
| `createdAt` | `DateTime` |  |
| `updatedAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `organization` | `Organization` |  |
| `batch` | `Batch?` |  |

**Constraints/Indexes**
```
@@index([organizationId])
@@index([batchId])
```

### `PlatformAdmin`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `email` | `String` |  |
| `name` | `String` |  |
| `passwordHash` | `String` |  |
| `role` | `PlatformAdminRole` |  |
| `createdAt` | `DateTime` |  |
| `updatedAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `platformAuditLogs` | `PlatformAuditLog[]` |  |
| `impersonationSessions` | `ImpersonationSession[]` |  |
| `subscriptionOverrides` | `Subscription[]` |  |

### `PlatformAuditLog`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `platformAdminId` | `String` |  |
| `action` | `String` | e.g. "org.suspend", "plan.override", "impersonate.start" |
| `targetOrgId` | `String?` |  |
| `metadata` | `Json?` |  |
| `reason` | `String?` |  |
| `createdAt` | `DateTime` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `platformAdmin` | `PlatformAdmin` |  |

**Constraints/Indexes**
```
@@index([platformAdminId])
@@index([targetOrgId])
```

### `ImpersonationSession`

**Fields**

| Field | Type | Notes |
|---|---|---|
| `id` | `String` |  |
| `platformAdminId` | `String` |  |
| `targetUserId` | `String` |  |
| `targetOrganizationId` | `String?` |  |
| `reason` | `String` |  |
| `startedAt` | `DateTime` |  |
| `endedAt` | `DateTime?` |  |

**Relations**

| Field | Type | Notes |
|---|---|---|
| `platformAdmin` | `PlatformAdmin` |  |
| `targetUser` | `User` |  |

**Constraints/Indexes**
```
@@index([platformAdminId])
@@index([targetUserId])
```
