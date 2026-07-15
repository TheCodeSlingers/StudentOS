import { prisma } from "../../lib/prisma";
import { parseCSV, CSVRow } from "../../utils/csv-parser";
import { NotFoundError } from "../../common/errors";

export interface ImportJobSummary {
  id: string;
  batchId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "COMPLETED_WITH_ERRORS";
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportJobRowReport {
  id: string;
  rowNumber: number;
  email: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  errorMessage: string | null;
}

export class ImportService {
  static async startImport(batchId: string, fileBuffer: Buffer): Promise<string> {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new NotFoundError("The target batch does not exist.", "BATCH_NOT_FOUND");
    }

    const job = await prisma.studentImportJob.create({
      data: {
        batchId,
        status: "PENDING",
        totalRows: 0,
        successRows: 0,
        failedRows: 0,
      },
    });

    this.processImportAsync(job.id, batch.workspaceId, batchId, fileBuffer).catch(() => {});

    return job.id;
  }

  static async getJobSummary(jobId: string): Promise<ImportJobSummary | null> {
    const job = await prisma.studentImportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      batchId: job.batchId,
      status: job.status as any,
      totalRows: job.totalRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  static async getJobRows(jobId: string): Promise<ImportJobRowReport[]> {
    const rows = await prisma.studentImportRow.findMany({
      where: { jobId },
      orderBy: { rowNumber: "asc" },
    });

    return rows.map((r: any) => ({
      id: r.id,
      rowNumber: r.rowNumber,
      email: r.email,
      status: r.status as any,
      errorMessage: r.errorMessage,
    }));
  }

  private static async processImportAsync(
    jobId: string,
    workspaceId: string,
    batchId: string,
    fileBuffer: Buffer
  ): Promise<void> {
    let rows: CSVRow[] = [];

    await prisma.studentImportJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING" },
    });

    try {
      rows = parseCSV(fileBuffer);
    } catch (err: any) {
      await prisma.studentImportJob.update({
        where: { id: jobId },
        data: { status: "COMPLETED_WITH_ERRORS" },
      });
      await prisma.studentImportRow.create({
        data: {
          jobId,
          rowNumber: 0,
          email: "N/A",
          status: "FAILED",
          errorMessage: err.message || "Failed to parse CSV file",
        },
      });
      return;
    }

    await prisma.studentImportJob.update({
      where: { id: jobId },
      data: { totalRows: rows.length },
    });

    let successCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      try {
        await prisma.$transaction(async tx => {
          let user = await tx.user.findUnique({
            where: { email: row.email },
          });

          if (!user) {
            user = await tx.user.create({
              data: {
                email: row.email,
                name: row.name,
              },
            });
          }

          let membership = await tx.membership.findFirst({
            where: {
              workspaceId,
              userId: user.id,
            },
          });

          if (!membership) {
            membership = await tx.membership.create({
              data: {
                workspaceId,
                userId: user.id,
                role: "STUDENT",
                status: "ACTIVE",
              },
            });
          }

          let batchMembership = await tx.batchMembership.findFirst({
            where: {
              batchId,
              membershipId: membership.id,
            },
          });

          if (!batchMembership) {
            batchMembership = await tx.batchMembership.create({
              data: {
                batchId,
                membershipId: membership.id,
                isCR: false,
              },
            });
          }

          const existingProfile = await tx.studentProfile.findUnique({
            where: { membershipId: membership.id },
          });

          if (!existingProfile) {
            await tx.studentProfile.create({
              data: {
                membershipId: membership.id,
                phone: row.phone || null,
                courseName: row.courseName || null,
                specialization: row.specialization || null,
                skills: row.skills || [],
              },
            });
          } else {
            const updateData: any = {};
            if (row.phone) updateData.phone = row.phone;
            if (row.courseName) updateData.courseName = row.courseName;
            if (row.specialization) updateData.specialization = row.specialization;
            if (row.skills && row.skills.length > 0) {
              const currentSkills = existingProfile.skills || [];
              const combinedSkills = Array.from(new Set([...currentSkills, ...row.skills]));
              updateData.skills = combinedSkills;
            }

            if (Object.keys(updateData).length > 0) {
              await tx.studentProfile.update({
                where: { membershipId: membership.id },
                data: updateData,
              });
            }
          }
        });

        await prisma.studentImportRow.create({
          data: {
            jobId,
            rowNumber: row.rowNumber,
            email: row.email,
            status: "SUCCESS",
          },
        });
        successCount++;
      } catch (err: any) {
        await prisma.studentImportRow.create({
          data: {
            jobId,
            rowNumber: row.rowNumber,
            email: row.email,
            status: "FAILED",
            errorMessage: err.message || "Error during transaction processing",
          },
        });
        failedCount++;
      }
    }

    const finalStatus = failedCount > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED";
    await prisma.studentImportJob.update({
      where: { id: jobId },
      data: {
        successRows: successCount,
        failedRows: failedCount,
        status: finalStatus,
      },
    });
  }
}
