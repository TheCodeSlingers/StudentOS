import { ImportJobStatus, ImportRowStatus } from "@prisma/client";
import { NotFoundError } from "../../common/errors";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";
import { importQueue } from "../../lib/queue";
import {
  IImportJobRowReport,
  IImportJobSummary,
} from "@studentos/shared-types";

export class ImportService {
  static async startImport(
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

  static async getJobSummary(jobId: string): Promise<IImportJobSummary | null> {
    const [job, bullJob] = await Promise.all([
      prisma.studentImportJob.findUnique({
        where: { id: jobId },
      }),
      importQueue?.getJob(jobId).catch((err) => {
        logger.warn(
          {
            err,
            jobId,
            operation: "getJobSummary",
          },
          "Failed to fetch BullMQ job information",
        );

        return null;
      }) ?? Promise.resolve(null),
    ]);

    if (!job) {
      return null;
    }

    const progress =
      typeof bullJob?.progress === "number" ? bullJob.progress : null;

    return {
      id: job.id,
      batchId: job.batchId,
      status: job.status,
      totalRows: job.totalRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      queueProgress: progress,
    };
  }

  static async getJobRows(jobId: string): Promise<IImportJobRowReport[]> {
    const rows = await prisma.studentImportRow.findMany({
      where: { jobId },
      orderBy: { rowNumber: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      rowNumber: r.rowNumber,
      email: r.email,
      status: r.status,
      errorMessage: r.errorMessage,
    }));
  }
}
