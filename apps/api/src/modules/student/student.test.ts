jest.setTimeout(30000);
import request from "supertest";
import express from "express";
import studentRouter from "./student.routes";
import { errorHandler } from "../../middleware/error";

const app = express();
app.use(express.json());
app.use("/api/v1", studentRouter);
app.use(errorHandler);

// Mock authentication and permissions to focus on module logic
jest.mock("../../middleware/auth", () => ({
  authMiddleware: (req: any, res: any, next: any) => next(),
}));
jest.mock("../../middleware/permission", () => ({
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

// Mock the service to avoid hitting the actual database during these tests
jest.mock("./student.service", () => ({
  StudentService: {
    enrollStudentIntoDB: jest
      .fn()
      .mockResolvedValue({
        id: "enrollment_1",
        batchId: "b1",
        membershipId: "m1",
      }),
    getEnrolledStudentsFromDB: jest
      .fn()
      .mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }),
    revokeEnrollmentIntoDB: jest
      .fn()
      .mockResolvedValue({ id: "enrollment_1", revokedAt: new Date() }),
    getStudentProfileFromDB: jest
      .fn()
      .mockResolvedValue({
        id: "m1",
        user: { name: "Test" },
        studentProfile: {},
      }),
    updateStudentProfileIntoDB: jest
      .fn()
      .mockResolvedValue({ id: "profile_1", hireStatus: "EMPLOYED" }),
  },
}));

describe("Student Module Integration Tests", () => {
  describe("Enrollment Endpoints", () => {
    it("POST /batches/:batchId/students - successfully enrolls a student", async () => {
      const response = await request(app)
        .post("/api/v1/batches/b1/students")
        .send({ membershipId: "m1", isCR: true });

      expect(response.status).toBe(201);
      expect(response.body.data.membershipId).toBe("m1");
    });

    it("POST /batches/:batchId/students - fails validation when membershipId is missing", async () => {
      const response = await request(app)
        .post("/api/v1/batches/b1/students")
        .send({ isCR: true });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  describe("Profile Endpoints", () => {
    it("GET /students/:membershipId/profile - retrieves a profile", async () => {
      const response = await request(app).get("/api/v1/students/m1/profile");

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe("m1");
    });

    it("PATCH /students/:membershipId/profile - updates a profile with valid data", async () => {
      const response = await request(app)
        .patch("/api/v1/students/m1/profile")
        .send({
          hireStatus: "EMPLOYED",
          linkedinUrl: "https://linkedin.com/in/test",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.hireStatus).toBe("EMPLOYED");
    });

    it("PATCH /students/:membershipId/profile - fails validation with invalid url", async () => {
      const response = await request(app)
        .patch("/api/v1/students/m1/profile")
        .send({ linkedinUrl: "not-a-url" });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_FAILED");
    });
  });
});
