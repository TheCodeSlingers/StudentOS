class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, any>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ApiError;
