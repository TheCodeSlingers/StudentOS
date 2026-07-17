import type { HireStatus, JobType, WorkplacePreference } from "@/lib/api-client";

export type { HireStatus, JobType, WorkplacePreference };

// Form-facing shape: skills is a comma-separated string for the text input,
// converted to/from the API's string[] at the fetch/save boundary.
export interface IStudentProfile {
  phone: string;
  address: string;
  courseName: string;
  specialization: string;
  skills: string;
  hireStatus: HireStatus;
  jobType: JobType;
  workplacePreference: WorkplacePreference;
  currentEmployer: string;
  currentPosition: string;
  portfolioUrl: string;
  linkedinUrl: string;
}
