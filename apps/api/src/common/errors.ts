export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, code = "BAD_REQUEST", details?: any) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(
    message = "Authentication is required to access this resource.",
    code = "UNAUTHENTICATED"
  ) {
    super(401, code, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You do not have permission to perform this action.", code = "FORBIDDEN") {
    super(403, code, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, code = "NOT_FOUND") {
    super(404, code, message);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "An internal server error occurred.", code = "INTERNAL_SERVER_ERROR") {
    super(500, code, message);
  }
}
