import { NotFoundError } from "../../common/errors";
import { prisma } from "../../lib/prisma";
import { importQueue } from "../../lib/queue";

export interface ImportJobSummary {
  id: string;
  batchId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "COMPLETED_WITH_ERRORS";
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdAt: Date;
  updatedAt: Date;
  queueProgress?: number | null;
}

export interface ImportJobRowReport {
  id: string;
  rowNumber: number;
  email: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  errorMessage: string | null;
}

export class ImportService {
  static async startImportFromDB(
    batchId: string,
    fileBuffer: Buffer,
  ): Promise<string> {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { id: true, workspaceId: true },
    });

    if (!batch) {
      throw new NotFoundError(
        "The target batch does not exist.",
        "BATCH_NOT_FOUND",
      );
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

    if (importQueue) {
      await importQueue.add("process-csv", {
        jobId: job.id,
        workspaceId: batch.workspaceId,
        batchId,
        csvBase64: fileBuffer.toString("base64"),
      });
    }

    return job.id;
  }

  static async getJobSummaryFromDB(jobId: string): Promise<ImportJobSummary | null> {
    const [job, bullJob] = await Promise.all([
      prisma.studentImportJob.findUnique({ where: { id: jobId } }),
      importQueue?.getJob(jobId).catch(() => null) ?? Promise.resolve(null),
    ]);

    if (!job) {
      return null;
    }

    const progress =
      typeof bullJob?.progress === "number" ? bullJob.progress : null;

    return {
      id: job.id,
      batchId: job.batchId,
      status: job.status as any,
      totalRows: job.totalRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      queueProgress: progress,
    };
  }

  static async getJobRowsFromDB(jobId: string): Promise<ImportJobRowReport[]> {
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
}
