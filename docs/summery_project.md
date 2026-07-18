# StudentOS — Project Documentation Summary

This file contains a brief summary of all StudentOS project documentation files.

---

## 1. API_CONTRACT.md
**Subject:** API Contract (v1 Simple Complete)
**Base URL:** `/api/v1`

### Success & Error Envelope
- **Success:** `{ "data": {}, "meta": {} }`
- **Error:** `{ "error": { "code": "...", "message": "...", "details": {} } }`

### Standard Status Codes
`200` (Success), `201` (Created), `204` (No Body), `400` (Bad Request), `401` (Unauthorized), `403` (Forbidden), `404` (Not Found), `409` (Conflict), `422` (Validation Error)

### Key Routes (38 routes total)
| Module | Routes | Methods |
|---|---|---|
| **Auth** | 9 routes | Signup, Login, Logout, Refresh, Forgot/Reset Password, Me, Google OAuth |
| **Workspace & Settings** | 2 routes | View workspace, Update settings |
| **Members** | 3 routes | Invite, List, Remove membership |
| **Batches** | 5 routes | Create, List, View, Update, Archive |
| **Students & Profiles** | 8 routes | Enroll, List, Remove, Bulk Import (CSV), Import Status, View/Update Profile |
| **Sessions** | 7 routes | Create, List, View, Update, Cancel, Open/Close Attendance Window |
| **Attendance** | 4 routes | Self-Submit Code, Manual Mark, View Roster, View Student History |

---

## 2. ARCHITECTURE_AND_BOILERPLATE.md
**Subject:** Modular App Architecture and Directory Layout

### Directory Structure
- **`src/config/`** — Environment config (Zod validation)
- **`src/lib/`** — Prisma client singleton
- **`src/common/`** — Custom errors, API response formatter, async handler, validation middleware
- **`src/middleware/`** — Auth, permission, upload, error handling
- **`src/modules/`** — Feature-first modular structure (routes, controller, service, schema per module)
- **`src/utils/`** — Global utilities (CSV parser)
- **`src/index.ts`** — Express bootstrap

### Core Layers
1. **Env Config:** Zod-validated, fails fast on missing variables
2. **Custom Errors:** `ApiError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `InternalServerError`
3. **Async Handler:** Wraps route handlers to auto-catch promise rejections
4. **Global Error Middleware:** Formats all errors into standardized envelope
5. **Input Validation:** `validateRequest(schema)` middleware using Zod

---

## 3. CONTRIBUTION_GUIDELINES.md
**Subject:** Code Contribution Process

### Branch Naming Convention
- `<type>/<short-description>`
- Types: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`
- Example: `feat/auth-signup-login`

### Commit Messages
- Follows **Conventional Commits**: `<type>(<scope>): <short summary>`
- Scopes: `auth`, `org`, `batch`, `session`, `attendance`, `ticket`, `fraud`, `student-import`, `notification`, `reports`, `platform-admin`

### PR Requirements
- `npm run build` — Code must compile
- `npm run test` — Tests must pass
- `npm run lint` — Lint must pass
- At least **one approving review** required
- **Squash merge** strategy for `main`

---

## 4. ONBOARDING_GUIDE.md
**Subject:** Developer Setup Guide

### Prerequisites
- Node.js v20 LTS+, npm v10+, Git

### Database
- Neon (Postgres) cloud database
- Connection via `DATABASE_URL` environment variable

### Environment Variables
- **`apps/api/.env`** — `DATABASE_URL`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PLATFORM_JWT_SECRET`, `EMAIL_PROVIDER`, `EMAIL_FROM`
- **`apps/web/.env`** — `NEXT_PUBLIC_API_URL`

### Setup Commands
```bash
npm install                          # Install all dependencies
cd apps/api && npx prisma generate   # Generate Prisma client
npx prisma migrate dev --name init   # Apply schema
npx prisma db seed                   # Seed default data
npm run dev                          # Start API (8000) + Web (3000)
```

---

## 5. PERMISSION_MATRIX.md
**Subject:** Permission Action → Role Mapping

### Roles
| Role | Description |
|---|---|
| **MENTOR** | Full admin over workspace, batches, sessions, attendance |
| **STUDENT** | Enrolled student; view own history, self-submit attendance |
| **CR** | Class Representative; open/close attendance, manual mark for assigned batch |

### Permission Actions Summary
| Module | Key Actions |
|---|---|
| **Workspace** | `workspace.view` (ALL), `workspace.settings.update` (MENTOR only) |
| **Members** | `membership.invite/view/remove` (MENTOR only) |
| **Batches** | `batch.create/update/archive/assign_cr/revoke_cr` (MENTOR), `batch.view` (ALL in own batch) |
| **Students** | `student.add/remove/bulk_import` (MENTOR), `student.view` (MENTOR/CR/🔶Self), `student.profile.update` (STUDENT self) |
| **Sessions** | `session.create/update/cancel` (MENTOR), `session.view` (ALL), `session.attendance.open/close` (MENTOR/CR) |
| **Attendance** | `attendance.submit_self` (STUDENT/CR when window open), `attendance.manual_mark` (MENTOR/CR), `attendance.view` (MENTOR/CR/🔶Self) |

---

## 6. PRICING_PLAN_DEFINITION.md
**Subject:** SaaS Pricing Tiers and Plan Definition

### Proposed Tiers
| Field | Free | Starter ($19/mo) | Growth ($49/mo) |
|---|---|---|---|
| `maxBatches` | 1 | 3 | 10 |
| `maxStudents` | 30 | 150 | 500 |
| `maxEmployees` | 2 | 5 | 15 |
| Fraud Detection | Basic | Basic | Basic + Review Queue |
| Report Export | CSV | CSV + Excel | CSV + Excel + Dynamic Builder |
| Discord Webhooks | ❌ | ✅ | ✅ |
| Support | Community | Email | Priority Email |

### Feature Flags (`Plan.featureFlags`)
```json
{
  "dynamicReportBuilder": false,
  "discordWebhooks": false,
  "fraudReviewPrioritization": false,
  "csvExport": true,
  "excelExport": false
}
```

### Enterprise / Custom Limits
- Use `Subscription.overrideMaxBatches/Students/Employees` fields for negotiated deals
- `overrideReason` documents why limits were changed

---

## 7. SCHEMA_GUIDE.md
**Subject:** Database Schema Design Principles

### Core Principles
1. **Identity & Workspace Scoping** — Every resource lives under a `Workspace` scope
2. **StudentProfile Extension Pattern** — 1:1 relation with `Membership` for student-specific fields
3. **CR Flag on BatchMembership** — `isCR` lives at batch level, not workspace level

### Cascade & Restrict Rules
| Relation | Type |
|---|---|
| `Membership` → `User`/`Workspace` | Cascade |
| `StudentProfile` → `Membership` | Cascade |
| `BatchMembership` → `Membership`/`Batch` | Cascade |
| **`Attendance` → `BatchMembership`** | **Restrict** (use `revokedAt` instead of delete) |
| `Attendance` → `Session` | Cascade |

### Key Models
- **User:** id, email, name, passwordHash, authProvider
- **Workspace:** id, name, timezone + WorkspaceSettings
- **Membership:** userId, workspaceId, role (MENTOR/STUDENT), status (ACTIVE/INVITED)
- **StudentProfile:** membershipId (1:1), phone, skills, hireStatus, jobType, workplacePreference, linkedinUrl
- **Batch:** workspaceId, name, dates, capacity, isArchived, overrides
- **Session:** batchId, title, scheduledStart/End, status, currentCode (6-digit), attendance window timestamps
- **Attendance:** sessionId, studentBatchMembershipId, status (PRESENT/LATE/ABSENT/EXCUSED), method (SELF_SUBMITTED/MANUAL), manualReason
- **StudentImportJob/Row:** For CSV bulk import tracking

---

## 8. SERVICE_LAYER_DESIGN.md
**Subject:** Service Layer Module Design

### Module Dependency Graph
```
AuthModule → WorkspaceModule → BatchModule → SessionModule → AttendanceModule
                                          ↑
                                          │
                                StudentImportModule
```

### Module Responsibilities
| Module | Owns | Depends On | Key Methods |
|---|---|---|---|
| **AuthModule** | User, JWT, OAuth | Nothing | signup, login, refresh, googleLogin/callback |
| **WorkspaceModule** | Workspace, WorkspaceSettings | AuthModule | getWorkspace, updateSettings |
| **BatchModule** | Batch, BatchMembership, StudentProfile | WorkspaceModule | createBatch, allocateMember, toggleCR, get/updateStudentProfile |
| **SessionModule** | Session | BatchModule | createSession, openAttendanceWindow (generates 6-digit code), closeAttendanceWindow |
| **AttendanceModule** | Attendance | SessionModule, BatchModule | submitSelfAttendance (validates code + late threshold), markManualAttendance |
| **StudentImportModule** | StudentImportJob/Row | AuthModule, BatchModule | startImport (async CSV processing), getJobSummary, getJobRows |

---

## 9. schema.prisma
**Subject:** Database Schema Definition (Prisma)

### Enums
- `MembershipRole`: MENTOR, STUDENT
- `MembershipStatus`: ACTIVE, INVITED
- `SessionType`: REGULAR, MAKEUP, EXAM
- `SessionStatus`: SCHEDULED, STARTED, ENDED, CANCELLED
- `AttendanceStatus`: PRESENT, LATE, ABSENT, EXCUSED
- `AttendanceMethod`: SELF_SUBMITTED, MANUAL
- `JobType`: FULL_TIME, PART_TIME, INTERNSHIP, FREELANCE, NOT_LOOKING
- `WorkplacePreference`: REMOTE, ONSITE, HYBRID, NO_PREFERENCE
- `HireStatus`: EMPLOYED, JOB_SEEKING, FREELANCING, STUDENT_ONLY
- `ImportJobStatus`: PENDING, PROCESSING, COMPLETED, COMPLETED_WITH_ERRORS
- `ImportRowStatus`: SUCCESS, FAILED, SKIPPED

### Models Overview
- **User** (9 fields) → Membership[]
- **Workspace** (5 fields) → Settings, Membership[], Batch[]
- **WorkspaceSettings** (6 fields) — 1:1 with Workspace
- **Membership** (8 fields) → User, Workspace, StudentProfile?, BatchMembership[], Attendance[]
- **StudentProfile** (13 fields) — 1:1 with Membership
- **Batch** (11 fields) → Workspace, BatchMembership[], Session[], ImportJob[]
- **BatchMembership** (7 fields) → Membership, Batch, Attendance[]
- **Session** (14 fields) → Batch, Attendance[]
- **Attendance** (10 fields) → Session, BatchMembership, Membership (marker)
- **StudentImportJob** (7 fields) → Batch, StudentImportRow[]
- **StudentImportRow** (6 fields) → StudentImportJob
