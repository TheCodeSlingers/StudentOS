// Enums matching your Prisma Schema
export enum HireStatus {
  STUDENT_ONLY = "STUDENT_ONLY",
  ACTIVELY_LOOKING = "ACTIVELY_LOOKING",
  EMPLOYED = "EMPLOYED"
}

export enum JobType {
  NOT_LOOKING = "NOT_LOOKING",
  INTERNSHIP = "INTERNSHIP",
  FULL_TIME = "FULL_TIME",
  PART_TIME = "PART_TIME"
}

export enum WorkplacePreference {
  NO_PREFERENCE = "NO_PREFERENCE",
  REMOTE = "REMOTE",
  HYBRID = "HYBRID",
  ON_SITE = "ON_SITE"
}

// Main Interface mapping to the StudentProfile model
export interface IStudentProfile {
  phone: string;
  address: string;
  courseName: string;
  specialization: string;
  skills: string; // Storing as comma-separated string for the form input
  hireStatus: HireStatus;
  jobType: JobType;
  workplacePreference: WorkplacePreference;
  currentEmployer: string;
  currentPosition: string;
  portfolioUrl: string;
  linkedinUrl: string;
}