import { ImportJobStatus, ImportRowStatus } from "@prisma/client";

export interface IImportJobSummary {
  id: string;
  batchId: string;
  status: ImportJobStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdAt: Date;
  updatedAt: Date;
  queueProgress?: number | null;
}

export interface IImportJobRowReport {
  id: string;
  rowNumber: number;
  email: string;
  status: ImportRowStatus;
  errorMessage: string | null;
}
