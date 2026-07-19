import { SessionStatus, SessionType } from "@prisma/client";

export interface ICreateSessionPayload {
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  meetLink?: string;
  description?: string;
  type?: SessionType;
}

export interface IUpdateSessionPayload {
  title?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  meetLink?: string | null;
  description?: string | null;
  type?: SessionType;
}

export interface ISessionListItem {
  id: string;
  batchId: string;
  title: string;
  status: SessionStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
}

export interface ISessionDetail {
  id: string;
  batchId: string;
  title: string;
  description: string | null;
  status: SessionStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  meetLink: string | null;
  type: SessionType;
  attendanceOpenedAt: Date | null;
  attendanceClosedAt: Date | null;
  currentCode?: string | null;
}

export interface ISessionUpdateResult {
  id: string;
  title: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  meetLink: string | null;
  description: string | null;
  type: SessionType;
}

export interface IOpenAttendanceResult {
  sessionId: string;
  status: "STARTED";
  attendanceOpenedAt: Date;
  currentCode: string;
}

export interface ICloseAttendanceResult {
  sessionId: string;
  status: "ENDED";
  attendanceClosedAt: Date;
  currentCode: null;
}
