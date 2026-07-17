# StudentOS — Developer Onboarding Guide

This guide describes how to set up the StudentOS development environment.

## 1. Prerequisites

Ensure you have the following installed on your machine:

- Node.js (v20 LTS or newer)
- npm (v10 or newer)
- Git

We use npm workspaces for monorepo package management.

## 2. Setup Database

We use Neon (Postgres) as our cloud database provider.

1. Obtain your connection string from the Neon dashboard.
2. In production and local development, we configure the database settings via environment variables.

## 3. Environment Variables

Create your local environment configuration file:

- Create `apps/api/.env` and copy variables from `apps/api/.env.example`.
- Fill in the `DATABASE_URL` with your Neon database connection string.

Example contents for `apps/api/.env`:
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
PORT=8000
NODE_ENV="development"
JWT_SECRET="dev-jwt-secret-change-me"
JWT_EXPIRES_IN="7d"
PLATFORM_JWT_SECRET="platform-dev-secret-change-me"
EMAIL_PROVIDER="smtp"
EMAIL_FROM="noreply@studentos.local"

Create `apps/web/.env` and copy variables from `apps/web/.env.example`:
NEXT_PUBLIC_API_URL="http://localhost:8000"

## 4. Installation and Setup

From the project root directory, run:

```bash
npm install
```

Generate the Prisma client:

```bash
cd apps/api
npx prisma generate
```

Apply the initial database schema migration:

```bash
npx prisma migrate dev --name init
```

Seed the database with default billing plans and the initial superadmin user:

```bash
npx prisma db seed
```

## 5. Development Workflow

Start both the backend API and Next.js frontend concurrently from the root directory:

```bash
npm run dev
```

- API Server: http://localhost:8000
- Next.js Web: http://localhost:3000

## 6. Monorepo Command Reference

- Build the whole workspace: `npm run build`
- Install a new package to the API server only: `npm install <package-name> --workspace=api`
- Install a new package to the Web client only: `npm install <package-name> --workspace=web`
- Install a new package to the root workspace: `npm install <package-name> -D`
- Reset database schema: `npx prisma migrate reset`
