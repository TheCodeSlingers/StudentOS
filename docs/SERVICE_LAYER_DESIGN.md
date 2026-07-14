# StudentOS — Service-Layer Design (v1 Simple Complete)

This document describes the design, responsibilities, dependencies, and interfaces for each logical module of StudentOS v1.

---

## Module Map

```
AuthModule ──────► WorkspaceModule ──────► BatchModule ──────► SessionModule ──────► AttendanceModule
                                                 ▲
                                                 │
                                       StudentImportModule
```

---

## 1. AuthModule

- **Responsibility**: Authenticating users, signing access/refresh JWT tokens, handling Google OAuth flows, and managing password resets.
- **Owns**: `User`, JWT configurations, OAuth callback triggers.
- **Depends on**: Nothing (foundation layer).
- **Key Methods**:
  - `signup(dto)`: Creates `User`, `Workspace`, `WorkspaceSettings`, and `Membership(MENTOR)` inside a database transaction.
  - `login(dto)`: Verifies password hash and issues JWT.
  - `refresh(token)`: Signs a new access token if the refresh token is valid.
  - `googleLogin()` / `googleCallback(code)`: Authenticates profile via OAuth, mapping profiles to `User` records with `authProvider: "google"`.

---

## 2. WorkspaceModule

- **Responsibility**: Manages workspace configuration and default parameters (late threshold, timezone, default attendance duration).
- **Owns**: `Workspace`, `WorkspaceSettings`.
- **Depends on**: `AuthModule` (identity checks).
- **Key Methods**:
  - `getWorkspace(workspaceId)`: Fetches workspace settings and details.
  - `updateSettings(workspaceId, dto)`: Updates workspace properties.

---

## 3. BatchModule

- **Responsibility**: Manage batch cohorts and allocate members to batches. Tracks CR status flags.
- **Owns**: `Batch`, `BatchMembership`, `StudentProfile`.
- **Depends on**: `WorkspaceModule` (workspace reference checks).
- **Key Methods**:
  - `createBatch(workspaceId, dto)`: Creates a batch with optional timing overrides.
  - `allocateMember(batchId, membershipId, isCR)`: Creates a `BatchMembership` record.
  - `toggleCR(batchMembershipId, isCR)`: Updates isCR state.
  - `getStudentProfile(membershipId)`: Retrieves contact, academic, and career preferences from `StudentProfile`.
  - `updateStudentProfile(membershipId, dto)`: Updates student profile columns.

---

## 4. SessionModule

- **Responsibility**: Controls sessions scheduling and manages the rotating check-in code.
- **Owns**: `Session`.
- **Depends on**: `BatchModule` (batch status checks).
- **Key Methods**:
  - `createSession(batchId, dto)`: Adds a class session.
  - `openAttendanceWindow(sessionId, userId)`: Sets session status to `STARTED`, updates `attendanceOpenedAt`, generates a 6-digit random code, and writes `currentCode` to the database.
  - `closeAttendanceWindow(sessionId, userId)`: Sets status to `ENDED` and clears `currentCode`.

---

## 5. AttendanceModule

- **Responsibility**: Hand-checking codes for self-attendance and handling manual adjustments.
- **Owns**: `Attendance`.
- **Depends on**: `SessionModule` (window status), `BatchModule` (enrollment verification).
- **Key Methods**:
  - `submitSelfAttendance(sessionId, membershipId, code)`:
    - Validates code matches `Session.currentCode` and window is open.
    - If elapsed time is less than `lateThresholdMins`, marks status `PRESENT`.
    - If elapsed time is greater, marks status `LATE`.
  - `markManualAttendance(sessionId, studentBatchMembershipId, status, markedById, reason)`:
    - Sets manual status (`PRESENT`/`LATE`/`ABSENT`/`EXCUSED`).
    - Associates `markedById` and saves the mandatory `manualReason`.

---

## 6. StudentImportModule

- **Responsibility**: Handles CSV file uploads and performs bulk student creations.
- **Depends on**: `AuthModule`, `BatchModule` (workspace membership and batch allocations).
- **Key Methods**:
  - `importCsv(batchId, fileBuffer)`:
    - Parses CSV records.
    - Checks User existence; creates User and `STUDENT` Workspace Membership.
    - Allocates BatchMembership and creates empty `StudentProfile`.
    - Returns report detailing successful imports and line failures.
