/*
  Warnings:

  - The values [ADMIN] on the enum `MembershipRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUSPENDED] on the enum `MembershipStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `deletedAt` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `inviteExpiresAt` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `inviteToken` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `invitedByMembershipId` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `ImpersonationSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrganizationSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Plan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlatformAdmin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,workspaceId,role]` on the table `Membership` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `workspaceId` to the `Membership` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('REGULAR', 'MAKEUP', 'EXAM');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'STARTED', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('SELF_SUBMITTED', 'MANUAL');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERNSHIP', 'FREELANCE', 'NOT_LOOKING');

-- CreateEnum
CREATE TYPE "WorkplacePreference" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID', 'NO_PREFERENCE');

-- CreateEnum
CREATE TYPE "HireStatus" AS ENUM ('EMPLOYED', 'JOB_SEEKING', 'FREELANCING', 'STUDENT_ONLY');

-- AlterEnum
BEGIN;
CREATE TYPE "MembershipRole_new" AS ENUM ('MENTOR', 'STUDENT');
ALTER TABLE "Membership" ALTER COLUMN "role" TYPE "MembershipRole_new" USING ("role"::text::"MembershipRole_new");
ALTER TYPE "MembershipRole" RENAME TO "MembershipRole_old";
ALTER TYPE "MembershipRole_new" RENAME TO "MembershipRole";
DROP TYPE "public"."MembershipRole_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MembershipStatus_new" AS ENUM ('ACTIVE', 'INVITED');
ALTER TABLE "public"."Membership" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Membership" ALTER COLUMN "status" TYPE "MembershipStatus_new" USING ("status"::text::"MembershipStatus_new");
ALTER TYPE "MembershipStatus" RENAME TO "MembershipStatus_old";
ALTER TYPE "MembershipStatus_new" RENAME TO "MembershipStatus";
DROP TYPE "public"."MembershipStatus_old";
ALTER TABLE "Membership" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "ImpersonationSession" DROP CONSTRAINT "ImpersonationSession_platformAdminId_fkey";

-- DropForeignKey
ALTER TABLE "ImpersonationSession" DROP CONSTRAINT "ImpersonationSession_targetUserId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_invitedByMembershipId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationSettings" DROP CONSTRAINT "OrganizationSettings_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_overriddenByPlatformAdminId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropIndex
DROP INDEX "Membership_deletedAt_idx";

-- DropIndex
DROP INDEX "Membership_inviteToken_key";

-- DropIndex
DROP INDEX "Membership_organizationId_idx";

-- DropIndex
DROP INDEX "Membership_organizationId_role_idx";

-- DropIndex
DROP INDEX "Membership_userId_organizationId_role_key";

-- DropIndex
DROP INDEX "User_deletedAt_idx";

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "deletedAt",
DROP COLUMN "inviteExpiresAt",
DROP COLUMN "inviteToken",
DROP COLUMN "invitedByMembershipId",
DROP COLUMN "organizationId",
ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "deletedAt";

-- DropTable
DROP TABLE "ImpersonationSession";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "OrganizationSettings";

-- DropTable
DROP TABLE "Plan";

-- DropTable
DROP TABLE "PlatformAdmin";

-- DropTable
DROP TABLE "Subscription";

-- DropEnum
DROP TYPE "PlatformAdminRole";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "defaultAttendanceDurationMins" INTEGER NOT NULL DEFAULT 15,
    "lateThresholdMins" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "avatarUrl" TEXT,
    "courseName" TEXT,
    "specialization" TEXT,
    "skills" TEXT[],
    "hireStatus" "HireStatus" NOT NULL DEFAULT 'STUDENT_ONLY',
    "jobType" "JobType" NOT NULL DEFAULT 'NOT_LOOKING',
    "workplacePreference" "WorkplacePreference" NOT NULL DEFAULT 'NO_PREFERENCE',
    "currentEmployer" TEXT,
    "currentPosition" TEXT,
    "portfolioUrl" TEXT,
    "linkedinUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "capacity" INTEGER,
    "defaultMeetLink" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "lateThresholdMinsOverride" INTEGER,
    "attendanceDurationMinsOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchMembership" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "isCR" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "BatchMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "meetLink" TEXT,
    "type" "SessionType" NOT NULL DEFAULT 'REGULAR',
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "attendanceOpenedAt" TIMESTAMP(3),
    "attendanceOpenedById" TEXT,
    "attendanceClosedAt" TIMESTAMP(3),
    "attendanceClosedById" TEXT,
    "currentCode" TEXT,
    "codeRotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentBatchMembershipId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "method" "AttendanceMethod" NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "markedById" TEXT,
    "manualReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSettings_workspaceId_key" ON "WorkspaceSettings"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_membershipId_key" ON "StudentProfile"("membershipId");

-- CreateIndex
CREATE INDEX "StudentProfile_specialization_idx" ON "StudentProfile"("specialization");

-- CreateIndex
CREATE INDEX "StudentProfile_hireStatus_idx" ON "StudentProfile"("hireStatus");

-- CreateIndex
CREATE INDEX "StudentProfile_jobType_idx" ON "StudentProfile"("jobType");

-- CreateIndex
CREATE INDEX "Batch_workspaceId_idx" ON "Batch"("workspaceId");

-- CreateIndex
CREATE INDEX "Batch_isArchived_idx" ON "Batch"("isArchived");

-- CreateIndex
CREATE INDEX "BatchMembership_batchId_idx" ON "BatchMembership"("batchId");

-- CreateIndex
CREATE INDEX "BatchMembership_membershipId_idx" ON "BatchMembership"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchMembership_membershipId_batchId_key" ON "BatchMembership"("membershipId", "batchId");

-- CreateIndex
CREATE INDEX "Session_batchId_idx" ON "Session"("batchId");

-- CreateIndex
CREATE INDEX "Session_scheduledStart_idx" ON "Session"("scheduledStart");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Attendance_sessionId_idx" ON "Attendance"("sessionId");

-- CreateIndex
CREATE INDEX "Attendance_studentBatchMembershipId_idx" ON "Attendance"("studentBatchMembershipId");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_sessionId_studentBatchMembershipId_key" ON "Attendance"("sessionId", "studentBatchMembershipId");

-- CreateIndex
CREATE INDEX "Membership_workspaceId_idx" ON "Membership"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_workspaceId_role_key" ON "Membership"("userId", "workspaceId", "role");

-- AddForeignKey
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMembership" ADD CONSTRAINT "BatchMembership_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMembership" ADD CONSTRAINT "BatchMembership_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentBatchMembershipId_fkey" FOREIGN KEY ("studentBatchMembershipId") REFERENCES "BatchMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
