# StudentOS

StudentOS is a multi-tenant SaaS attendance and student management system.

## Prerequisites

- Node.js (v20 LTS or newer)
- npm (v10 or newer)
- Git

## Repository Structure

The project is managed as an npm monorepos workspace:
- `apps/api`: Express.js backend with TypeScript and Prisma.
- `apps/web`: Next.js web application with TypeScript.
- `packages/shared-types`: Common TypeScript definitions shared between the api and web workspaces.

## Getting Started

Follow these steps to set up the project locally:

### 1. Clone and Install

```bash
git clone https://github.com/TheCodeSlingers/StudentOS.git
cd studentos
npm install
```

### 2. Configure Environment

Create an environment configuration file in `apps/api/.env`:

```env
DATABASE_URL="your-neon-postgres-connection-string"
PORT=8000
NODE_ENV="development"
JWT_SECRET="dev-jwt-secret-change-me"
JWT_EXPIRES_IN="7d"
PLATFORM_JWT_SECRET="platform-dev-secret-change-me"
EMAIL_PROVIDER="smtp"
EMAIL_FROM="noreply@studentos.local"
```

Create an environment configuration file in `apps/web/.env`:

```env
NEXT_PUBLIC_API_URL="http://localhost:8000"
```

### 3. Generate Database Client & Seed

Generate the Prisma Client:

```bash
cd apps/api
npx prisma generate
```

Apply migrations:

```bash
npx prisma migrate dev --name init
```

Seed initial billing plans and admin credentials:

```bash
npx prisma db seed
```

### 4. Run the Application

Start both the backend API and Next.js frontend concurrently from the root directory:

```bash
npm run dev
```

- API Server: http://localhost:8000
- Next.js Web: http://localhost:3000

## Managing Packages (Monorepo Commands)

Always run package installation commands from the root directory.

### Installing a package to a specific workspace

To install a package for the API backend only:
```bash
npm install <package-name> --workspace=api
```

To install a package for the Web frontend only:
```bash
npm install <package-name> --workspace=web
```

To install a package as a development dependency in a specific workspace:
```bash
npm install <package-name> -D --workspace=api
```

### Installing a package globally in the monorepo

To install a development package (like a linter) used across all workspaces:
```bash
npm install <package-name> -D
```
