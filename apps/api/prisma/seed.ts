import "dotenv/config";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";

/**
 * Idempotent test-data seed.
 *
 * Safe to run against a shared dev database: every workspace this script
 * creates is named with a "[Seed]" prefix and every user has a
 * `@studentos.test` email, so cleanup only ever touches records this script
 * itself created — nothing else in the database is read, deleted, or
 * modified. Re-running it wipes and rebuilds just the seed workspaces so you
 * always start from a known, predictable state; the seed *users* (and their
 * passwords) are reused across runs instead of being recreated.
 *
 * Data volume: the Horizon workspace intentionally has only ONE mentor (real
 * workspaces rarely have more than a couple), but every other table —
 * students, batches, batch memberships, sessions, attendance, import rows —
 * has at least 20 rows so list/pagination/filter UI has real volume to test
 * against, not just one or two token rows per state.
 *
 * Usage: npm run db:seed   (from apps/api)
 */

const SEED_PASSWORD = "SeedPass123!";
const EMAIL_DOMAIN = "studentos.test";

function minutesFromNow(mins: number) {
  return new Date(Date.now() + mins * 60_000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60_000);
}

async function ensureUser(localPart: string, name: string) {
  const email = `${localPart}@${EMAIL_DOMAIN}`;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const result = (await auth.api.signUpEmail({
    body: { email, password: SEED_PASSWORD, name },
    returnHeaders: true,
  })) as any;

  return prisma.user.findUniqueOrThrow({ where: { id: result.response.user.id } });
}

/**
 * Deletes a previously-seeded workspace and everything under it, in FK-safe
 * order (Attendance -> StudentImportJob -> Session -> BatchMembership ->
 * Batch -> Membership -> WorkspaceSettings -> Workspace). Leaves the
 * underlying Users untouched so credentials stay stable across re-runs.
 */
async function wipeSeedWorkspace(name: string) {
  const workspace = await prisma.workspace.findFirst({ where: { name } });
  if (!workspace) return;

  const batches = await prisma.batch.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true },
  });
  const batchIds = batches.map((b) => b.id);

  const sessions = await prisma.session.findMany({
    where: { batchId: { in: batchIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);

  await prisma.attendance.deleteMany({ where: { sessionId: { in: sessionIds } } });
  await prisma.studentImportJob.deleteMany({ where: { batchId: { in: batchIds } } });
  await prisma.session.deleteMany({ where: { batchId: { in: batchIds } } });
  await prisma.batchMembership.deleteMany({ where: { batchId: { in: batchIds } } });
  await prisma.batch.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.membership.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.workspaceSettings.deleteMany({ where: { workspaceId: workspace.id } });
  await prisma.workspace.delete({ where: { id: workspace.id } });
}

// 30 filler students, enrolled several-per-filler-batch (with overlapping
// rosters across batches, like real students taking more than one course) so
// a single batch's roster/sessions/attendance views have real volume instead
// of just one token row each.
const GENERIC_STUDENT_NAMES = [
  "Morgan Lee",
  "Jamie Chen",
  "Avery Kim",
  "Reese Patel",
  "Skyler Wong",
  "Drew Martinez",
  "Rowan Nguyen",
  "Emerson Johnson",
  "Finley Anderson",
  "Harper Davis",
  "Kai Brooks",
  "Logan Carter",
  "Peyton Bennett",
  "Sawyer Simmons",
  "Charlie Price",
  "Micah Foster",
  "Elliot Ramirez",
  "Quinn Sullivan",
  "Blake Coleman",
  "Dakota Reyes",
  "Phoenix Bailey",
  "Remy Torres",
  "Sage Mitchell",
  "Kendall Ross",
  "Marlowe Hughes",
  "Tatum Diaz",
  "Sutton Flores",
  "Wren Patterson",
  "Briar Ford",
  "Ellis Cooper",
];

const STUDENTS_PER_FILLER_BATCH = 6;
const SESSIONS_PER_FILLER_BATCH = 4;

const FILLER_BATCH_SUBJECTS = [
  "UI/UX Design",
  "Cloud Fundamentals",
  "Mobile App Development",
  "Python for Data Science",
  "DevOps Essentials",
  "Cybersecurity Basics",
  "Machine Learning 101",
  "Product Management",
  "Digital Marketing",
  "Game Development",
  "Backend Engineering",
  "QA & Testing",
  "Blockchain Basics",
  "Prompt Engineering",
  "Systems Design",
  "API Design",
];

const HIRE_STATUSES = ["JOB_SEEKING", "EMPLOYED", "FREELANCING", "STUDENT_ONLY"] as const;
const JOB_TYPES = ["FULL_TIME", "PART_TIME", "INTERNSHIP", "FREELANCE", "NOT_LOOKING"] as const;
const WORKPLACE_PREFS = ["REMOTE", "ONSITE", "HYBRID", "NO_PREFERENCE"] as const;
const ATTENDANCE_STATUSES = ["PRESENT", "LATE", "ABSENT"] as const;

async function seedHorizon() {
  const WORKSPACE_NAME = "[Seed] Horizon Coaching Center";
  await wipeSeedWorkspace(WORKSPACE_NAME);

  // ---- the one and only mentor ----
  const mentorUser = await ensureUser("seed.mentor1", "Alex Mentor");

  // ---- the 9 "special" students, each exercising a specific state ----
  const student1User = await ensureUser("seed.student1", "Priya CR");
  const student2User = await ensureUser("seed.student2", "Rahul Employed");
  const student3User = await ensureUser("seed.student3", "Aisha Fresher");
  const student4User = await ensureUser("seed.student4", "Sam Revoked");
  const student5User = await ensureUser("seed.student5", "Jordan Invited");
  const student6User = await ensureUser("seed.student6", "Casey Deactivated");
  const student7User = await ensureUser("seed.student7", "Taylor Co-CR");
  const student8User = await ensureUser("seed.student8", "Devon BatchB CR");
  const student9User = await ensureUser("seed.student9", "Riley Alumni");

  // ---- 15 generic students, for volume ----
  const genericUsers = [];
  for (let i = 0; i < GENERIC_STUDENT_NAMES.length; i += 1) {
    genericUsers.push(await ensureUser(`seed.student${10 + i}`, GENERIC_STUDENT_NAMES[i]));
  }

  // ---- workspace + settings ----
  const workspace = await prisma.workspace.create({
    data: {
      name: WORKSPACE_NAME,
      timezone: "Asia/Dhaka",
      settings: {
        create: { defaultAttendanceDurationMins: 20, lateThresholdMins: 12 },
      },
    },
  });

  // ---- memberships ----
  const mentor = await prisma.membership.create({
    data: { userId: mentorUser.id, workspaceId: workspace.id, role: "MENTOR", status: "ACTIVE" },
  });
  const student1 = await prisma.membership.create({
    data: { userId: student1User.id, workspaceId: workspace.id, role: "STUDENT", status: "ACTIVE" },
  });
  const student2 = await prisma.membership.create({
    data: { userId: student2User.id, workspaceId: workspace.id, role: "STUDENT", status: "ACTIVE" },
  });
  const student3 = await prisma.membership.create({
    data: { userId: student3User.id, workspaceId: workspace.id, role: "STUDENT", status: "ACTIVE" },
  });
  const student4 = await prisma.membership.create({
    data: { userId: student4User.id, workspaceId: workspace.id, role: "STUDENT", status: "ACTIVE" },
  });
  // Invited: hasn't been enrolled in anything yet, exercises the INVITED
  // member-list state.
  await prisma.membership.create({
    data: { userId: student5User.id, workspaceId: workspace.id, role: "STUDENT", status: "INVITED" },
  });
  // Deactivated: exercises the INACTIVE member-list state.
  await prisma.membership.create({
    data: { userId: student6User.id, workspaceId: workspace.id, role: "STUDENT", status: "INACTIVE" },
  });
  const student7 = await prisma.membership.create({
    data: { userId: student7User.id, workspaceId: workspace.id, role: "STUDENT", status: "ACTIVE" },
  });
  const student8 = await prisma.membership.create({
    data: { userId: student8User.id, workspaceId: workspace.id, role: "STUDENT", status: "ACTIVE" },
  });
  const student9 = await prisma.membership.create({
    data: { userId: student9User.id, workspaceId: workspace.id, role: "STUDENT", status: "ACTIVE" },
  });

  const genericStudents = [];
  for (const user of genericUsers) {
    genericStudents.push(
      await prisma.membership.create({
        data: { userId: user.id, workspaceId: workspace.id, role: "STUDENT", status: "ACTIVE" },
      })
    );
  }

  // ---- student profiles (special students) ----
  await prisma.studentProfile.create({
    data: {
      membershipId: student1.id,
      phone: "+8801700000001",
      address: "Dhaka, Bangladesh",
      courseName: "Full Stack Web Development",
      specialization: "Frontend",
      skills: ["JavaScript", "React", "TypeScript"],
      hireStatus: "JOB_SEEKING",
      jobType: "FULL_TIME",
      workplacePreference: "REMOTE",
      portfolioUrl: "https://priya.dev",
      linkedinUrl: "https://linkedin.com/in/priya-seed",
    },
  });
  await prisma.studentProfile.create({
    data: {
      membershipId: student2.id,
      phone: "+8801700000002",
      courseName: "Full Stack Web Development",
      specialization: "Backend",
      skills: ["Node.js", "PostgreSQL"],
      hireStatus: "EMPLOYED",
      jobType: "FULL_TIME",
      workplacePreference: "HYBRID",
      currentEmployer: "Tech Solutions Ltd",
      currentPosition: "Backend Engineer",
    },
  });
  await prisma.studentProfile.create({
    data: {
      membershipId: student3.id,
      // Deliberately left at schema defaults (STUDENT_ONLY / NOT_LOOKING /
      // NO_PREFERENCE, no skills) to cover the "freshly enrolled, hasn't
      // filled out their profile yet" case.
    },
  });
  await prisma.studentProfile.create({
    data: {
      membershipId: student7.id,
      phone: "+8801700000007",
      courseName: "Full Stack Web Development",
      specialization: "DevOps",
      skills: ["Docker", "Kubernetes", "AWS"],
      hireStatus: "FREELANCING",
      jobType: "FREELANCE",
      workplacePreference: "ONSITE",
      portfolioUrl: "https://taylor-seed.dev",
    },
  });
  await prisma.studentProfile.create({
    data: {
      membershipId: student8.id,
      phone: "+8801700000008",
      courseName: "Data Structures",
      specialization: "Algorithms",
      skills: ["Python", "C++"],
      hireStatus: "EMPLOYED",
      jobType: "PART_TIME",
      workplacePreference: "ONSITE",
      currentEmployer: "Seed Analytics Co",
      currentPosition: "Junior Data Analyst",
    },
  });
  await prisma.studentProfile.create({
    data: {
      membershipId: student9.id,
      phone: "+8801700000009",
      courseName: "Full Stack Web Development",
      specialization: "QA",
      skills: ["Selenium", "Jest"],
      hireStatus: "JOB_SEEKING",
      jobType: "INTERNSHIP",
      workplacePreference: "REMOTE",
    },
  });

  // ---- student profiles (generic students) — cycled enum combos so every
  // HireStatus / JobType / WorkplacePreference value gets exercised ----
  for (let i = 0; i < genericStudents.length; i += 1) {
    await prisma.studentProfile.create({
      data: {
        membershipId: genericStudents[i].id,
        phone: `+880171000${String(i + 10).padStart(4, "0")}`,
        courseName: "Full Stack Web Development",
        skills: ["Git", "SQL"],
        hireStatus: HIRE_STATUSES[i % HIRE_STATUSES.length],
        jobType: JOB_TYPES[i % JOB_TYPES.length],
        workplacePreference: WORKPLACE_PREFS[i % WORKPLACE_PREFS.length],
      },
    });
  }

  // ---- the 4 "special" batches ----
  const batchA = await prisma.batch.create({
    data: {
      workspaceId: workspace.id,
      name: "[Seed] Full-Stack Web Dev — Batch 12",
      startDate: daysFromNow(-30),
      endDate: daysFromNow(60),
      capacity: 30,
      defaultMeetLink: "https://meet.google.com/seed-batch-a",
      lateThresholdMinsOverride: 15,
      attendanceDurationMinsOverride: 30,
    },
  });
  const batchB = await prisma.batch.create({
    data: {
      workspaceId: workspace.id,
      name: "[Seed] Data Structures — Batch 8",
      startDate: daysFromNow(-10),
      endDate: daysFromNow(80),
      capacity: 25,
      // No overrides: exercises fallback to workspace-level settings.
    },
  });
  const batchC = await prisma.batch.create({
    data: {
      workspaceId: workspace.id,
      name: "[Seed] Legacy Cohort — Archived",
      startDate: daysFromNow(-200),
      endDate: daysFromNow(-40),
      isArchived: true,
    },
  });
  const batchD = await prisma.batch.create({
    data: {
      workspaceId: workspace.id,
      name: "[Seed] Intro to Python — Batch 5",
      startDate: daysFromNow(-150),
      endDate: daysFromNow(-90),
      isArchived: true,
    },
  });

  // ---- 16 filler batches, for volume — last 2 archived so the archived
  // list has more than the 2 "special" archived batches to page through ----
  const fillerBatches = [];
  for (let i = 0; i < FILLER_BATCH_SUBJECTS.length; i += 1) {
    const isArchived = i >= FILLER_BATCH_SUBJECTS.length - 2;
    fillerBatches.push(
      await prisma.batch.create({
        data: {
          workspaceId: workspace.id,
          name: `[Seed] ${FILLER_BATCH_SUBJECTS[i]}`,
          startDate: isArchived ? daysFromNow(-120 - i) : daysFromNow(-20 + i),
          endDate: isArchived ? daysFromNow(-30 - i) : daysFromNow(90 + i),
          isArchived,
        },
      })
    );
  }

  // ---- batch memberships: the "special" enrollments ----
  const bmStudent1BatchA = await prisma.batchMembership.create({
    data: { membershipId: student1.id, batchId: batchA.id, isCR: true },
  });
  const bmStudent2BatchA = await prisma.batchMembership.create({
    data: { membershipId: student2.id, batchId: batchA.id, isCR: false },
  });
  const bmStudent3BatchA = await prisma.batchMembership.create({
    data: { membershipId: student3.id, batchId: batchA.id, isCR: false },
  });
  // Revoked enrollment: exercises "removed from batch" while keeping the
  // batch membership row (and its historical attendance) around.
  const bmStudent4BatchA = await prisma.batchMembership.create({
    data: {
      membershipId: student4.id,
      batchId: batchA.id,
      isCR: false,
      revokedAt: daysFromNow(-5),
    },
  });
  const bmStudent2BatchB = await prisma.batchMembership.create({
    data: { membershipId: student2.id, batchId: batchB.id, isCR: false },
  });
  // Cross-enrollments: student1 is CR in batch A but a plain member in batch
  // B, and student3 is enrolled in three active/archived batches at once —
  // exercises the "My batches" list showing multiple rows with mixed CR
  // status per row.
  await prisma.batchMembership.create({
    data: { membershipId: student1.id, batchId: batchB.id, isCR: false },
  });
  await prisma.batchMembership.create({
    data: { membershipId: student3.id, batchId: batchB.id, isCR: false },
  });
  // Co-CR: batch A now has two active CRs, so its totalCRs metric is 2 and
  // the CR-toggle UI has more than one row to demote.
  await prisma.batchMembership.create({
    data: { membershipId: student7.id, batchId: batchA.id, isCR: true },
  });
  // Batch B's own CR — distinct from batch A's CRs, so /dashboard/cr/sessions
  // correctly scopes to only the batch(es) each CR actually manages.
  const bmStudent8BatchB = await prisma.batchMembership.create({
    data: { membershipId: student8.id, batchId: batchB.id, isCR: true },
  });
  // Legacy alumni enrollments on the two "special" archived batches, so their
  // detail metrics and attendance history aren't all zero.
  const bmStudent9BatchC = await prisma.batchMembership.create({
    data: { membershipId: student9.id, batchId: batchC.id, isCR: false },
  });
  const bmStudent3BatchD = await prisma.batchMembership.create({
    data: { membershipId: student3.id, batchId: batchD.id, isCR: false },
  });

  // ---- batch memberships + several sessions (+ attendance) per filler
  // batch, cycling through the 30 generic students with an overlapping
  // rolling window, so any single batch's roster/session-list/attendance
  // views have real volume to scroll through instead of one token row ----
  const fillerBatchMemberships = [];
  const fillerSessions = [];
  for (let i = 0; i < fillerBatches.length; i += 1) {
    const batch = fillerBatches[i];
    const isArchived = i >= FILLER_BATCH_SUBJECTS.length - 2;

    // Rolling window of students per batch (offset by 3 each batch) so
    // rosters overlap across batches — like real students taking more than
    // one course — without every batch having an identical roster.
    const batchMembers = [];
    for (let s = 0; s < STUDENTS_PER_FILLER_BATCH; s += 1) {
      const genericStudent = genericStudents[(i * 3 + s) % genericStudents.length];
      const bm = await prisma.batchMembership.create({
        data: { membershipId: genericStudent.id, batchId: batch.id, isCR: s === 0 },
      });
      batchMembers.push(bm);
      fillerBatchMemberships.push(bm);
    }

    // Archived batches are already finished, so every session is ENDED.
    // Active batches get a realistic mix: one live (STARTED) session, two
    // historical (ENDED) ones, and one still upcoming (SCHEDULED).
    for (let sIdx = 0; sIdx < SESSIONS_PER_FILLER_BATCH; sIdx += 1) {
      const status = isArchived ? "ENDED" : sIdx === 0 ? "STARTED" : sIdx === 3 ? "SCHEDULED" : "ENDED";
      const isEnded = status === "ENDED";
      const isStarted = status === "STARTED";
      const dayOffset = -40 - i - sIdx * 7;

      const session = await prisma.session.create({
        data: {
          batchId: batch.id,
          title: `${FILLER_BATCH_SUBJECTS[i]} — Session ${sIdx + 1}`,
          scheduledStart: isStarted
            ? minutesFromNow(-20)
            : isEnded
              ? daysFromNow(dayOffset)
              : daysFromNow(5 + i + sIdx),
          scheduledEnd: isStarted
            ? minutesFromNow(40)
            : isEnded
              ? daysFromNow(dayOffset)
              : minutesFromNow((5 + i + sIdx) * 24 * 60 + 90),
          status,
          ...(isEnded
            ? {
                attendanceOpenedAt: daysFromNow(dayOffset),
                attendanceOpenedById: mentor.id,
                attendanceClosedAt: daysFromNow(dayOffset),
                attendanceClosedById: mentor.id,
              }
            : {}),
          ...(isStarted
            ? {
                attendanceOpenedAt: minutesFromNow(-10),
                attendanceOpenedById: mentor.id,
                currentCode: String(100000 + i * 37 + sIdx * 911).slice(0, 6),
                codeRotatedAt: minutesFromNow(-10),
              }
            : {}),
        },
      });
      fillerSessions.push(session);

      if (isEnded || isStarted) {
        // Live sessions only have partial check-ins so far — only half the
        // roster has submitted, mirroring real self check-in in progress.
        const checkedIn = isStarted ? batchMembers.filter((_, m) => m % 2 === 0) : batchMembers;
        const attendanceRows = checkedIn.map((member, idx) => ({
          sessionId: session.id,
          studentBatchMembershipId: member.id,
          status: ATTENDANCE_STATUSES[(i + sIdx + idx) % ATTENDANCE_STATUSES.length],
          method: idx % 4 === 0 ? ("MANUAL" as const) : ("SELF_SUBMITTED" as const),
          submittedAt: isEnded ? daysFromNow(dayOffset) : minutesFromNow(-8),
          markedById: idx % 4 === 0 ? mentor.id : undefined,
          manualReason: idx % 4 === 0 ? "Marked manually during roll call." : undefined,
        }));
        await prisma.attendance.createMany({ data: attendanceRows });
      }
    }
  }

  // ---- sessions: batch A ----
  const sessionScheduled = await prisma.session.create({
    data: {
      batchId: batchA.id,
      title: "Kickoff & Orientation",
      description: "First session of the batch — introductions and roadmap walkthrough.",
      scheduledStart: daysFromNow(1),
      scheduledEnd: minutesFromNow(1 * 24 * 60 + 90),
      meetLink: "https://meet.google.com/seed-session-1",
      type: "REGULAR",
      status: "SCHEDULED",
    },
  });

  const sessionOpen = await prisma.session.create({
    data: {
      batchId: batchA.id,
      title: "Live Coding: React Hooks",
      scheduledStart: minutesFromNow(-30),
      scheduledEnd: minutesFromNow(30),
      meetLink: "https://meet.google.com/seed-session-2",
      type: "REGULAR",
      status: "STARTED",
      attendanceOpenedAt: minutesFromNow(-5),
      attendanceOpenedById: mentor.id,
      currentCode: "482913",
      codeRotatedAt: minutesFromNow(-5),
    },
  });

  const sessionEnded = await prisma.session.create({
    data: {
      batchId: batchA.id,
      title: "Module Review & Quiz",
      scheduledStart: daysFromNow(-2),
      scheduledEnd: daysFromNow(-2),
      type: "EXAM",
      status: "ENDED",
      attendanceOpenedAt: daysFromNow(-2),
      attendanceOpenedById: mentor.id,
      attendanceClosedAt: daysFromNow(-2),
      attendanceClosedById: mentor.id,
    },
  });

  const sessionCancelled = await prisma.session.create({
    data: {
      batchId: batchA.id,
      title: "Guest Lecture: Industry Trends",
      scheduledStart: daysFromNow(-1),
      scheduledEnd: daysFromNow(-1),
      type: "MAKEUP",
      status: "CANCELLED",
    },
  });

  // ---- attendance for the ENDED session: every status x method combo ----
  await prisma.attendance.create({
    data: {
      sessionId: sessionEnded.id,
      studentBatchMembershipId: bmStudent1BatchA.id,
      status: "PRESENT",
      method: "SELF_SUBMITTED",
      submittedAt: daysFromNow(-2),
    },
  });
  await prisma.attendance.create({
    data: {
      sessionId: sessionEnded.id,
      studentBatchMembershipId: bmStudent2BatchA.id,
      status: "LATE",
      method: "SELF_SUBMITTED",
      submittedAt: daysFromNow(-2),
    },
  });
  await prisma.attendance.create({
    data: {
      sessionId: sessionEnded.id,
      studentBatchMembershipId: bmStudent3BatchA.id,
      status: "ABSENT",
      method: "MANUAL",
      submittedAt: daysFromNow(-2),
      markedById: mentor.id,
      manualReason: "No-show, did not respond to reminders.",
    },
  });
  // Historical attendance on a batch membership that was *later* revoked —
  // confirms revoking a student doesn't erase their attendance record.
  await prisma.attendance.create({
    data: {
      sessionId: sessionEnded.id,
      studentBatchMembershipId: bmStudent4BatchA.id,
      status: "EXCUSED",
      method: "MANUAL",
      submittedAt: daysFromNow(-2),
      markedById: mentor.id,
      manualReason: "Approved leave — pre-existing medical appointment.",
    },
  });

  // ---- sessions: batch B ----
  const sessionBEnded = await prisma.session.create({
    data: {
      batchId: batchB.id,
      title: "Intro to Big-O Notation",
      scheduledStart: daysFromNow(-3),
      scheduledEnd: daysFromNow(-3),
      status: "ENDED",
      attendanceOpenedAt: daysFromNow(-3),
      attendanceOpenedById: mentor.id,
      attendanceClosedAt: daysFromNow(-3),
      attendanceClosedById: mentor.id,
    },
  });
  await prisma.attendance.create({
    data: {
      sessionId: sessionBEnded.id,
      studentBatchMembershipId: bmStudent2BatchB.id,
      status: "PRESENT",
      method: "SELF_SUBMITTED",
      submittedAt: daysFromNow(-3),
    },
  });

  await prisma.session.create({
    data: {
      batchId: batchB.id,
      title: "Sorting Algorithms",
      scheduledStart: daysFromNow(3),
      scheduledEnd: minutesFromNow(3 * 24 * 60 + 90),
      meetLink: "https://meet.google.com/seed-session-sorting",
      status: "SCHEDULED",
    },
  });

  // A batch-B session opened by batch B's own CR (not a mentor) — exercises
  // attendanceOpenedById pointing at a CR membership, and gives batch B a
  // live check-in code for testing self check-in independent of batch A.
  const sessionBOpen = await prisma.session.create({
    data: {
      batchId: batchB.id,
      title: "Linked Lists Deep Dive",
      scheduledStart: minutesFromNow(-20),
      scheduledEnd: minutesFromNow(40),
      meetLink: "https://meet.google.com/seed-session-batchb-open",
      status: "STARTED",
      attendanceOpenedAt: minutesFromNow(-10),
      attendanceOpenedById: bmStudent8BatchB.membershipId,
      currentCode: "739201",
      codeRotatedAt: minutesFromNow(-10),
    },
  });
  await prisma.attendance.create({
    data: {
      sessionId: sessionBOpen.id,
      studentBatchMembershipId: bmStudent2BatchB.id,
      status: "PRESENT",
      method: "SELF_SUBMITTED",
      submittedAt: minutesFromNow(-8),
    },
  });

  // ---- sessions + attendance on the two archived batches, so their history
  // isn't empty just because the batch itself is archived now ----
  const sessionLegacyCEnded = await prisma.session.create({
    data: {
      batchId: batchC.id,
      title: "Final Project Demos",
      scheduledStart: daysFromNow(-45),
      scheduledEnd: daysFromNow(-45),
      status: "ENDED",
      attendanceOpenedAt: daysFromNow(-45),
      attendanceOpenedById: mentor.id,
      attendanceClosedAt: daysFromNow(-45),
      attendanceClosedById: mentor.id,
    },
  });
  await prisma.attendance.create({
    data: {
      sessionId: sessionLegacyCEnded.id,
      studentBatchMembershipId: bmStudent9BatchC.id,
      status: "PRESENT",
      method: "SELF_SUBMITTED",
      submittedAt: daysFromNow(-45),
    },
  });

  const sessionLegacyDEnded = await prisma.session.create({
    data: {
      batchId: batchD.id,
      title: "Closing Ceremony",
      scheduledStart: daysFromNow(-95),
      scheduledEnd: daysFromNow(-95),
      status: "ENDED",
      attendanceOpenedAt: daysFromNow(-95),
      attendanceOpenedById: mentor.id,
      attendanceClosedAt: daysFromNow(-95),
      attendanceClosedById: mentor.id,
    },
  });
  await prisma.attendance.create({
    data: {
      sessionId: sessionLegacyDEnded.id,
      studentBatchMembershipId: bmStudent3BatchD.id,
      status: "PRESENT",
      method: "SELF_SUBMITTED",
      submittedAt: daysFromNow(-95),
    },
  });

  // ---- CSV import job (batch A) with 20 rows, pre-populated so the
  // status/rows GET endpoints have real volume without an actual upload ----
  const importRows = [];
  for (let i = 1; i <= 16; i += 1) {
    importRows.push({ rowNumber: i, email: `imported.success${i}@studentos.test`, status: "SUCCESS" as const });
  }
  importRows.push(
    { rowNumber: 17, email: "not-an-email", status: "FAILED" as const, errorMessage: "Invalid email address format." },
    { rowNumber: 18, email: "seed.student1@studentos.test", status: "FAILED" as const, errorMessage: "Student is already enrolled in this batch." },
    { rowNumber: 19, email: "", status: "FAILED" as const, errorMessage: "Email is required." },
    { rowNumber: 20, email: "duplicate.row@studentos.test", status: "FAILED" as const, errorMessage: "Duplicate row in the uploaded file." }
  );

  await prisma.studentImportJob.create({
    data: {
      batchId: batchA.id,
      status: "COMPLETED_WITH_ERRORS",
      totalRows: importRows.length,
      successRows: importRows.filter((r) => r.status === "SUCCESS").length,
      failedRows: importRows.filter((r) => r.status === "FAILED").length,
      rows: { create: importRows },
    },
  });

  // A second import job in a different state (batch B) — exercises the
  // "still processing" state, not just "done with errors".
  await prisma.studentImportJob.create({
    data: {
      batchId: batchB.id,
      status: "PROCESSING",
      totalRows: 3,
      successRows: 0,
      failedRows: 0,
    },
  });

  return {
    workspace,
    mentor: { membership: mentor, user: mentorUser },
    student1: { membership: student1, user: student1User },
    student7: { membership: student7, user: student7User },
    student8: { membership: student8, user: student8User },
    student9: { membership: student9, user: student9User },
    batches: { batchA, batchB, batchC, batchD },
    sessions: { sessionScheduled, sessionOpen, sessionEnded, sessionCancelled, sessionBOpen },
    counts: {
      students: 9 + genericStudents.length,
      batches: 4 + fillerBatches.length,
      batchMemberships:
        11 /* the special enrollments created above */ + fillerBatchMemberships.length,
      sessions: 4 + 3 + 2 + fillerSessions.length,
    },
  };
}

/**
 * A second, mostly-empty workspace so you can verify workspace-scoped
 * authorization — e.g. that Horizon's mentor token can't see Nova's batches.
 * Deliberately stays minimal; its whole purpose is isolation-testing, not
 * volume.
 */
async function seedNova() {
  const WORKSPACE_NAME = "[Seed] Nova Bootcamp";
  await wipeSeedWorkspace(WORKSPACE_NAME);

  const mentorUser = await ensureUser("seed.mentor.nova", "Nova Mentor");
  const studentUser = await ensureUser("seed.student.nova", "Nova Student");

  const workspace = await prisma.workspace.create({
    data: {
      name: WORKSPACE_NAME,
      settings: { create: { defaultAttendanceDurationMins: 15, lateThresholdMins: 10 } },
    },
  });

  const mentor = await prisma.membership.create({
    data: { userId: mentorUser.id, workspaceId: workspace.id, role: "MENTOR", status: "ACTIVE" },
  });
  const student = await prisma.membership.create({
    data: { userId: studentUser.id, workspaceId: workspace.id, role: "STUDENT", status: "ACTIVE" },
  });

  const batch = await prisma.batch.create({
    data: {
      workspaceId: workspace.id,
      name: "[Seed] Nova Cohort 1",
      startDate: daysFromNow(-5),
      endDate: daysFromNow(90),
    },
  });

  await prisma.batchMembership.create({
    data: { membershipId: student.id, batchId: batch.id, isCR: false },
  });

  await prisma.session.create({
    data: {
      batchId: batch.id,
      title: "Nova Kickoff",
      scheduledStart: daysFromNow(2),
      scheduledEnd: daysFromNow(2),
      status: "SCHEDULED",
    },
  });

  return { workspace, mentor: { membership: mentor, user: mentorUser } };
}

async function main() {
  const horizon = await seedHorizon();
  const nova = await seedNova();

  const line = (label: string, value: string) => `  ${label.padEnd(28)} ${value}`;

  console.log("\nSeed complete. Password for every seeded account:", SEED_PASSWORD, "\n");

  console.log(`Workspace: ${horizon.workspace.name}  (id: ${horizon.workspace.id})`);
  console.log(
    line(
      "Row counts",
      `${horizon.counts.students} students, ${horizon.counts.batches} batches, ` +
        `${horizon.counts.batchMemberships} batch memberships, ${horizon.counts.sessions} sessions`
    )
  );
  console.log(line("Mentor (only one)", horizon.mentor.user.email));
  console.log(line("Student (CR, batch A)", "seed.student1@studentos.test"));
  console.log(line("Student (employed)", "seed.student2@studentos.test"));
  console.log(line("Student (fresh profile)", "seed.student3@studentos.test"));
  console.log(line("Student (revoked from batch A)", "seed.student4@studentos.test"));
  console.log(line("Student (invited, no batch yet)", "seed.student5@studentos.test"));
  console.log(line("Student (deactivated member)", "seed.student6@studentos.test"));
  console.log(line("Student (co-CR, batch A)", "seed.student7@studentos.test"));
  console.log(line("Student (CR, batch B)", "seed.student8@studentos.test"));
  console.log(line("Student (legacy alumni)", "seed.student9@studentos.test"));
  console.log(line("Generic students", "seed.student10@studentos.test … seed.student39@studentos.test"));
  console.log(line("Batch A (active, has overrides)", horizon.batches.batchA.id));
  console.log(line("Batch B (active, no overrides)", horizon.batches.batchB.id));
  console.log(line("Batch C (archived)", horizon.batches.batchC.id));
  console.log(line("Batch D (archived)", horizon.batches.batchD.id));
  console.log(line("Filler batches (14 active, 2 archived)", "see [Seed] <subject> names"));
  console.log(line("Session: SCHEDULED", horizon.sessions.sessionScheduled.id));
  console.log(line("Session: STARTED, batch A (code 482913)", horizon.sessions.sessionOpen.id));
  console.log(line("Session: STARTED, batch B (code 739201)", horizon.sessions.sessionBOpen.id));
  console.log(line("Session: ENDED (has attendance)", horizon.sessions.sessionEnded.id));
  console.log(line("Session: CANCELLED", horizon.sessions.sessionCancelled.id));

  console.log(`\nWorkspace: ${nova.workspace.name}  (id: ${nova.workspace.id})`);
  console.log(line("Mentor", nova.mentor.user.email));
  console.log("  (use this workspace to confirm Horizon data isn't visible here, and vice versa)\n");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
