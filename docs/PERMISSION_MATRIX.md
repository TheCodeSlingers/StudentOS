# StudentOS — Permission Matrix (v1 Simple Complete)

This document maps Permission Actions to Workspace Roles. Every backend validation guard and frontend rendering condition must match the action strings defined below.

---

## Roles Overview
- **MENTOR**: Has full administrative capability over the workspace settings, rosters, batches, sessions, and override marks.
- **STUDENT**: Standard student enrolled in batches. Can view their own history and self-submit attendance codes.
- **CR (Class Representative)**: A student with an active `isCR` flag inside a batch. They can open/close attendance windows and manually mark student attendance for their assigned batch.

---

## 1. Workspace & Settings

| Action | Mentor | CR | Student | Scope |
|---|---|---|---|---|
| `workspace.view` | ✅ | ✅ | ✅ | Workspace |
| `workspace.settings.update` | ✅ | ❌ | ❌ | Workspace |

---

## 2. Members

| Action | Mentor | CR | Student | Scope |
|---|---|---|---|---|
| `membership.invite` | ✅ | ❌ | ❌ | Workspace |
| `membership.view` | ✅ | ❌ | ❌ | Workspace |
| `membership.remove` | ✅ | ❌ | ❌ | Workspace |

---

## 3. Batches

| Action | Mentor | CR | Student | Scope |
|---|---|---|---|---|
| `batch.create` | ✅ | ❌ | ❌ | Workspace |
| `batch.view` | ✅ | ✅ | ✅ | Own Batch |
| `batch.update` | ✅ | ❌ | ❌ | Own Batch |
| `batch.archive` | ✅ | ❌ | ❌ | Own Batch |
| `batch.assign_cr` | ✅ | ❌ | ❌ | Own Batch |
| `batch.revoke_cr` | ✅ | ❌ | ❌ | Own Batch |

---

## 4. Students & Profiles

| Action | Mentor | CR | Student | Scope |
|---|---|---|---|---|
| `student.add` | ✅ | ❌ | ❌ | Own Batch |
| `student.view` | ✅ | ✅ | 🔶 | Own Batch (Student: Self only) |
| `student.remove` | ✅ | ❌ | ❌ | Own Batch |
| `student.bulk_import` | ✅ | ❌ | ❌ | Own Batch |
| `student.import_job.view_report` | ✅ | ❌ | ❌ | Own Batch |
| `student.profile.view` | ✅ | ✅ | 🔶 | Workspace (Student: Self only) |
| `student.profile.update` | ❌ | ❌ | ✅ | Self |

---

## 5. Sessions

| Action | Mentor | CR | Student | Scope |
|---|---|---|---|---|
| `session.create` | ✅ | ❌ | ❌ | Own Batch |
| `session.view` | ✅ | ✅ | ✅ | Own Batch |
| `session.update` | ✅ | ❌ | ❌ | Own Batch |
| `session.cancel` | ✅ | ❌ | ❌ | Own Batch |
| `session.attendance.open` | ✅ | ✅ | ❌ | Own Batch |
| `session.attendance.close` | ✅ | ✅ | ❌ | Own Batch |

---

## 6. Attendance

| Action | Mentor | CR | Student | Scope |
|---|---|---|---|---|
| `attendance.submit_self` | ❌ | ✅ | ✅ | Self (Window open only) |
| `attendance.manual_mark` | ✅ | ✅ | ❌ | Own Batch |
| `attendance.view` | ✅ | ✅ | 🔶 | Own Batch (Student: Self only) |
| `attendance.view_all_students` | ✅ | ✅ | ❌ | Own Batch |
