import { HireStatus, JobType, WorkplacePreference } from "@prisma/client";

export interface IUpdateProfilePayload {
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  courseName?: string | null;
  specialization?: string | null;
  skills?: string[];
  hireStatus?: HireStatus;
  jobType?: JobType;
  workplacePreference?: WorkplacePreference;
  currentEmployer?: string | null;
  currentPosition?: string | null;
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
}

export interface IEnrollResult {
  id: string;
  batchId: string;
  membershipId: string;
  isCR: boolean;
  assignedAt: Date;
  revokedAt: Date | null;
}

export interface IRevokeResult {
  id: string;
  batchId: string;
  membershipId: string;
  isCR: boolean;
  assignedAt: Date;
  revokedAt: Date | null;
}

export interface IStudentProfileResult {
  id: string;
  role: string;
  user: {
    name: string;
    email: string;
  };
  studentProfile: {
    id: string;
    phone: string | null;
    address: string | null;
    avatarUrl: string | null;
    courseName: string | null;
    specialization: string | null;
    skills: string[];
    hireStatus: string;
    jobType: string;
    workplacePreference: string;
    currentEmployer: string | null;
    currentPosition: string | null;
    portfolioUrl: string | null;
    linkedinUrl: string | null;
  } | null;
}

export interface IEnrolledStudentItem {
  id: string;
  batchId: string;
  membershipId: string;
  isCR: boolean;
  assignedAt: Date;
  membership: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    studentProfile: {
      id: string;
      phone: string | null;
      courseName: string | null;
      specialization: string | null;
      skills: string[];
    } | null;
  };
}

export interface IEnrolledStudentsResult {
  data: IEnrolledStudentItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
