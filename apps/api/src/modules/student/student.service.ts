import { Prisma, HireStatus, JobType, WorkplacePreference } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NotFoundError, BadRequestError } from "../../common/errors";
import {
  IEnrollResult,
  IEnrolledStudentsResult,
  IRevokeResult,
  IStudentProfileResult,
  IUpdateProfilePayload,
} from "./student.interface";

export class StudentService {
  static async enrollStudent(
    batchId: string,
    membershipId: string,
    isCR: boolean = false,
  ): Promise<IEnrollResult> {
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

    if (existingEnrollment) {
      if (existingEnrollment.revokedAt) {
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

  static async getEnrolledStudents(
    batchId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<IEnrolledStudentsResult> {
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      prisma.batchMembership.findMany({
        where: {
          batchId,
          revokedAt: null,
        },
        select: {
          id: true,
          batchId: true,
          membershipId: true,
          isCR: true,
          assignedAt: true,
          membership: {
            select: {
              id: true,
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              studentProfile: {
                select: {
                  id: true,
                  phone: true,
                  courseName: true,
                  specialization: true,
                  skills: true,
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
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async revokeEnrollment(batchId: string, batchMembershipId: string): Promise<IRevokeResult> {
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

  static async getStudentProfile(membershipId: string): Promise<IStudentProfileResult> {
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

  static async updateStudentProfile(
    membershipId: string,
    data: IUpdateProfilePayload,
  ) {
    try {
      return await prisma.studentProfile.upsert({
        where: { membershipId },
        update: data as Prisma.StudentProfileUpdateInput,
        create: {
          ...(data as Prisma.StudentProfileUncheckedCreateInput),
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
