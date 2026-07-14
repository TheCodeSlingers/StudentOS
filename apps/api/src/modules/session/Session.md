# Session Module — Complete Reference

This document collects everything needed to implement the Session module: schema, API routes, permissions, service design, related models, and code patterns.

---

## 1. Session Model (Prisma Schema)

```prisma
model Session {
  id                   String        @id @default(cuid())
  batchId              String
  title                String
  description          String?
  scheduledStart       DateTime
  scheduledEnd         DateTime
  meetLink             String?
  type                 SessionType   @default(REGULAR)
  status               SessionStatus @default(SCHEDULED)
  attendanceOpenedAt   DateTime?
  attendanceOpenedById String?
  attendanceClosedAt   DateTime?
  attendanceClosedById String?
  currentCode          String?
  codeRotatedAt        DateTime?
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  batch       Batch        @relation(fields: [batchId], references: [id], onDelete: Cascade)
  attendances Attendance[]

  @@index([batchId])
  @@index([scheduledStart])
  @@index([status])
}
```

### Session Fields

| Field                  | Type          | Nullable | Default    | Description                                    |
| ---------------------- | ------------- | -------- | ---------- | ---------------------------------------------- |
| `id`                   | String (cuid) | No       | auto       | Primary key                                    |
| `batchId`              | String        | No       | —          | Foreign key to Batch                           |
| `title`                | String        | No       | —          | Session title (e.g. "Module 3: Advanced APIs") |
| `description`          | String        | Yes      | null       | Optional session description                   |
| `scheduledStart`       | DateTime      | No       | —          | Planned start time                             |
| `scheduledEnd`         | DateTime      | No       | —          | Planned end time                               |
| `meetLink`             | String        | Yes      | null       | Video meeting link (e.g. Google Meet)          |
| `type`                 | SessionType   | No       | REGULAR    | Session type enum                              |
| `status`               | SessionStatus | No       | SCHEDULED  | Session status enum                            |
| `attendanceOpenedAt`   | DateTime      | Yes      | null       | When attendance window was opened              |
| `attendanceOpenedById` | String        | Yes      | null       | Membership ID of who opened attendance         |
| `attendanceClosedAt`   | DateTime      | Yes      | null       | When attendance window was closed              |
| `attendanceClosedById` | String        | Yes      | null       | Membership ID of who closed attendance         |
| `currentCode`          | String        | Yes      | null       | 6-digit rotating check-in code                 |
| `codeRotatedAt`        | DateTime      | Yes      | null       | When the current code was generated            |
| `createdAt`            | DateTime      | No       | now()      | Record creation timestamp                      |
| `updatedAt`            | DateTime      | No       | @updatedAt | Last update timestamp                          |

### Related Enums

```prisma
enum SessionType {
  REGULAR
  MAKEUP
  EXAM
}

enum SessionStatus {
  SCHEDULED
  STARTED
  ENDED
  CANCELLED
}
```

### Cascade Behavior

- **Session → Batch**: `onDelete: Cascade` — deleting a batch deletes all its sessions.
- **Attendance → Session**: `onDelete: Cascade` — deleting a session deletes all its attendance records.

---

## 2. Related Models

### Batch

```prisma
model Batch {
  id                             String   @id @default(cuid())
  workspaceId                    String
  name                           String
  startDate                      DateTime
  endDate                        DateTime?
  capacity                       Int?
  defaultMeetLink                String?
  isArchived                     Boolean  @default(false)
  lateThresholdMinsOverride      Int?
  attendanceDurationMinsOverride Int?
  createdAt                      DateTime @default(now())
  updatedAt                      DateTime @updatedAt

  workspace        Workspace         @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  batchMemberships BatchMembership[]
  sessions         Session[]
  importJobs       StudentImportJob[]
}
```

**Key fields for Session module:**

- `workspaceId` — needed to verify the batch belongs to the authenticated user's workspace
- `defaultMeetLink` — fallback if session doesn't have its own meetLink
- `isArchived` — archived batches should not allow new sessions
- `lateThresholdMinsOverride` — batch-level override for late threshold
- `attendanceDurationMinsOverride` — batch-level override for attendance duration

### BatchMembership

```prisma
model BatchMembership {
  id           String    @id @default(cuid())
  membershipId String
  batchId      String
  isCR         Boolean   @default(false)
  assignedAt   DateTime  @default(now())
  revokedAt    DateTime?

  membership  Membership   @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  batch       Batch        @relation(fields: [batchId], references: [id], onDelete: Cascade)
  attendances Attendance[]
}
```

**Key fields for Session module:**

- `isCR` — Class Representative flag; CRs can open/close attendance windows and manually mark attendance
- `revokedAt` — if not null, the enrollment is revoked (do not show revoked students)

### Membership

```prisma
model Membership {
  id          String           @id @default(cuid())
  userId      String
  workspaceId String
  role        MembershipRole   // MENTOR | STUDENT
  status      MembershipStatus @default(ACTIVE)
  // ...
}
```

**Key for Session module:** `role` field determines permissions (MENTOR vs STUDENT vs CR via BatchMembership.isCR).

### WorkspaceSettings

```prisma
model WorkspaceSettings {
  id                            String    @id @default(cuid())
  workspaceId                   String    @unique
  defaultAttendanceDurationMins Int       @default(15)
  lateThresholdMins             Int       @default(10)
  // ...
}
```

**Key for Session module:**

- `defaultAttendanceDurationMins` — default window length (15 min) unless batch override exists
- `lateThresholdMins` — how many minutes after window open a student is marked LATE instead of PRESENT

---

## 3. API Routes (7 Routes)

### Route Table

| #   | Method | Path                                    | Permission       | Description                            |
| --- | ------ | --------------------------------------- | ---------------- | -------------------------------------- |
| 1   | POST   | `/batches/:batchId/sessions`            | MENTOR           | Create a session                       |
| 2   | GET    | `/batches/:batchId/sessions`            | MENTOR / STUDENT | List sessions in a batch               |
| 3   | GET    | `/sessions/:sessionId`                  | MENTOR / STUDENT | Session details                        |
| 4   | PATCH  | `/sessions/:sessionId`                  | MENTOR           | Update session details                 |
| 5   | POST   | `/sessions/:sessionId/cancel`           | MENTOR           | Cancel a scheduled session             |
| 6   | POST   | `/sessions/:sessionId/attendance/open`  | MENTOR / CR      | Open attendance window (rotating code) |
| 7   | POST   | `/sessions/:sessionId/attendance/close` | MENTOR / CR      | Close attendance window                |

### Route 1: Create Session

```
POST /api/v1/batches/:batchId/sessions
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "title": "Module 3: Advanced APIs",
  "scheduledStart": "2026-07-14T20:00:00Z",
  "scheduledEnd": "2026-07-14T21:00:00Z",
  "meetLink": "https://meet.google.com/abc-defg-hij"
}
```

**Response 201:**

```json
{
  "data": {
    "id": "ses_cuid3333",
    "batchId": "bat_cuid1111",
    "title": "Module 3: Advanced APIs",
    "status": "SCHEDULED",
    "scheduledStart": "2026-07-14T20:00:00Z",
    "scheduledEnd": "2026-07-14T21:00:00Z"
  }
}
```

**Business Rules:**

- Only MENTOR can create sessions
- Batch must exist and belong to the authenticated user's workspace
- Batch must not be archived
- `scheduledEnd` must be after `scheduledStart`

### Route 2: List Sessions

```
GET /api/v1/batches/:batchId/sessions
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "data": [
    {
      "id": "ses_cuid3333",
      "batchId": "bat_cuid1111",
      "title": "Module 3: Advanced APIs",
      "status": "SCHEDULED",
      "scheduledStart": "2026-07-14T20:00:00Z",
      "scheduledEnd": "2026-07-14T21:00:00Z"
    }
  ]
}
```

**Business Rules:**

- MENTOR and STUDENT can view sessions
- Students can only see sessions for batches they are enrolled in
- Filter by batchId

### Route 3: Get Session Details

```
GET /api/v1/sessions/:sessionId
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "data": {
    "id": "ses_cuid3333",
    "batchId": "bat_cuid1111",
    "title": "Module 3: Advanced APIs",
    "status": "STARTED",
    "scheduledStart": "2026-07-14T20:00:00Z",
    "scheduledEnd": "2026-07-14T21:00:00Z",
    "meetLink": "https://meet.google.com/abc-defg-hij",
    "type": "REGULAR",
    "attendanceOpenedAt": "2026-07-14T20:01:00Z"
  }
}
```

**Business Rules:**

- MENTOR and STUDENT can view
- Students must be enrolled in the session's batch

### Route 4: Update Session

```
PATCH /api/v1/sessions/:sessionId
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "title": "Module 3: Advanced APIs (Updated)",
  "scheduledStart": "2026-07-14T20:30:00Z",
  "scheduledEnd": "2026-07-14T21:30:00Z",
  "meetLink": "https://meet.google.com/new-link"
}
```

**Response 200:**

```json
{
  "data": {
    "id": "ses_cuid3333",
    "title": "Module 3: Advanced APIs (Updated)",
    "scheduledStart": "2026-07-14T20:30:00Z",
    "scheduledEnd": "2026-07-14T21:30:00Z"
  }
}
```

**Business Rules:**

- Only MENTOR can update
- Cannot update a CANCELLED or ENDED session
- All fields optional (partial update)

### Route 5: Cancel Session

```
POST /api/v1/sessions/:sessionId/cancel
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "data": {
    "id": "ses_cuid3333",
    "status": "CANCELLED"
  }
}
```

**Business Rules:**

- Only MENTOR can cancel
- Cannot cancel an already ENDED or CANCELLED session
- Sets status to CANCELLED

### Route 6: Open Attendance Window

```
POST /api/v1/sessions/:sessionId/attendance/open
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "data": {
    "sessionId": "ses_cuid3333",
    "status": "STARTED",
    "attendanceOpenedAt": "2026-07-14T20:01:00Z",
    "currentCode": "581903"
  }
}
```

**Business Rules:**

- MENTOR or CR (BatchMembership.isCR = true) can open
- Session must be in SCHEDULED status
- Sets status to STARTED
- Sets `attendanceOpenedAt` to current time
- Sets `attendanceOpenedById` to the authenticated membership ID
- Generates a 6-digit random code and stores in `currentCode`
- Sets `codeRotatedAt` to current time

**Code Generation Logic:**

```typescript
// Generate 6-digit random numeric code
const code = Math.floor(100000 + Math.random() * 900000).toString();
```

### Route 7: Close Attendance Window

```
POST /api/v1/sessions/:sessionId/attendance/close
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "data": {
    "sessionId": "ses_cuid3333",
    "status": "ENDED",
    "attendanceClosedAt": "2026-07-14T21:00:00Z",
    "currentCode": null
  }
}
```

**Business Rules:**

- MENTOR or CR can close
- Session must be in STARTED status (attendance window must be open)
- Sets status to ENDED
- Sets `attendanceClosedAt` to current time
- Sets `attendanceClosedById` to the authenticated membership ID
- Clears `currentCode` (sets to null) so students can no longer submit

---

## 4. Permission Matrix (Sessions)

| Action                     | Mentor | CR  | Student | Scope     |
| -------------------------- | ------ | --- | ------- | --------- |
| `session.create`           | ✅     | ❌  | ❌      | Own Batch |
| `session.view`             | ✅     | ✅  | ✅      | Own Batch |
| `session.update`           | ✅     | ❌  | ❌      | Own Batch |
| `session.cancel`           | ✅     | ❌  | ❌      | Own Batch |
| `session.attendance.open`  | ✅     | ✅  | ❌      | Own Batch |
| `session.attendance.close` | ✅     | ✅  | ❌      | Own Batch |

**Scope "Own Batch"** means:

- MENTOR: must be a member of the workspace that owns the batch
- STUDENT: must have an active BatchMembership in the batch
- CR: must have `isCR = true` on their BatchMembership for the batch

---

## 5. Service Layer Design

From `SERVICE_LAYER_DESIGN.md`:

```
AuthModule ──► WorkspaceModule ──► BatchModule ──► SessionModule ──► AttendanceModule
```

### SessionModule

- **Responsibility**: Controls session scheduling and manages the rotating check-in code.
- **Owns**: `Session`.
- **Depends on**: `BatchModule` (batch status checks).
- **Key Methods**:
  - `createSession(batchId, dto)`: Adds a class session.
  - `openAttendanceWindow(sessionId, userId)`: Sets session status to `STARTED`, updates `attendanceOpenedAt`, generates a 6-digit random code, and writes `currentCode` to the database.
  - `closeAttendanceWindow(sessionId, userId)`: Sets status to `ENDED` and clears `currentCode`.

---

## 6. Code Patterns to Follow

Based on the existing `student-import` module, here are the patterns the Session module should follow:

### File Structure

```
src/modules/session/
├── session.routes.ts      # Route definitions with middleware chain
├── session.controller.ts  # Request handlers (thin, delegates to service)
├── session.service.ts     # Business logic and database operations
├── session.schema.ts      # Zod validation schemas
└── Session.md             # This reference document
```

### Route Pattern (`import.routes.ts`)

```typescript
import { Router } from "express";
import { SessionController } from "./session.controller";
import { authMiddleware } from "../../middleware/auth";
import { requireRole } from "../../middleware/permission";
import { validateRequest } from "../../common/validation";
import { createSessionSchema } from "./session.schema";

const router = Router();

router.post(
  "/batches/:batchId/sessions",
  authMiddleware,
  requireRole(["MENTOR"]),
  validateRequest(createSessionSchema),
  SessionController.createSession,
);

export default router;
```

### Controller Pattern (`import.controller.ts`)

```typescript
import { Request, Response } from "express";
import { SessionService } from "./session.service";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";

export class SessionController {
  static createSession = asyncHandler(
    async (req: any, res: Response): Promise<void> => {
      const { batchId } = req.params;
      const session = await SessionService.createSession(batchId, req.body);
      ApiResponse.created(res, session);
    },
  );
}
```

### Service Pattern (`import.service.ts`)

```typescript
import { prisma } from "../../lib/prisma";
import { NotFoundError, BadRequestError } from "../../common/errors";

export class SessionService {
  static async createSession(batchId: string, dto: CreateSessionDto) {
    // 1. Validate batch exists and belongs to workspace
    // 2. Create session record
    // 3. Return created session
  }
}
```

### Schema Pattern (`import.schema.ts`)

```typescript
import { z } from "zod";

export const createSessionSchema = z.object({
  params: z.object({
    batchId: z.string().min(1, "Batch ID is required"),
  }),
  body: z.object({
    title: z.string().min(1, "Title is required"),
    scheduledStart: z.string().datetime("Invalid start time"),
    scheduledEnd: z.string().datetime("Invalid end time"),
    meetLink: z.string().url().optional(),
  }),
});

export type CreateSessionRequest = z.infer<typeof createSessionSchema>;
```

### Available Utilities

| Utility           | Import Path                   | Usage                                  |
| ----------------- | ----------------------------- | -------------------------------------- |
| `prisma`          | `../../lib/prisma`            | Database client singleton              |
| `ApiResponse`     | `../../common/api-response`   | `success()`, `created()`, `accepted()` |
| `asyncHandler`    | `../../common/async-handler`  | Wraps async route handlers             |
| `BadRequestError` | `../../common/errors`         | 400 errors                             |
| `NotFoundError`   | `../../common/errors`         | 404 errors                             |
| `ForbiddenError`  | `../../common/errors`         | 403 errors                             |
| `validateRequest` | `../../common/validation`     | Zod schema validation middleware       |
| `authMiddleware`  | `../../middleware/auth`       | Sets `req.user` and `req.membership`   |
| `requireRole`     | `../../middleware/permission` | Role-based access guard                |

### Auth Middleware Output

After `authMiddleware` runs, `req` contains:

```typescript
req.user = {
  id: string, // User.id
  email: string,
  name: string,
};

req.membership = {
  id: string, // Membership.id
  workspaceId: string, // Workspace.id
  role: "MENTOR" | "STUDENT",
};
```

---

## 7. Error Codes

Use these error codes to match the API contract:

| Code                             | HTTP Status | When to Use                                           |
| -------------------------------- | ----------- | ----------------------------------------------------- |
| `SESSION_NOT_FOUND`              | 404         | Session ID doesn't exist                              |
| `BATCH_NOT_FOUND`                | 404         | Batch ID doesn't exist                                |
| `FORBIDDEN`                      | 403         | User lacks permission for this action                 |
| `SESSION_NOT_CANCELLABLE`        | 400         | Trying to cancel a session that is ENDED or CANCELLED |
| `ATTENDANCE_WINDOW_ALREADY_OPEN` | 400         | Trying to open attendance when it's already open      |
| `ATTENDANCE_WINDOW_CLOSED`       | 400         | Trying to close attendance when it's already closed   |
| `SESSION_NOT_STARTED`            | 400         | Session must be STARTED to close attendance           |
| `SESSION_MUST_BE_SCHEDULED`      | 400         | Session must be SCHEDULED to open attendance          |
| `VALIDATION_FAILED`              | 400         | Request body/params validation failed                 |
| `BATCH_ARCHIVED`                 | 400         | Cannot create session in archived batch               |

---

## 8. CR (Class Representative) Check

To verify if the current user is a CR for a batch:

```typescript
const batchMembership = await prisma.batchMembership.findFirst({
  where: {
    batchId,
    membershipId: req.membership.id,
    isCR: true,
    revokedAt: null, // Must not be revoked
  },
});

if (!batchMembership) {
  throw new ForbiddenError("Only MENTOR or CR can perform this action.");
}
```

---

## 9. Workspace Ownership Verification

To verify a batch belongs to the authenticated user's workspace:

```typescript
const batch = await prisma.batch.findUnique({
  where: { id: batchId },
});

if (!batch) {
  throw new NotFoundError("Batch not found.", "BATCH_NOT_FOUND");
}

if (batch.workspaceId !== req.membership.workspaceId) {
  throw new ForbiddenError("This batch does not belong to your workspace.");
}
```

---

## 10. Student Enrollment Check

To verify a student is enrolled in a batch:

```typescript
const batchMembership = await prisma.batchMembership.findFirst({
  where: {
    batchId,
    membership: { userId: req.user.id },
    revokedAt: null,
  },
});

if (!batchMembership) {
  throw new ForbiddenError("You are not enrolled in this batch.");
}
```

---

## 11. Registration in Main App

After implementation, the session router must be registered in `apps/api/src/index.ts`:

```typescript
import sessionRouter from "./modules/session/session.routes";

// Add alongside existing importRouter
app.use("/api/v1", importRouter);
app.use("/api/v1", sessionRouter);
```

---

## 12. Contribution Rules

- **Branch naming**: `feat/session-create-route`, `feat/session-attendance-open`, etc.
- **Commit messages**: `feat(session): create session endpoint`, `feat(session): open attendance window`, etc.
- **Scopes for commits**: `session`, `attendance`
- **PR requirements**: code compiles (`npm run build`), tests pass (`npm run test`), lint passes (`npm run lint`)
- **Merge strategy**: squash merge to `main`, requires 1 approving review
