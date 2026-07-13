# StudentOS — API Contract (v1)

**Status:** Hand-authored contract for parallel frontend/backend build. Once controllers exist, add `@nestjs/swagger` decorators matching these exact routes — from that point on, `/api/docs` (auto-generated) becomes the source of truth and this file should be treated as the original plan, not re-edited by hand to track every future change.

**Base URL:** `/api/v1`
**Auth:** `Authorization: Bearer <jwt>` header, except where marked `Public`. Platform Admin routes use a **separate** token (different secret/audience — see `SERVICE_LAYER_DESIGN.md` §12) and live under `/platform-admin`, not `/api/v1`.

---

## Conventions

### Success envelope
```json
{ "data": { }, "meta": { } }
```
`meta` is omitted unless pagination or extra context applies.

### Error envelope
```json
{ "error": { "code": "ATTENDANCE_WINDOW_CLOSED", "message": "Attendance is not currently open for this session.", "details": {} } }
```

### Standard status codes
| Code | Meaning |
|---|---|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 204 | Success, no body (DELETE) |
| 400 | Malformed request |
| 401 | Not authenticated |
| 403 | Authenticated, but `PERMISSION_MATRIX.md` denies this action |
| 404 | Resource not found (or not in caller's scope — never leak existence across orgs) |
| 409 | Conflict (e.g. duplicate attendance submission, batch limit reached) |
| 422 | Validation error (body shape wrong) |

### Pagination (list endpoints)
Query params: `?page=1&limit=25`
```json
{ "data": [ ], "meta": { "page": 1, "limit": 25, "total": 143 } }
```

### Every route's permission requirement
Listed as the exact action string from `PERMISSION_MATRIX.md` — implement the guard by checking that string, not by re-deriving logic per-route.

---

## Route Count Summary

| Module | Routes |
|---|---|
| Auth | 9 |
| Organization | 4 |
| Members/Employees | 5 |
| Subscription/Plans | 3 |
| Batch | 9 |
| Students | 6 |
| Sessions | 11 |
| Attendance | 7 |
| Fraud Review | 2 |
| Tickets | 5 |
| Reports | 5 |
| Notifications & Webhooks | 6 |
| Audit Log | 1 |
| Platform Admin | 13 |
| **Total** | **86** |

---

## 1. Auth (9 routes)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Creates `User` + auto-creates `Organization` + `Membership(ADMIN)` |
| POST | `/auth/login` | Public | Email/password login |
| POST | `/auth/logout` | Bearer | Invalidates refresh token |
| POST | `/auth/refresh` | Refresh token | Issues new access token |
| POST | `/auth/forgot-password` | Public | Sends reset email |
| POST | `/auth/reset-password` | Public (reset token) | Sets new password |
| GET | `/auth/me` | Bearer | Current user + active org context |
| POST | `/auth/switch-org` | Bearer | Re-issues token scoped to a different `organizationId` (for users with multiple memberships) |
| GET | `/auth/google` / `/auth/google/callback` | Public | OAuth flow |

**`POST /auth/signup`**
```json
// Request
{ "email": "string", "password": "string", "name": "string", "organizationName": "string" }

// Response 201
{
  "data": {
    "user": { "id": "string", "email": "string", "name": "string" },
    "organization": { "id": "string", "name": "string" },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

**`GET /auth/me`**
```json
{
  "data": {
    "user": { "id": "string", "email": "string", "name": "string" },
    "activeOrganizationId": "string",
    "memberships": [
      { "organizationId": "string", "organizationName": "string", "role": "ADMIN | MENTOR | STUDENT" }
    ],
    "effectivePermissions": ["batch.create", "attendance.manual_mark", "..."]
  }
}
```

---

## 2. Organization (4 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/org` | `organization.view` | Org profile |
| PATCH | `/org` | `organization.update` | Update name/logo/timezone |
| GET | `/org/settings` | `organization.view` | `OrganizationSettings` |
| PATCH | `/org/settings` | `organization.settings.update` | Update late threshold, attendance duration |

```json
// GET /org — Response 200
{ "data": { "id": "string", "name": "string", "logoUrl": "string|null", "timezone": "string" } }
```

---

## 3. Members / Employees (5 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/org/members/invite` | `membership.invite` | Sends invite (email + token) |
| GET | `/org/members` | `membership.view` | List (paginated) |
| POST | `/org/members/accept-invite` | Public (token) | Accepts invite, creates/attaches `Membership` |
| PATCH | `/org/members/:membershipId` | `membership.role.change` | Change role |
| DELETE | `/org/members/:membershipId` | `membership.suspend` | Sets `status: SUSPENDED` (never hard-delete) |

```json
// GET /org/members — Response 200
{
  "data": [
    { "membershipId": "string", "userId": "string", "name": "string", "email": "string", "role": "ADMIN | MENTOR | STUDENT", "status": "ACTIVE | INVITED | SUSPENDED" }
  ],
  "meta": { "page": 1, "limit": 25, "total": 4 }
}
```

---

## 4. Subscription & Plans (3 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/plans` | Public | List available plans (pricing page) |
| GET | `/org/subscription` | `subscription.view` | Current plan, limits, usage |
| PATCH | `/org/subscription/plan` | `subscription.plan.change` | Change plan (checkout flow out of scope for this contract) |

```json
// GET /org/subscription — Response 200
{
  "data": {
    "plan": { "name": "Free", "maxBatches": 1, "maxStudents": 30, "maxEmployees": 2 },
    "status": "TRIAL",
    "usage": { "batches": 1, "students": 12, "employees": 1 },
    "currentPeriodEnd": "2026-08-01T00:00:00Z"
  }
}
```

---

## 5. Batch (9 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/batches` | `batch.create` | Create batch (checked against plan limit) |
| GET | `/batches` | `batch.view` | List batches in scope |
| GET | `/batches/:batchId` | `batch.view` | Batch detail |
| PATCH | `/batches/:batchId` | `batch.update` | Update name/dates/capacity |
| POST | `/batches/:batchId/archive` | `batch.archive` | Soft-archive |
| POST | `/batches/:batchId/mentors` | `batch.assign_cr` (Admin-only in v1) | Assign mentor `BatchMembership` |
| POST | `/batches/:batchId/cr` | `batch.assign_cr` | Grant CR flag to a student |
| DELETE | `/batches/:batchId/cr/:membershipId` | `batch.revoke_cr` | Revoke CR flag |
| PATCH | `/batches/:batchId/overrides` | `batch.settings.override` | Set late-threshold/duration overrides |

```json
// POST /batches — Request
{ "name": "string", "startDate": "2026-08-01", "endDate": "2026-12-01", "capacity": 30, "defaultMeetLink": "string" }

// Response 201
{ "data": { "id": "string", "name": "string", "organizationId": "string", "startDate": "string", "isArchived": false } }

// Response 409 (limit reached)
{ "error": { "code": "PLAN_LIMIT_REACHED", "message": "Your plan allows a maximum of 1 batch.", "details": { "limit": 1, "current": 1 } } }
```

---

## 6. Students (6 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/batches/:batchId/students` | `student.add` | Add one student |
| GET | `/batches/:batchId/students` | `student.view` | List (paginated) |
| DELETE | `/batches/:batchId/students/:batchMembershipId` | `student.remove` | Revoke enrollment (`revokedAt`, never delete) |
| POST | `/batches/:batchId/students/import` | `student.bulk_import` | CSV upload, returns job ID immediately |
| GET | `/batches/:batchId/students/import/:jobId` | `student.import_job.view_report` | Job status/summary |
| GET | `/batches/:batchId/students/import/:jobId/rows` | `student.import_job.view_report` | Per-row results (paginated) |

```json
// POST /batches/:batchId/students/import — Response 202 (async)
{ "data": { "jobId": "string", "status": "PENDING", "totalRows": 0 } }

// GET .../import/:jobId — Response 200 (once processing)
{
  "data": {
    "jobId": "string", "status": "COMPLETED_WITH_ERRORS",
    "totalRows": 50, "successCount": 47, "failureCount": 3
  }
}

// GET .../import/:jobId/rows — Response 200
{
  "data": [
    { "rowNumber": 12, "status": "FAILED", "errorMessage": "Duplicate email in batch", "rawData": { } }
  ]
}
```

---

## 7. Sessions (11 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/batches/:batchId/session-templates` | `session.template.create` | Create recurring template |
| GET | `/batches/:batchId/session-templates` | `session.view` | List templates |
| PATCH | `/session-templates/:templateId` | `session.update` | Update recurrence rule |
| POST | `/batches/:batchId/sessions` | `session.create` | Create one-time session |
| GET | `/batches/:batchId/sessions` | `session.view` | List sessions (paginated, filterable by date range) |
| GET | `/sessions/:sessionId` | `session.view` | Session detail |
| PATCH | `/sessions/:sessionId` | `session.update` | Update title/time/link |
| POST | `/sessions/:sessionId/cancel` | `session.cancel` | Sets `status: CANCELLED` |
| POST | `/sessions/:sessionId/attendance/open` | `session.attendance.open` | Opens window, generates first rotating code |
| POST | `/sessions/:sessionId/attendance/close` | `session.attendance.close` | Closes window |
| GET | `/sessions/:sessionId/activity` | `audit.view` | `SessionActivityEvent` timeline |

```json
// GET /sessions/:sessionId — Response 200
{
  "data": {
    "id": "string", "batchId": "string", "title": "string",
    "scheduledStart": "2026-07-14T21:00:00Z", "scheduledEnd": "2026-07-14T22:00:00Z",
    "status": "ATTENDANCE_OPEN",
    "attendanceOpenedAt": "2026-07-14T21:00:00Z",
    "currentCode": "384021" // only returned to CR/Mentor/Admin, never to Students
  }
}

// POST /sessions/:sessionId/attendance/open — Response 200
{ "data": { "sessionId": "string", "status": "ATTENDANCE_OPEN", "attendanceOpenedAt": "string", "currentCode": "string" } }
```

---

## 8. Attendance (7 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/sessions/:sessionId/attendance/submit` | `attendance.submit_self` | Student self-submits with code |
| POST | `/sessions/:sessionId/attendance/manual` | `attendance.manual_mark` | CR/Mentor marks on student's behalf |
| GET | `/sessions/:sessionId/attendance` | `attendance.view_all_students` | Full roster for this session |
| GET | `/attendance/:attendanceId` | `attendance.view` | Single record |
| POST | `/attendance/:attendanceId/heartbeat` | Self only (implicit — no separate permission check beyond ownership) | Presence ping |
| GET | `/students/:batchMembershipId/attendance` | `attendance.view` (scoped) | A student's attendance history |
| — | *(see §9 for fraud review actions on Attendance)* | | |

```json
// POST /sessions/:sessionId/attendance/submit — Request
{ "code": "384021" }

// Response 201
{ "data": { "id": "string", "status": "PRESENT", "method": "SELF_SUBMITTED", "submittedAt": "string" } }

// Response 409 (already submitted)
{ "error": { "code": "ATTENDANCE_ALREADY_SUBMITTED", "message": "You have already submitted attendance for this session." } }

// Response 400 (window closed / bad code)
{ "error": { "code": "ATTENDANCE_WINDOW_CLOSED", "message": "Attendance is not open for this session." } }

// POST /sessions/:sessionId/attendance/manual — Request
{ "studentBatchMembershipId": "string", "status": "PRESENT | LATE | ABSENT", "reason": "string (required)" }
```

---

## 9. Fraud Review (2 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/attendance/flagged` | `attendance.fraud.view_flagged` | Review queue (filterable by batch, org) |
| POST | `/attendance/:attendanceId/review` | `attendance.fraud.review` | Resolve a flag |

```json
// GET /attendance/flagged — Response 200
{
  "data": [
    { "attendanceId": "string", "studentName": "string", "sessionTitle": "string", "riskScore": 0.82, "flaggedReasons": ["duplicate_device"] }
  ]
}

// POST /attendance/:attendanceId/review — Request
{ "outcome": "CONFIRMED_FRAUD | CLEARED", "notes": "string" }
```

---

## 10. Tickets (5 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/attendance/:attendanceId/ticket` | `ticket.create` | Student raises informed/leave request |
| GET | `/tickets` | `ticket.view` | List (filterable by status, batch) |
| GET | `/tickets/:ticketId` | `ticket.view` | Detail |
| POST | `/tickets/:ticketId/cr-decision` | `ticket.cr_decide` | Accept/reject |
| POST | `/tickets/:ticketId/appeal` | `ticket.appeal` | Student escalates a rejection |
| POST | `/tickets/:ticketId/mentor-decision` | `ticket.mentor_decide` | Final decision |

```json
// POST /attendance/:attendanceId/ticket — Request
{ "reason": "string" }

// Response 201
{ "data": { "id": "string", "status": "PENDING", "reason": "string" } }

// POST /tickets/:ticketId/cr-decision — Request
{ "decision": "ACCEPT | REJECT", "reason": "string (required if REJECT)" }

// Response 200
{ "data": { "id": "string", "status": "CR_ACCEPTED", "attendanceStatus": "INFORMED" } }
```

---

## 11. Reports (5 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/reports/organization` | `report.organization.view` | Org-wide summary |
| GET | `/reports/batches/:batchId` | `report.batch.view` | Batch summary |
| GET | `/reports/students/:batchMembershipId` | `report.student.view` | Student summary |
| POST | `/reports/dynamic` | `report.dynamic_builder.use` | Custom filter/group/sort query |
| GET | `/reports/export` | `report.export` | Query params define scope + format; returns file |

```json
// GET /reports/batches/:batchId — Response 200
{
  "data": {
    "totalSessions": 24, "totalStudents": 28,
    "overallAttendancePercent": 87.5, "lateRate": 8.2, "dropRate": 3.1
  }
}

// POST /reports/dynamic — Request
{
  "filters": [{ "field": "attendancePercent", "op": "lt", "value": 60 }, { "field": "lateCount", "op": "gt", "value": 3 }],
  "groupBy": "batch", "sortBy": "attendancePercent", "sortDir": "asc"
}
```

---

## 12. Notifications & Webhooks (6 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/notifications` | Self only | List current user's notifications |
| PATCH | `/notifications/:id/read` | Self only | Mark read |
| DELETE | `/notifications/:id` | Self only | Clear (soft delete) |
| POST | `/org/webhooks` | `webhook.create` | Add Discord/webhook config |
| GET | `/org/webhooks` | `webhook.view` | List |
| DELETE | `/org/webhooks/:id` | `webhook.delete` | Remove |

---

## 13. Audit Log (1 route)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/org/audit-logs` | `audit.view` | Filterable by target type, date range, actor |

```json
{
  "data": [
    { "action": "attendance.manual_mark", "actorUserId": "string", "targetType": "Attendance", "targetId": "string", "reason": "string", "createdAt": "string" }
  ],
  "meta": { "page": 1, "limit": 25, "total": 210 }
}
```

---

## 14. Platform Admin (13 routes)

Separate base path, separate auth token — see `SERVICE_LAYER_DESIGN.md` §12.

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/platform-admin/auth/login` | Public (platform credentials) | Platform admin login |
| GET | `/platform-admin/organizations` | `platform.organization.view_all` | List all tenants |
| GET | `/platform-admin/organizations/:orgId` | `platform.organization.view_all` | Detail + usage |
| POST | `/platform-admin/organizations/:orgId/suspend` | `platform.organization.suspend` | Suspend tenant |
| DELETE | `/platform-admin/organizations/:orgId` | `platform.organization.delete` | Soft-delete tenant |
| PATCH | `/platform-admin/organizations/:orgId/subscription/override` | `platform.plan.override_limits` | Set override limits |
| GET | `/platform-admin/plans` | — | List plans |
| POST | `/platform-admin/plans` | `platform.plan.create_edit` | Create plan tier |
| PATCH | `/platform-admin/plans/:planId` | `platform.plan.create_edit` | Edit plan tier |
| POST | `/platform-admin/impersonate` | `platform.impersonate` | Start impersonation (`reason` required) |
| POST | `/platform-admin/impersonate/:sessionId/end` | `platform.impersonate` | End impersonation |
| GET | `/platform-admin/audit-logs` | `platform.audit_log.view` | Platform-wide audit trail |
| POST | `/platform-admin/broadcast` | `platform.broadcast.send` | Announcement to all org admins |

```json
// POST /platform-admin/impersonate — Request
{ "targetUserId": "string", "targetOrganizationId": "string", "reason": "string (required)" }

// Response 201
{ "data": { "impersonationSessionId": "string", "accessToken": "string", "startedAt": "string" } }
```

---

## Next Step Once Code Starts

1. Install `@nestjs/swagger`, decorate each controller/DTO to match the routes above exactly.
2. `/api/docs` becomes live and auto-updating — treat it as authoritative from that point forward.
3. Delete or clearly mark this file as historical once Swagger is live, so nobody edits two contract documents in parallel.
