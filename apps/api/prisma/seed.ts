import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const freePlan = await prisma.plan.upsert({
    where: { name: "Free" },
    update: {},
    create: {
      name: "Free",
      maxBatches: 1,
      maxStudents: 30,
      maxEmployees: 2,
      priceCents: 0,
      featureFlags: {
        dynamicReportBuilder: false,
        discordWebhooks: false,
        fraudReviewPrioritization: false,
        csvExport: true,
        excelExport: false,
      },
    },
  });

  const starterPlan = await prisma.plan.upsert({
    where: { name: "Starter" },
    update: {},
    create: {
      name: "Starter",
      maxBatches: 3,
      maxStudents: 150,
      maxEmployees: 5,
      priceCents: 1900,
      featureFlags: {
        dynamicReportBuilder: false,
        discordWebhooks: true,
        fraudReviewPrioritization: false,
        csvExport: true,
        excelExport: true,
      },
    },
  });

  const growthPlan = await prisma.plan.upsert({
    where: { name: "Growth" },
    update: {},
    create: {
      name: "Growth",
      maxBatches: 10,
      maxStudents: 500,
      maxEmployees: 15,
      priceCents: 4900,
      featureFlags: {
        dynamicReportBuilder: true,
        discordWebhooks: true,
        fraudReviewPrioritization: true,
        csvExport: true,
        excelExport: true,
      },
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@studentos.com" },
    update: {},
    create: {
      email: "admin@studentos.com",
      name: "Super Admin",
      passwordHash: "Admin123!",
    },
  });

  const org = await prisma.organization.upsert({
    where: { id: "org_default" },
    update: {},
    create: {
      id: "org_default",
      name: "StudentOS Demo Org",
      timezone: "UTC",
      settings: {
        create: {
          defaultAttendanceDurationMins: 15,
          lateThresholdMins: 10,
        },
      },
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId_role: {
        userId: adminUser.id,
        organizationId: org.id,
        role: "ADMIN",
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: org.id,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      planId: freePlan.id,
      status: "ACTIVE",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
