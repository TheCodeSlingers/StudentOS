# StudentOS API — Architecture & Boilerplate Documentation

This document describes the modular architecture, directory layout, and common utility layers established as the boilerplate for the StudentOS API.

---

## Directory Layout

The application follows a **Modular / Feature-First** directory layout:

```
src/
├── config/
│   └── env.ts                  # Zod-validated environment config (fails fast on boot)
├── lib/
│   └── prisma.ts               # Database client singleton (Prisma Client configuration)
├── common/
│   ├── errors.ts               # Custom application error classes (mapping to HTTP status codes)
│   ├── api-response.ts         # Consistent JSON envelope formatter
│   ├── async-handler.ts        # try-catch wrapper for asynchronous Express handlers
│   └── validation.ts           # Input schema validation middleware
├── middleware/
│   ├── auth.ts                 # Identity checks stub
│   ├── permission.ts           # Access level guards stub
│   ├── upload.ts               # File upload stream controls
│   └── error.ts                # GlobalExpress exception handler
├── modules/
│   # Each directory under modules represents a self-contained feature module
│   └── [feature-module]/
│       ├── [feature].routes.ts
│       ├── [feature].controller.ts
│       ├── [feature].service.ts
│       └── [feature].schema.ts
├── utils/
│   # Global generic utility files
│   └── csv-parser.ts
└── index.ts                    # Main Express bootstrap file
```

---

## Core Layers

### 1. Environment Config (`src/config/env.ts`)

Validates environment variables on startup using Zod. If critical variables like `DATABASE_URL` are missing or malformed, the app exits immediately with an error log instead of running in a half-configured state.

### 2. Common Exceptions (`src/common/errors.ts`)

Extends the native JavaScript `Error` with HTTP metadata:

- `ApiError`: Base custom error.
- `BadRequestError`: Status 400.
- `UnauthorizedError`: Status 401.
- `ForbiddenError`: Status 403.
- `NotFoundError`: Status 404.
- `InternalServerError`: Status 500.

### 3. Route Error Wrapper (`src/common/async-handler.ts`)

Wraps Express async route handlers to catch rejected promises and forward them to the global error middleware automatically:

```typescript
export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

This eliminates the need for redundant `try-catch` blocks inside controllers.

### 4. Global Error Middleware (`src/middleware/error.ts`)

Handles formatting for all thrown errors. It intercepts `ApiError` instances and structures the response payload exactly to match the error envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error description",
    "details": {}
  }
}
```

### 5. Input Validation (`src/common/validation.ts`)

Provides a `validateRequest(schema)` middleware that intercepts incoming requests and runs validation against Zod schemas for parameters, query string parameters, or request bodies.
