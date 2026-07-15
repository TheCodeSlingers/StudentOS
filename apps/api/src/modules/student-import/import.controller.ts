import { Request, Response } from "express";
import { ImportService } from "./import.service";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";
import { BadRequestError, NotFoundError } from "../../common/errors";

export class ImportController {
  static importRoster = asyncHandler(async (req: any, res: Response): Promise<void> => {
    const { batchId } = req.params;
    const file = req.file;

    if (!file) {
      throw new BadRequestError("CSV file is required under the 'file' field.", "MISSING_FILE");
    }

    const jobId = await ImportService.startImport(batchId, file.buffer);

    ApiResponse.accepted(res, {
      jobId,
      status: "PENDING",
      totalRows: 0,
    });
  });

  static getSummary = asyncHandler(async (req: any, res: Response): Promise<void> => {
    const { jobId } = req.params;
    const job = await ImportService.getJobSummary(jobId);

    if (!job) {
      throw new NotFoundError("The specified import job was not found", "JOB_NOT_FOUND");
    }

    ApiResponse.success(res, job);
  });

  static getRows = asyncHandler(async (req: any, res: Response): Promise<void> => {
    const { jobId } = req.params;
    const job = await ImportService.getJobSummary(jobId);

    if (!job) {
      throw new NotFoundError("The specified import job was not found", "JOB_NOT_FOUND");
    }

    const rows = await ImportService.getJobRows(jobId);
    ApiResponse.success(res, rows);
  });
}
