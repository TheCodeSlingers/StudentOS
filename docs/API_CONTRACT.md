# StudentOS — API Contract (v1 Simple Complete)

**Base URL:** `/api/v1`

---

## Conventions

### Success Envelope
```json
{
  "data": { },
  "meta": { }
}
```
`meta` is omitted unless pagination or extra context applies.

### Error Envelope
```json
{
  "error": {
    "code": "ATTENDANCE_WINDOW_CLOSED",
    "message": "Attendance is not currently open for this session.",
    "details": {}
  }
}
```

### Standard Status Codes
| Code | Meaning |
|---|---|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 204 | Success, no body (DELETE) |
| 400 | Malformed request |
| 401 | Not authenticated |
| 403 | Forbidden (membership or role check failed) |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate resource) |
| 422 | Validation error |

---

## 1. Auth (9 routes)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Creates User + Workspace + Membership(MENTOR) |
| POST | `/auth/login` | Public | Email/password login |
| POST | `/auth/logout` | Bearer | Invalidates authentication session |
| POST | `/auth/refresh` | Refresh token | Issues new access token |
| POST | `/auth/forgot-password` | Public | Sends password reset email |
| POST | `/auth/reset-password` | Public (token) | Sets new password |
| GET | `/auth/me` | Bearer | Current user + active workspace and membership role |
| GET | `/auth/google` | Public | Initiates Google OAuth flow |
| GET | `/auth/google/callback` | Public | Callback for Google OAuth authentication |

**`POST /auth/signup`**
```json
// Request
{
  "email": "mentor@studentos.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "workspaceName": "My Academy"
}

// Response 201
{
  "data": {
    "user": { "id": "usr_cuid1234", "email": "mentor@studentos.com", "name": "John Doe" },
    "workspace": { "id": "wsp_cuid5678", "name": "My Academy" },
    "accessToken": "jwt_access_token_here",
    "refreshToken": "jwt_refresh_token_here"
  }
}
```

**`POST /auth/login`**
```json
// Request
{
  "email": "mentor@studentos.com",
  "password": "SecurePassword123!"
}

// Response 200
{
  "data": {
    "accessToken": "jwt_access_token_here",
    "refreshToken": "jwt_refresh_token_here",
    "user": { "id": "usr_cuid1234", "email": "mentor@studentos.com", "name": "John Doe" }
  }
}
```

**`POST /auth/refresh`**
```json
// Request
{
  "refreshToken": "jwt_refresh_token_here"
}

// Response 200
{
  "data": {
    "accessToken": "jwt_new_access_token_here",
    "refreshToken": "jwt_new_refresh_token_here"
  }
}
```

**`POST /auth/forgot-password`**
```json
// Request
{
  "email": "mentor@studentos.com"
}

// Response 200
{
  "data": {
    "message": "Password reset link sent to your email."
  }
}
```

**`POST /auth/reset-password`**
```json
// Request
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!"
}

// Response 200
{
  "data": {
    "message": "Password has been reset successfully."
  }
}
```

**`GET /auth/me`**
```json
// Response 200
{
  "data": {
    "user": { "id": "usr_cuid1234", "email": "mentor@studentos.com", "name": "John Doe" },
    "activeWorkspaceId": "wsp_cuid5678",
    "memberships": [
      { "workspaceId": "wsp_cuid5678", "workspaceName": "My Academy", "role": "MENTOR" }
    ]
  }
}
```

---

## 2. Workspace & Settings (2 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/workspace` | MENTOR / STUDENT | View workspace details |
| PATCH | `/workspace/settings` | MENTOR | Update workspace settings |

**`GET /workspace`**
```json
// Response 200
{
  "data": {
    "id": "wsp_cuid5678",
    "name": "My Academy",
    "timezone": "UTC",
    "settings": {
      "defaultAttendanceDurationMins": 15,
      "lateThresholdMins": 10
    }
  }
}
```

**`PATCH /workspace/settings`**
```json
// Request
{
  "name": "My Academy Renamed",
  "timezone": "GMT+6",
  "defaultAttendanceDurationMins": 20,
  "lateThresholdMins": 15
}

// Response 200
{
  "data": {
    "id": "wsp_cuid5678",
    "name": "My Academy Renamed",
    "timezone": "GMT+6",
    "settings": {
      "defaultAttendanceDurationMins": 20,
      "lateThresholdMins": 15
    }
  }
}
```

---

## 3. Members (3 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/workspace/members/invite` | MENTOR | Add or invite workspace member |
| GET | `/workspace/members` | MENTOR | List all members in the workspace |
| DELETE | `/workspace/members/:membershipId` | MENTOR | Revoke membership (sets status to inactive) |

**`POST /workspace/members/invite`**
```json
// Request
{
  "email": "student@studentos.com",
  "name": "Jane Smith",
  "role": "STUDENT"
}

// Response 201
{
  "data": {
    "membershipId": "mem_cuid9012",
    "role": "STUDENT",
    "status": "ACTIVE",
    "user": { "id": "usr_cuid5678", "email": "student@studentos.com", "name": "Jane Smith" }
  }
}
```

---

## 4. Batches (5 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/batches` | MENTOR | Create a batch |
| GET | `/batches` | MENTOR / STUDENT | List active batches |
| GET | `/batches/:batchId` | MENTOR / STUDENT | Batch detail |
| PATCH | `/batches/:batchId` | MENTOR | Update batch details/overrides |
| POST | `/batches/:batchId/archive` | MENTOR | Archive a batch |

**`POST /batches`**
```json
// Request
{
  "name": "Batch 14",
  "startDate": "2026-08-01T00:00:00Z",
  "endDate": "2026-12-01T00:00:00Z",
  "capacity": 35,
  "defaultMeetLink": "https://meet.google.com/abc-defg-hij"
}

// Response 201
{
  "data": {
    "id": "bat_cuid1111",
    "name": "Batch 14",
    "startDate": "2026-08-01T00:00:00Z",
    "endDate": "2026-12-01T00:00:00Z",
    "isArchived": false
  }
}
```

---

## 5. Students & Profiles (8 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/batches/:batchId/students` | MENTOR | Enroll single student into batch |
| GET | `/batches/:batchId/students` | MENTOR / STUDENT | List enrolled batch students |
| DELETE | `/batches/:batchId/students/:batchMembershipId` | MENTOR | Revoke batch enrollment (sets revokedAt) |
| POST | `/batches/:batchId/students/import` | MENTOR | Upload CSV for bulk importing |
| GET | `/batches/:batchId/students/import/:jobId` | MENTOR | Check bulk import job status |
| GET | `/batches/:batchId/students/import/:jobId/rows` | MENTOR | View row-level status details |
| GET | `/students/:membershipId/profile` | MENTOR / STUDENT | Get student academic & career profile |
| PATCH | `/students/:membershipId/profile` | STUDENT | Update student career & academic profile |

**`GET /students/:membershipId/profile`**
```json
// Response 200
{
  "data": {
    "membershipId": "mem_cuid9012",
    "phone": "+8801700000000",
    "address": "Dhaka, Bangladesh",
    "avatarUrl": "https://images.studentos.com/avatar.jpg",
    "institution": "Dhaka University",
    "department": "Computer Science",
    "studentId": "2020-CS-12",
    "graduationYear": 2024,
    "skills": ["JavaScript", "Node.js", "React"],
    "hireStatus": "JOB_SEEKING",
    "jobType": "FULL_TIME",
    "workplacePreference": "REMOTE",
    "currentEmployer": null,
    "currentPosition": null,
    "portfolioUrl": "https://portfolio.me",
    "linkedinUrl": "https://linkedin.com/in/jane"
  }
}
```

**`PATCH /students/:membershipId/profile`**
```json
// Request
{
  "phone": "+8801700000000",
  "skills": ["JavaScript", "Node.js", "React", "TypeScript"],
  "hireStatus": "EMPLOYED",
  "jobType": "FULL_TIME",
  "workplacePreference": "HYBRID",
  "currentEmployer": "Tech Solutions",
  "currentPosition": "Frontend Engineer"
}

// Response 200
{
  "data": {
    "membershipId": "mem_cuid9012",
    "hireStatus": "EMPLOYED",
    "currentEmployer": "Tech Solutions",
    "currentPosition": "Frontend Engineer"
  }
}
```

---

## 6. Sessions (7 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/batches/:batchId/sessions` | MENTOR | Create a session |
| GET | `/batches/:batchId/sessions` | MENTOR / STUDENT | List sessions in a batch |
| GET | `/sessions/:sessionId` | MENTOR / STUDENT | Session details |
| PATCH | `/sessions/:sessionId` | MENTOR | Update session details |
| POST | `/sessions/:sessionId/cancel` | MENTOR | Cancel a scheduled session |
| POST | `/sessions/:sessionId/attendance/open` | MENTOR / CR | Open attendance window (rotating code) |
| POST | `/sessions/:sessionId/attendance/close` | MENTOR / CR | Close attendance window |

**`POST /batches/:batchId/sessions`**
```json
// Request
{
  "title": "Module 3: Advanced APIs",
  "scheduledStart": "2026-07-14T20:00:00Z",
  "scheduledEnd": "2026-07-14T21:00:00Z",
  "meetLink": "https://meet.google.com/abc-defg-hij"
}

// Response 201
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

---

## 7. Attendance (4 routes)

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/sessions/:sessionId/attendance/submit` | STUDENT | Submit code for self-attendance |
| POST | `/sessions/:sessionId/attendance/manual` | MENTOR / CR | Manually mark student attendance |
| GET | `/sessions/:sessionId/attendance` | MENTOR / STUDENT | View session attendance roster |
| GET | `/students/:batchMembershipId/attendance` | MENTOR / STUDENT | View historical attendance for a student |

**`POST /sessions/:sessionId/attendance/submit`**
```json
// Request
{
  "code": "581903"
}

// Response 201
{
  "data": {
    "id": "att_cuid4444",
    "status": "PRESENT",
    "method": "SELF_SUBMITTED",
    "submittedAt": "2026-07-14T20:03:00Z"
  }
}
```

**`POST /sessions/:sessionId/attendance/manual`**
```json
// Request
{
  "studentBatchMembershipId": "bmem_cuid2222",
  "status": "EXCUSED",
  "manualReason": "Student has exams at their university."
}

// Response 201
{
  "data": {
    "id": "att_cuid4444",
    "status": "EXCUSED",
    "method": "MANUAL",
    "markedBy": {
      "id": "mem_cuid1234",
      "name": "John Doe"
    }
  }
}
```
