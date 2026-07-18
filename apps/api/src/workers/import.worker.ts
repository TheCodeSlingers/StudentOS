import { Worker, Job } from "bullmq";
import {
  Prisma,
  MembershipRole,
  MembershipStatus,
  HireStatus,
  JobType,
  WorkplacePreference,
  ImportRowStatus,
} from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { parseCSV, CSVRow } from "../utils/csv-parser";
import { logger } from "../lib/logger";

export interface IImportJobData {
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

  const worker = new Worker<IImportJobData>(
    "student-import",
    async (job: Job<IImportJobData>) => {
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
        } catch (err: unknown) {
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
            errorMessage: (err as Error).message || "Failed to parse CSV file",
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
      const importRowsToCreate: Prisma.StudentImportRowCreateManyInput[] = [];

      const chunkSize = 50;
      let lastProgress = 0;

      for (let chunkIndex = 0; chunkIndex < rows.length; chunkIndex += chunkSize) {
        const chunk = rows.slice(chunkIndex, chunkIndex + chunkSize);
        const emails = chunk.map((r) => r.email).filter(Boolean);

        try {
          const existingUsers = await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { id: true, email: true },
          });
          const existingUserEmails = new Set(existingUsers.map((u) => u.email));

          const usersToCreate = chunk
            .filter((r) => !existingUserEmails.has(r.email))
            .map((r) => ({ email: r.email, name: r.name }));

          if (usersToCreate.length > 0) {
            await prisma.user.createMany({
              data: usersToCreate,
              skipDuplicates: true,
            });
          }

          const chunkUsers = await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { id: true, email: true },
          });
          const userMap = new Map(chunkUsers.map((u) => [u.email, u.id]));

          const userIds = Array.from(userMap.values());
          const existingMemberships = await prisma.membership.findMany({
            where: { workspaceId, userId: { in: userIds } },
            select: { id: true, userId: true },
          });
          const existingMembershipUserIds = new Set(existingMemberships.map((m) => m.userId));

          const membershipsToCreate = userIds
            .filter((uid) => !existingMembershipUserIds.has(uid))
            .map((uid) => ({
              workspaceId,
              userId: uid,
              role: MembershipRole.STUDENT,
              status: MembershipStatus.ACTIVE,
            }));

          if (membershipsToCreate.length > 0) {
            await prisma.membership.createMany({
              data: membershipsToCreate,
              skipDuplicates: true,
            });
          }

          const chunkMemberships = await prisma.membership.findMany({
            where: { workspaceId, userId: { in: userIds } },
            select: { id: true, userId: true },
          });
          const membershipMap = new Map(chunkMemberships.map((m) => [m.userId, m.id]));

          const membershipIds = Array.from(membershipMap.values());
          const existingBatchMembers = await prisma.batchMembership.findMany({
            where: { batchId, membershipId: { in: membershipIds } },
            select: { id: true, membershipId: true },
          });
          const existingBatchMemberIds = new Set(existingBatchMembers.map((bm) => bm.membershipId));

          const batchMembersToCreate = membershipIds
            .filter((mid) => !existingBatchMemberIds.has(mid))
            .map((mid) => ({
              batchId,
              membershipId: mid,
              isCR: false,
            }));

          if (batchMembersToCreate.length > 0) {
            await prisma.batchMembership.createMany({
              data: batchMembersToCreate,
              skipDuplicates: true,
            });
          }

          const existingProfiles = await prisma.studentProfile.findMany({
            where: { membershipId: { in: membershipIds } },
            select: { id: true, membershipId: true, skills: true },
          });
          const existingProfileMap = new Map(existingProfiles.map((p) => [p.membershipId, p]));

          const profilesToCreate: Prisma.StudentProfileCreateManyInput[] = [];
          const profilesToUpdate: { membershipId: string; updateData: Prisma.StudentProfileUpdateInput }[] = [];

          for (const row of chunk) {
            const userId = userMap.get(row.email);
            if (!userId) continue;
            const membershipId = membershipMap.get(userId);
            if (!membershipId) continue;

            const existingProfile = existingProfileMap.get(membershipId);

            if (!existingProfile) {
              profilesToCreate.push({
                membershipId,
                phone: row.phone || null,
                courseName: row.courseName || null,
                specialization: row.specialization || null,
                skills: row.skills || [],
                hireStatus: HireStatus.STUDENT_ONLY,
                jobType: JobType.NOT_LOOKING,
                workplacePreference: WorkplacePreference.NO_PREFERENCE,
              });
            } else {
              const updateData: Prisma.StudentProfileUpdateInput = {};
              let hasUpdates = false;
              if (row.phone) {
                updateData.phone = row.phone;
                hasUpdates = true;
              }
              if (row.courseName) {
                updateData.courseName = row.courseName;
                hasUpdates = true;
              }
              if (row.specialization) {
                updateData.specialization = row.specialization;
                hasUpdates = true;
              }
              if (row.skills && row.skills.length > 0) {
                const combined = Array.from(
                  new Set([...(existingProfile.skills || []), ...row.skills]),
                );
                updateData.skills = combined;
                hasUpdates = true;
              }

              if (hasUpdates) {
                profilesToUpdate.push({
                  membershipId,
                  updateData,
                });
              }
            }
          }

          if (profilesToCreate.length > 0) {
            await prisma.studentProfile.createMany({
              data: profilesToCreate,
              skipDuplicates: true,
            });
          }

          if (profilesToUpdate.length > 0) {
            await Promise.all(
              profilesToUpdate.map((p) =>
                prisma.studentProfile.update({
                  where: { membershipId: p.membershipId },
                  data: p.updateData,
                }),
              ),
            );
          }

          for (const row of chunk) {
            importRowsToCreate.push({
              jobId,
              rowNumber: row.rowNumber,
              email: row.email,
              status: ImportRowStatus.SUCCESS,
            });
            successCount++;
          }
      } catch (err: unknown) {
          for (const row of chunk) {
            importRowsToCreate.push({
              jobId,
              rowNumber: row.rowNumber,
              email: row.email,
              status: ImportRowStatus.FAILED,
              errorMessage: (err as Error).message || "Bulk transaction failure",
            });
            failedCount++;
          }
          logger.warn({ jobId, chunkIndex, err }, "Import chunk processing failed");
        }

        const currentProgress = Math.round(
          (Math.min(chunkIndex + chunkSize, rows.length) / rows.length) * 100,
        );
        if (currentProgress > lastProgress) {
          lastProgress = currentProgress;
          await job.updateProgress(currentProgress);
        }
      }

      if (importRowsToCreate.length > 0) {
        await prisma.studentImportRow.createMany({
          data: importRowsToCreate,
        });
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
      connection: connectionOpts as import("ioredis").RedisOptions,
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
