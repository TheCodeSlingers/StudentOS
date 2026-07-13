# StudentOS — Permission Matrix

**Companion to:** `schema.prisma`, `SCHEMA_GUIDE.md` §14 (Permission Resolution Pattern)
**Purpose:** The single source of truth for "who can do what." Every backend guard, every frontend conditional render, and every API 403 response should trace back to a row in this document — if a permission check doesn't match a row here, either the code is wrong or this doc is out of date.

---

## How to Read This Document

- **Action strings** (e.g. `attendance.manual_mark`) are the exact literals your `can(user, action, resource, scope)` function should check against — use them verbatim in code, not paraphrased versions.
- **Scope** tells you what to filter by: `Org` = any resource in the user's org, `Own Batch` = only batches the user has an active `BatchMembership` for, `Self` = only the acting user's own record.
- **Platform Admin** is a separate identity system (not a `Membership` role) and is listed in its own table at the end — never merge it into the tenant-side matrix, since that would blur "runs the SaaS" with "runs one org."
- ✅ = allowed · ❌ = not allowed · 🔶 = conditional (see note)

---

## 1. Organization & Settings

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `organization.view` | ✅ Org | ✅ Org (read-only) | ✅ Org (read-only) | ✅ Org (read-only) |
| `organization.update` | ✅ Org | ❌ | ❌ | ❌ |
| `organization.settings.update` | ✅ Org | ❌ | ❌ | ❌ |
| `organization.delete` | 🔶 Org — soft delete only, should require confirmation flow | ❌ | ❌ | ❌ |

---

## 2. Employees / Membership

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `membership.invite` | ✅ Org | ❌ | ❌ | ❌ |
| `membership.view` | ✅ Org | ✅ Own Batch (batch's Mentor/CR list only) | ❌ | ❌ |
| `membership.role.change` | ✅ Org | ❌ | ❌ | ❌ |
| `membership.suspend` | ✅ Org | ❌ | ❌ | ❌ |
| `membership.assign_mentor` | ✅ Org | ❌ | ❌ | ❌ |

> **v1 note:** Since Owner/Admin/Manager are collapsed into `ADMIN`, there is no delegated "assign within my scope only" tier yet — every membership action is Admin-only until that split is reintroduced.

---

## 3. Batch

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `batch.create` | ✅ Org (plan-limit checked) | ❌ | ❌ | ❌ |
| `batch.view` | ✅ Org | ✅ Own Batch | ✅ Own Batch | ✅ Own Batch |
| `batch.update` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `batch.archive` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `batch.assign_cr` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `batch.revoke_cr` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `batch.settings.override` (late threshold, duration) | ✅ Org | ✅ Own Batch | ❌ | ❌ |

---

## 4. Students

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `student.add` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `student.bulk_import` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `student.view` | ✅ Org | ✅ Own Batch | ✅ Own Batch | 🔶 Self only |
| `student.remove` (revoke, not delete) | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `student.import_job.view_report` | ✅ Org | ✅ Own Batch | ❌ | ❌ |

---

## 5. Sessions

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `session.template.create` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `session.create` (one-time) | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `session.view` | ✅ Org | ✅ Own Batch | ✅ Own Batch | ✅ Own Batch |
| `session.update` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `session.cancel` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `session.attendance.open` | ✅ Org | ✅ Own Batch | ✅ Own Batch | ❌ |
| `session.attendance.close` | ✅ Org | ✅ Own Batch | ✅ Own Batch | ❌ |

---

## 6. Attendance

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `attendance.submit_self` | ❌ (not a student) | ❌ | ✅ Self (as a student, if window open) | ✅ Self, window open only |
| `attendance.manual_mark` | ✅ Own Batch | ✅ Own Batch | ✅ Own Batch, window open only | ❌ |
| `attendance.view` | ✅ Org | ✅ Own Batch | ✅ Own Batch | 🔶 Self only |
| `attendance.view_all_students` | ✅ Org | ✅ Own Batch | ✅ Own Batch | ❌ |
| `attendance.fraud.view_flagged` | ✅ Org | ✅ Own Batch | ✅ Own Batch | ❌ |
| `attendance.fraud.review` (resolve queue) | ✅ Org | ✅ Own Batch | 🔶 Own Batch — consider Mentor-only if CR self-review is a conflict-of-interest risk | ❌ |
| `attendance.presence.heartbeat_ping` | ❌ | ❌ | ❌ | ✅ Self, window open only |

> **Design flag for your team:** should a CR be allowed to resolve fraud flags on their *own* batch, including flags on their own manual marks? Recommend restricting `attendance.fraud.review` to Mentor+ only — a CR reviewing their own manual-mark pattern is a conflict of interest the PRD's audit philosophy is specifically trying to avoid.

---

## 7. Tickets (Informed/Leave)

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `ticket.create` | ❌ | ❌ | ✅ Self (as a student), before session ends only | ✅ Self, before session ends only |
| `ticket.view` | ✅ Org | ✅ Own Batch | ✅ Own Batch | 🔶 Self only |
| `ticket.cr_decide` (accept/reject) | ✅ Own Batch (override) | ✅ Own Batch (override) | ✅ Own Batch | ❌ |
| `ticket.appeal` | ❌ | ❌ | ❌ | ✅ Self, only on own `CR_REJECTED` ticket |
| `ticket.mentor_decide` (final) | ✅ Own Batch (override) | ✅ Own Batch | ❌ | ❌ |

---

## 8. Reports & Analytics

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `report.organization.view` | ✅ Org | ❌ | ❌ | ❌ |
| `report.batch.view` | ✅ Org | ✅ Own Batch | ✅ Own Batch | ❌ |
| `report.student.view` | ✅ Org | ✅ Own Batch | ✅ Own Batch | 🔶 Self only |
| `report.dynamic_builder.use` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `report.export` (CSV/Excel) | ✅ Org | ✅ Own Batch | ✅ Own Batch | 🔶 Self only |

---

## 9. Notifications & Webhooks

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `notification.view` | ✅ Self | ✅ Self | ✅ Self | ✅ Self |
| `notification.clear` | ✅ Self | ✅ Self | ✅ Self | ✅ Self |
| `webhook.create` | ✅ Org | ✅ Own Batch (batch-scoped webhooks only) | ❌ | ❌ |
| `webhook.view` | ✅ Org | ✅ Own Batch | ❌ | ❌ |
| `webhook.delete` | ✅ Org | ✅ Own Batch (own only) | ❌ | ❌ |

---

## 10. Billing & Subscription

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `subscription.view` | ✅ Org | ❌ | ❌ | ❌ |
| `subscription.plan.change` | ✅ Org | ❌ | ❌ | ❌ |
| `subscription.billing_history.view` | ✅ Org | ❌ | ❌ | ❌ |

---

## 11. Audit Log

| Action | Admin | Mentor | CR | Student |
|---|---|---|---|---|
| `audit.view` | ✅ Org | ✅ Own Batch (scoped to their batch's events) | ❌ | ❌ |

---

## 12. Platform Admin (separate identity — not a Membership role)

These actions apply cross-org and are checked against `PlatformAdmin.role`, never against tenant `Membership`.

| Action | Support | Platform Owner |
|---|---|---|
| `platform.organization.view_all` | ✅ | ✅ |
| `platform.organization.suspend` | ❌ | ✅ |
| `platform.organization.delete` | ❌ | ✅ |
| `platform.plan.override_limits` | 🔶 With Platform Owner sign-off | ✅ |
| `platform.plan.create_edit` | ❌ | ✅ |
| `platform.impersonate` | ✅ (must log reason, time-boxed) | ✅ |
| `platform.feature_flag.toggle` | ❌ | ✅ |
| `platform.audit_log.view` | ✅ | ✅ |
| `platform.broadcast.send` | ❌ | ✅ |

---

## Implementation Checklist

- [ ] Define `ADMIN_PERMISSIONS`, `MENTOR_PERMISSIONS`, `CR_PERMISSIONS`, `STUDENT_PERMISSIONS` as literal arrays of the action strings above — one array per role, matching this doc exactly
- [ ] `ADMIN` array should include every Mentor-level action too (implicit access, per `SCHEMA_GUIDE.md` §2) — either by explicit duplication in the array or a fallback check of `role === 'ADMIN' → true` before role-specific arrays are checked
- [ ] Every batch-scoped action must verify an active (`revokedAt: null`) `BatchMembership` — not just that a `Membership` with the right role exists somewhere in the org
- [ ] Resolve the CR self-review flag (§6) with your team before building the fraud review queue UI
- [ ] Any new API endpoint added later must have its action string added to this table in the same PR — this document and the codebase should never drift apart
