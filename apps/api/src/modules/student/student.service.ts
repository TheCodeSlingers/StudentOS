import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { NotFoundError, BadRequestError } from "../../common/errors";

type HireStatus = "EMPLOYED" | "JOB_SEEKING" | "FREELANCING" | "STUDENT_ONLY";
type JobType =
  | "FULL_TIME"
  | "PART_TIME"
  | "INTERNSHIP"
  | "FREELANCE"
  | "NOT_LOOKING";
type WorkplacePreference = "REMOTE" | "ONSITE" | "HYBRID" | "NO_PREFERENCE";

export interface UpdateProfileData {
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  courseName?: string | null;
  specialization?: string | null;
  skills?: string[];
  hireStatus?: HireStatus;
  jobType?: JobType;
  workplacePreference?: WorkplacePreference;
  currentEmployer?: string | null;
  currentPosition?: string | null;
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
}

export interface StudentEnrollmentSummary {
  batchMembershipId: string;
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  isCR: boolean;
}

interface EnrollmentRecord {
  id: string;
  membershipId: string;
  isCR: boolean;
  membership: { user: { id: string; name: string; email: string } };
}

/** Flattens a BatchMembership+Membership+User join into the shape the frontend's BatchStudent expects. */
function flattenEnrollment(record: EnrollmentRecord): StudentEnrollmentSummary {
  return {
    batchMembershipId: record.id,
    membershipId: record.membershipId,
    userId: record.membership.user.id,
    name: record.membership.user.name,
    email: record.membership.user.email,
    isCR: record.isCR,
  };
}

export class StudentService {
  static async enrollStudentIntoDB(
    batchId: string,
    membershipId: string,
    isCR: boolean = false,
  ): Promise<StudentEnrollmentSummary> {
    const [batch, membership] = await Promise.all([
      prisma.batch.findUnique({
        where: { id: batchId },
        select: { id: true },
      }),
      prisma.membership.findUnique({
        where: { id: membershipId },
        select: { id: true },
      }),
    ]);

    if (!batch) {
      throw new NotFoundError("Batch not found");
    }

    if (!membership) {
      throw new NotFoundError("Membership not found");
    }

    const existingEnrollment = await prisma.batchMembership.findUnique({
      where: {
        membershipId_batchId: {
          membershipId,
          batchId,
        },
      },
      select: {
        id: true,
        revokedAt: true,
      },
    });

    const enrollmentSelect = {
      id: true,
      membershipId: true,
      isCR: true,
      membership: {
        select: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    } as const;

    if (existingEnrollment) {
      if (existingEnrollment.revokedAt) {
        const updated = await prisma.batchMembership.update({
          where: { id: existingEnrollment.id },
          data: { revokedAt: null, isCR },
          select: enrollmentSelect,
        });
        return flattenEnrollment(updated);
      }
      throw new BadRequestError("Student is already enrolled in this batch");
    }

    const created = await prisma.batchMembership.create({
      data: {
        batchId,
        membershipId,
        isCR,
      },
      select: enrollmentSelect,
    });
    return flattenEnrollment(created);
  }

  static async getEnrolledStudentsFromDB(
    batchId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: StudentEnrollmentSummary[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      prisma.batchMembership.findMany({
        where: {
          batchId,
          revokedAt: null,
        },
        select: {
          id: true,
          membershipId: true,
          isCR: true,
          membership: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          assignedAt: "desc",
        },
      }),
      prisma.batchMembership.count({
        where: {
          batchId,
          revokedAt: null,
        },
      }),
    ]);

    return {
      data: students.map(flattenEnrollment),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async revokeEnrollmentIntoDB(batchId: string, batchMembershipId: string) {
    const enrollment = await prisma.batchMembership.findUnique({
      where: { id: batchMembershipId },
    });

    if (!enrollment || enrollment.batchId !== batchId) {
      throw new NotFoundError("Batch membership not found");
    }

    if (enrollment.revokedAt) {
      throw new BadRequestError("Enrollment is already revoked");
    }

    return prisma.batchMembership.update({
      where: { id: batchMembershipId },
      data: { revokedAt: new Date() },
    });
  }

  static async getStudentProfileFromDB(membershipId: string) {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        studentProfile: true,
      },
    });

    if (!membership) {
      throw new NotFoundError("Membership not found");
    }

    const profile = membership.studentProfile;

    // Flatten to match the documented profile shape even when no profile row
    // exists yet (e.g. a freshly-enrolled student who hasn't saved anything).
    return {
      membershipId: membership.id,
      name: membership.user.name,
      email: membership.user.email,
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      courseName: profile?.courseName ?? null,
      specialization: profile?.specialization ?? null,
      skills: profile?.skills ?? [],
      hireStatus: profile?.hireStatus ?? "STUDENT_ONLY",
      jobType: profile?.jobType ?? "NOT_LOOKING",
      workplacePreference: profile?.workplacePreference ?? "NO_PREFERENCE",
      currentEmployer: profile?.currentEmployer ?? null,
      currentPosition: profile?.currentPosition ?? null,
      portfolioUrl: profile?.portfolioUrl ?? null,
      linkedinUrl: profile?.linkedinUrl ?? null,
    };
  }

  static async updateStudentProfileIntoDB(
    membershipId: string,
    data: UpdateProfileData,
  ) {
    try {
      return await prisma.studentProfile.upsert({
        where: { membershipId },
        update: data as any,
        create: {
          ...(data as any),
          membershipId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new NotFoundError("Membership not found");
      }
      throw error;
    }
  }
}
