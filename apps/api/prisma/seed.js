"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
