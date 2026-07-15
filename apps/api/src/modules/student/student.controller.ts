import { Request, Response } from "express";
import { StudentService } from "./student.service";
import { asyncHandler } from "../../common/async-handler";
import { ApiResponse } from "../../common/api-response";

export class StudentController {
  static enrollStudent = asyncHandler(async (req: Request, res: Response) => {
    const batchId = req.params.batchId as string;
    const body = req.body;

    const enrollment = await StudentService.enrollStudent(
      batchId,
      body.membershipId,
      body.isCR,
    );
    return ApiResponse.created(res, enrollment);
  });

  static getEnrolledStudents = asyncHandler(
    async (req: Request, res: Response) => {
      const batchId = req.params.batchId as string;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const students = await StudentService.getEnrolledStudents(
        batchId,
        page,
        limit,
      );
      return ApiResponse.success(res, students.data, 200, students.meta);
    },
  );

  static revokeEnrollment = asyncHandler(
    async (req: Request, res: Response) => {
      const batchId = req.params.batchId as string;
      const batchMembershipId = req.params.batchMembershipId as string;

      const result = await StudentService.revokeEnrollment(
        batchId,
        batchMembershipId,
      );
      return ApiResponse.success(res, result);
    },
  );

  static getStudentProfile = asyncHandler(
    async (req: Request, res: Response) => {
      const membershipId = req.params.membershipId as string;
      const profile = await StudentService.getStudentProfile(membershipId);
      return ApiResponse.success(res, profile);
    },
  );

  static updateStudentProfile = asyncHandler(
    async (req: Request, res: Response) => {
      const membershipId = req.params.membershipId as string;
      const data = req.body;

      const updatedProfile = await StudentService.updateStudentProfile(
        membershipId,
        data,
      );
      return ApiResponse.success(res, updatedProfile);
    },
  );
}
