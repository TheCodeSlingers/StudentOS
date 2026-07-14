# StudentOS — Schema Guide (v1 Simple Complete)

This document explains the design principles, relations, and detailed field references for the simplified StudentOS database schema.

---

## 1. Core Principles

### Identity & Workspace Scoping
Every resource (User, Membership, Batch, Session, Attendance) resides under a `Workspace` model scope.
- **`User`**: Repesents a single human account. Holds name, email, credentials, and `authProvider` (email vs. Google OAuth).
- **`Workspace`**: Represents the tenant workspace. Contains global settings (`WorkspaceSettings`) like late thresholds and timezone.
- **`Membership`**: Represents user enrollment in the workspace with a role (`MENTOR` or `STUDENT`). 

### Extension Pattern: `StudentProfile`
To prevent bloating the main `Membership` and `User` models, student-specific demographics and career tracking parameters are moved into a separate 1:1 `StudentProfile` model.
- Contains contact details (`phone`, `address`).
- Contains educational info (`institution`, `department`, `graduationYear`).
- Contains career analytics fields (`skills`, `hireStatus`, `jobType`, `workplacePreference`, `linkedinUrl`).
- Extends the `Membership` model with `onDelete: Cascade`.

### Batch Enrolments & CR Flags
- **`Batch`**: Represents a class cohort with custom duration or late threshold overrides.
- **`BatchMembership`**: Connects a `Membership` to a `Batch`. The CR flag (`isCR: Boolean`) lives here since a student is only a CR within a specific batch, not across the entire workspace.

---

## 2. Cascade & Restrict Rules

| Relation | Type | Description |
|---|---|---|
| `Membership` → `User` / `Workspace` | `Cascade` | Deleting a workspace or user deletes their membership. |
| `StudentProfile` → `Membership` | `Cascade` | Deleting a membership cleans up the student profile. |
| `BatchMembership` → `Membership` / `Batch` | `Cascade` | Deleting a batch or workspace member removes batch enrollment indices. |
| **`Attendance` → `BatchMembership`** | **`Restrict`** | Postgres prevents deleting any batch enrollment if attendance records exist for it. Student enrollment should be marked using the `revokedAt` column instead of deletion. |
| `Attendance` → `Session` | `Cascade` | Deleting a session cascades to clean up its attendance sheets. |

---

## 3. Model Field References

### `User`
- `id` (String, Primary Key)
- `email` (String, Unique Index)
- `name` (String)
- `passwordHash` (String, Nullable)
- `authProvider` (String, Nullable - e.g. "email", "google")
- `createdAt` / `updatedAt` (DateTime)

### `Workspace`
- `id` (String, Primary key)
- `name` (String)
- `timezone` (String, default "UTC")

### `Membership`
- `id` (String, Primary Key)
- `userId` (String)
- `workspaceId` (String)
- `role` (MembershipRole enum: `MENTOR`, `STUDENT`)
- `status` (MembershipStatus enum: `ACTIVE`, `INVITED`)

### `StudentProfile`
- `id` (String, Primary Key)
- `membershipId` (String, Unique Index)
- `phone` / `address` / `avatarUrl` (String, Nullable)
- `institution` / `department` / `studentId` (String, Nullable)
- `graduationYear` (Int, Nullable)
- `skills` (String Array)
- `hireStatus` (HireStatus enum, default `STUDENT_ONLY`)
- `jobType` (JobType enum, default `NOT_LOOKING`)
- `workplacePreference` (WorkplacePreference enum, default `NO_PREFERENCE`)
- `linkedinUrl` / `portfolioUrl` (String, Nullable)

### `Batch`
- `id` (String, Primary Key)
- `workspaceId` (String)
- `name` (String)
- `startDate` / `endDate` (DateTime)
- `isArchived` (Boolean, default false)
- `lateThresholdMinsOverride` / `attendanceDurationMinsOverride` (Int, Nullable)

### `Session`
- `id` (String, Primary Key)
- `batchId` (String)
- `title` / `description` (String)
- `scheduledStart` / `scheduledEnd` (DateTime)
- `status` (SessionStatus enum: `SCHEDULED`, `STARTED`, `ENDED`, `CANCELLED`)
- `currentCode` (String, Nullable, 6-digit checking code)
- `attendanceOpenedAt` / `attendanceClosedAt` (DateTime, Nullable)

### `Attendance`
- `id` (String, Primary Key)
- `sessionId` (String)
- `studentBatchMembershipId` (String)
- `status` (AttendanceStatus enum: `PRESENT`, `LATE`, `ABSENT`, `EXCUSED`)
- `method` (AttendanceMethod enum: `SELF_SUBMITTED`, `MANUAL`)
- `submittedAt` (DateTime, Nullable)
- `markedById` (String, Nullable, marked by Mentor/CR)
- `manualReason` (String, Nullable)
