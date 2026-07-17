import { NextFunction, Response } from "express";
import { z } from "zod";
import { BadRequestError } from "./errors";

export class Validator {
  static assertRequired(value: any, message: string, code = "VALIDATION_ERROR"): void {
    if (value === undefined || value === null || value === "") {
      throw new BadRequestError(message, code);
    }
  }

  static assertPattern(
    value: string,
    pattern: RegExp,
    message: string,
    code = "VALIDATION_ERROR"
  ): void {
    if (value && !pattern.test(value)) {
      throw new BadRequestError(message, code);
    }
  }
}

export function validateRequest(schema: z.ZodObject<any>) {
  return (req: any, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      throw new BadRequestError(
        "Request validation failed",
        "VALIDATION_FAILED",
        result.error.format()
      );
    }

    next();
  };
}
