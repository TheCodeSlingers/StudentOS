import { prisma } from "../../lib/prisma";
import { NotFoundError, BadRequestError } from "../../common/errors";

type HireStatus = "EMPLOYED" | "JOB_SEEKING" | "FREELANCING" | "STUDENT_ONLY";
type JobType = "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "FREELANCE" | "NOT_LOOKING";
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

export class StudentService {
  static async enrollStudent(batchId: string, membershipId: string, isCR: boolean = false) {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundError("Batch not found");
    }

    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
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
    });

    if (existingEnrollment) {
      if (existingEnrollment.revokedAt) {
        // Re-enroll
        return prisma.batchMembership.update({
          where: { id: existingEnrollment.id },
          data: { revokedAt: null, isCR },
        });
      }
      throw new BadRequestError("Student is already enrolled in this batch");
    }

    return prisma.batchMembership.create({
      data: {
        batchId,
        membershipId,
        isCR,
      },
    });
  }

  static async getEnrolledStudents(batchId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      prisma.batchMembership.findMany({
        where: {
          batchId,
          revokedAt: null,
        },
        include: {
          membership: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              studentProfile: true,
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
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async revokeEnrollment(batchId: string, batchMembershipId: string) {
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

  static async getStudentProfile(membershipId: string) {
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

    return membership;
  }

  static async updateStudentProfile(membershipId: string, data: UpdateProfileData) {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundError("Membership not found");
    }

    return prisma.studentProfile.upsert({
      where: { membershipId },
      update: data as any,
      create: {
        ...(data as any),
        membershipId,
      },
    });
  }
}
