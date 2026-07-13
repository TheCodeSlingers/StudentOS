# StudentOS — Service-Layer Design

**Companion to:** `schema.prisma`, `PERMISSION_MATRIX.md`
**Purpose:** One-page module breakdown so the team can split work without duplicating effort or building circular dependencies. Each module below maps to a folder/module in the backend codebase (e.g. NestJS module, or equivalent in your framework).

---

## Module Map

```
AuthModule ──────► used by every other module (guards, decorators)
   │
   ├──► OrgModule ──────────► BatchModule ──────► SessionModule ──────► AttendanceModule
   │         │                     │                                         │
   │         └──► SubscriptionModule                                        ├──► TicketModule
   │                                                                          └──► FraudModule
   ├──► StudentImportModule (depends on OrgModule, BatchModule)
   ├──► ReportsModule (depends on AttendanceModule, TicketModule, FraudModule — read-only)
   ├──► NotificationModule (depends on nothing upstream — consumed by everyone)
   └──► PlatformAdminModule ─────► (separate, cross-cutting — depends on OrgModule, SubscriptionModule read access only)
```

**Dependency rule:** arrows point one direction only. `AttendanceModule` can call into `SessionModule` and `TicketModule`, but `SessionModule` must never import from `AttendanceModule`. If you find yourself needing a reverse dependency, that's a sign the shared logic belongs in a lower-level module (often `AuthModule` or a new shared `PermissionsModule`).

---

## 1. AuthModule

**Responsibility:** User signup/login, JWT issuance, session context resolution (`activeOrganizationId`, `effectivePermissions`), password reset, social auth.

**Owns:** `User`, session/token generation.

**Depends on:** Nothing (foundation layer).

**Used by:** Every other module, via a shared `@RequirePermission(action, scope)` guard/decorator that calls the `can()` function from `PERMISSION_MATRIX.md` §14.

**Key responsibility boundary:** AuthModule resolves *who the user is* and *what org context they're in*. It does **not** decide whether they can perform a specific action — that's the permission-check layer, which should be a separate, reusable function/service (`PermissionsService`) that AuthModule exposes but every module calls independently.

---

## 2. OrgModule

**Responsibility:** Organization CRUD, `OrganizationSettings`, employee invite/membership management, role assignment.

**Owns:** `Organization`, `OrganizationSettings`, `Membership`.

**Depends on:** AuthModule (for actor identity on invites/audit).

**Used by:** BatchModule (org-scoping), SubscriptionModule, PlatformAdminModule (read-only cross-org queries).

**Key responsibility:** This is the *only* module allowed to write to `Membership`. If `BatchModule` needs to check someone's role, it queries through `OrgModule`'s exposed service methods — it never writes to `Membership` directly.

---

## 3. SubscriptionModule

**Responsibility:** Plan assignment, limit enforcement (`maxBatches`/`maxStudents`/`maxEmployees` via Redis atomic counters), subscription state machine transitions.

**Owns:** `Plan`, `Subscription`.

**Depends on:** OrgModule (subscription is 1:1 with Organization).

**Used by:** BatchModule (checks batch-creation limit before allowing), OrgModule (checks employee-invite limit), PlatformAdminModule (plan overrides).

**Key responsibility:** Every limit check in the entire system routes through this module's `checkLimit(orgId, resource)` method — never scattered `count()` queries in other modules. This is what keeps the Redis atomic-counter logic in one place instead of duplicated (and possibly inconsistently implemented) across Batch/Org/Student creation flows.

---

## 4. BatchModule

**Responsibility:** Batch CRUD, `BatchMembership` (Mentor/CR assignment, revocation), batch-level settings overrides.

**Owns:** `Batch`, `BatchMembership`.

**Depends on:** OrgModule (org-scoping, role lookups), SubscriptionModule (limit checks on create).

**Used by:** SessionModule, AttendanceModule, StudentImportModule, ReportsModule.

**Key responsibility:** This is the *only* module allowed to write to `BatchMembership` — including the `isCR` flag. Ticket/Attendance modules read CR status through this module, never by querying `BatchMembership` directly in their own repositories.

---

## 5. SessionModule

**Responsibility:** `SessionTemplate` management, recurring session generation (scheduled job), session lifecycle transitions (`Scheduled → Started → Ended/Cancelled`), attendance-window open/close.

**Owns:** `SessionTemplate`, `Session`, `SessionActivityEvent`.

**Depends on:** BatchModule (batch-scoping, CR/Mentor permission checks for window control).

**Used by:** AttendanceModule (window state), TicketModule (ticket-before-session-end validation), ReportsModule.

**Key responsibility:** Owns the rotating attendance code generation/rotation logic. Also the only module that writes `SessionActivityEvent` rows for lifecycle events (`STARTED`, `ATTENDANCE_OPENED`, `ATTENDANCE_CLOSED`, `ENDED`) — other modules (Attendance, Ticket) write their *own* activity events for their own actions (`STUDENT_SUBMITTED`, `MANUAL_EDIT`), but session-lifecycle events belong here.

---

## 6. AttendanceModule

**Responsibility:** Student self-submission, CR manual marking, presence heartbeat ingestion, gap-pattern flagging trigger.

**Owns:** `Attendance`, `PresenceHeartbeat`.

**Depends on:** SessionModule (window state, code validation), BatchModule (CR permission check for manual marks).

**Used by:** TicketModule (links a ticket to an attendance record), FraudModule (reads Attendance for scoring), ReportsModule.

**Key responsibility:** Enforces the one-submission-per-student-per-session rule at the application layer *in addition to* the database unique constraint — the app-layer check should return a clean "already submitted" error before ever hitting the DB constraint violation.

---

## 7. TicketModule

**Responsibility:** Ticket creation, CR decision, appeal, Mentor decision — the full informed/leave state machine.

**Owns:** `Ticket`.

**Depends on:** AttendanceModule (ticket always ties to one Attendance record), SessionModule (before-session-end validation).

**Used by:** ReportsModule.

**Key responsibility:** Owns all `TicketStatus` transitions. When a ticket resolves to `CR_ACCEPTED`/`MENTOR_ACCEPTED`, this module is responsible for updating the linked `Attendance.status` to `INFORMED` — that write should happen inside the same transaction as the ticket status update, not as a separate follow-up call, to avoid a resolved ticket with a stale attendance status if something fails mid-way.

---

## 8. FraudModule

**Responsibility:** Async risk-scoring job (runs after attendance submission), gap-pattern classification, manual review queue (accept/clear a flag).

**Owns:** Writes to `Attendance.riskScore` / `isFlagged` / `reviewedBy*` fields (doesn't own the `Attendance` table itself — AttendanceModule does — but is the only module permitted to write to these specific fraud-related fields).

**Depends on:** AttendanceModule (reads submission data, passive signals), BatchModule (CR/Mentor permission check for review actions).

**Used by:** ReportsModule (fraud-rate KPIs), PlatformAdminModule (cross-org abuse pattern detection).

**Key responsibility:** Runs as a queue consumer (BullMQ), never inline in the request/response cycle for attendance submission — this is what keeps the "simple one-tap submission" promise from the PRD intact.

---

## 9. StudentImportModule

**Responsibility:** CSV upload handling, async row validation, per-row result reporting.

**Owns:** `StudentImportJob`, `StudentImportRow`.

**Depends on:** OrgModule (creates `User`/`Membership` rows for valid students), BatchModule (assigns `BatchMembership`), SubscriptionModule (checks `maxStudents` limit per row processed, not just once for the whole batch).

**Used by:** Nothing downstream — this is a leaf module.

**Key responsibility:** Runs as a queue consumer, same reasoning as FraudModule — large CSVs must never block an HTTP request.

---

## 10. NotificationModule

**Responsibility:** Notification creation, delivery dispatch (email/in-app/webhook), `WebhookConfig` management.

**Owns:** `Notification`, `WebhookConfig`.

**Depends on:** Nothing upstream by design — every other module calls into `NotificationModule.notify(...)` rather than `NotificationModule` reaching into other modules' data.

**Used by:** Every module that needs to trigger a reminder/alert (Session for reminders, Attendance for flags, Ticket for decisions).

**Key responsibility:** This is the one module every other module is allowed to depend on downward — it should never depend on any tenant-side business module itself, to avoid circular imports.

---

## 11. ReportsModule

**Responsibility:** Standard reports, filter-driven analytics engine, dynamic report builder, CSV/Excel export.

**Owns:** No tables of its own — entirely read-side, composing queries across Attendance/Session/Batch/Ticket/Fraud data.

**Depends on:** AttendanceModule, SessionModule, TicketModule, FraudModule, BatchModule (all read-only).

**Used by:** Nothing downstream — leaf module, consumed directly by the frontend dashboards.

**Key responsibility:** Should be read-replica-friendly from day one — no report query should ever write data, which means it's safe to eventually point this module at a read replica without touching any other module.

---

## 12. PlatformAdminModule

**Responsibility:** Everything in PRD §18 — org lifecycle management, plan overrides, impersonation, platform-wide observability, platform audit log.

**Owns:** `PlatformAdmin`, `PlatformAuditLog`, `ImpersonationSession`.

**Depends on:** OrgModule and SubscriptionModule (read + limited write access for overrides/suspension), but is otherwise isolated.

**Used by:** Nothing — this is a separate application surface, not consumed by tenant-facing modules.

**Key responsibility:** Must never be reachable through the same auth guard as tenant modules — `PlatformAdmin` identity and `Membership` identity should use physically separate auth strategies (e.g. separate JWT audience/issuer), so a bug in one guard can't accidentally grant platform access through a tenant login.

---

## Suggested Team Split (for a 2-week, small-team sprint)

| Person | Owns |
|---|---|
| Backend Lead / Dev A | AuthModule, OrgModule, SubscriptionModule, BatchModule |
| Backend Dev B | SessionModule, AttendanceModule, TicketModule |
| Backend Dev C (or Dev A, if solo-heavy) | FraudModule, StudentImportModule, NotificationModule |
| Frontend Lead | Consumes API contract as it's generated — build Admin/Mentor/CR/Student dashboards in that order (Admin unblocks the most, Student is simplest) |
| Whoever's free | ReportsModule + PlatformAdminModule last — both are read-heavy/isolated and least likely to block anyone else |

**Build order matters more than team size:** Auth → Org → Batch → Session → Attendance are a strict dependency chain — nothing after Attendance can be meaningfully tested without it. Ticket and Fraud can be built in parallel once Attendance exists, since neither depends on the other. Reports and PlatformAdmin should genuinely be last — building them early means building against a moving target.
