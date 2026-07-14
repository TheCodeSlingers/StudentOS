import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const mentorUser = await prisma.user.upsert({
    where: { email: "mentor@studentos.com" },
    update: {},
    create: {
      email: "mentor@studentos.com",
      name: "Default Mentor",
      passwordHash: "Mentor123!",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "workspace_default" },
    update: {},
    create: {
      id: "workspace_default",
      name: "Default Workspace",
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
      userId_workspaceId_role: {
        userId: mentorUser.id,
        workspaceId: workspace.id,
        role: "MENTOR",
      },
    },
    update: {},
    create: {
      userId: mentorUser.id,
      workspaceId: workspace.id,
      role: "MENTOR",
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