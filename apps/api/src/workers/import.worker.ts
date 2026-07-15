import { Worker, Job } from "bullmq";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { parseCSV, CSVRow } from "../utils/csv-parser";
import { logger } from "../lib/logger";

export interface ImportJobData {
  jobId: string;
  workspaceId: string;
  batchId: string;
  csvBase64: string;
}

export function startImportWorker(): Worker | null {
  if (!env.UPSTASH_REDIS_URL) {
    logger.warn(
      "BullMQ Redis connection not configured — import worker disabled.",
    );
    return null;
  }

  const connectionOpts = {
    url: env.UPSTASH_REDIS_URL,
    tls: {},
  };

  const worker = new Worker<ImportJobData>(
    "student-import",
    async (job: Job<ImportJobData>) => {
      const { jobId, workspaceId, batchId, csvBase64 } = job.data;
      const fileBuffer = Buffer.from(csvBase64, "base64");

      logger.info({ jobId, batchId }, "Import job started");

      await prisma.studentImportJob.update({
        where: { id: jobId },
        data: { status: "PROCESSING" },
      });

      let rows: CSVRow[] = [];

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
        logger.error({ jobId, err }, "CSV parse failed");
        return;
      }

      await prisma.studentImportJob.update({
        where: { id: jobId },
        data: { totalRows: rows.length },
      });

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          await prisma.$transaction(async (tx) => {
            let user = await tx.user.findUnique({
              where: { email: row.email },
            });

            if (!user) {
              user = await tx.user.create({
                data: { email: row.email, name: row.name },
              });
            }

            let membership = await tx.membership.findFirst({
              where: { workspaceId, userId: user.id },
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
              where: { batchId, membershipId: membership.id },
            });

            if (!batchMembership) {
              batchMembership = await tx.batchMembership.create({
                data: { batchId, membershipId: membership.id, isCR: false },
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
              if (row.specialization)
                updateData.specialization = row.specialization;
              if (row.skills && row.skills.length > 0) {
                const combined = Array.from(
                  new Set([...(existingProfile.skills || []), ...row.skills]),
                );
                updateData.skills = combined;
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
              errorMessage:
                err.message || "Error during transaction processing",
            },
          });
          failedCount++;
          logger.warn({ jobId, row: row.rowNumber, err }, "Import row failed");
        }

        await job.updateProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      const finalStatus =
        failedCount > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED";
      await prisma.studentImportJob.update({
        where: { id: jobId },
        data: {
          successRows: successCount,
          failedRows: failedCount,
          status: finalStatus,
        },
      });

      logger.info(
        { jobId, successCount, failedCount, finalStatus },
        "Import job completed",
      );
    },
    {
      connection: connectionOpts as any,
      concurrency: 2,
    },
  );

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.data?.jobId, err },
      "Import job failed after all retries",
    );
  });

  logger.info("Import worker started");
  return worker;
}
