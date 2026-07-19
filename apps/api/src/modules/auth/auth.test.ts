jest.mock("better-auth/node", () => ({
  toNodeHandler: jest
    .fn()
    .mockImplementation(() => ((req: any, res: any) => res.status(200).send())),
}));
jest.mock("../../lib/auth", () => ({
  auth: {
    api: {},
  },
}));

import request from "supertest";
import express from "express";
import authRouter from "./auth.routes";
import { errorHandler } from "../../middleware/error";

const app = express();
app.use(express.json());
app.use("/api/v1", authRouter);
app.use(errorHandler);

jest.mock("./auth.service", () => ({
  AuthService: {
    signUp: jest.fn().mockResolvedValue({
      headers: new Map(),
      data: {
        user: {
          id: "usr_123",
          email: "mentor@studentos.com",
          name: "John Doe",
        },
        workspace: { id: "wsp_456", name: "My Academy" },
        accessToken: "sess_abc",
        refreshToken: "sess_abc",
      },
    }),
    signIn: jest.fn().mockResolvedValue({
      headers: new Map(),
      data: {
        accessToken: "sess_abc",
        refreshToken: "sess_abc",
        user: {
          id: "usr_123",
          email: "mentor@studentos.com",
          name: "John Doe",
        },
      },
    }),
    signOut: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn().mockResolvedValue({
      accessToken: "sess_xyz",
      refreshToken: "sess_xyz",
    }),
    forgotPassword: jest.fn().mockResolvedValue(undefined),
    resetPassword: jest.fn().mockResolvedValue(undefined),
    getMe: jest.fn().mockResolvedValue({
      user: { id: "usr_123", email: "mentor@studentos.com", name: "John Doe" },
      activeWorkspaceId: "wsp_456",
      memberships: [
        { workspaceId: "wsp_456", workspaceName: "My Academy", role: "MENTOR" },
      ],
    }),
  },
}));

describe("Authentication Module Integration Tests", () => {
  jest.setTimeout(30000);
  it("POST /auth/signup - successfully registers a user and workspace", async () => {
    const response = await request(app).post("/api/v1/auth/signup").send({
      email: "mentor@studentos.com",
      password: "SecurePassword123!",
      name: "John Doe",
      workspaceName: "My Academy",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe("mentor@studentos.com");
    expect(response.body.data.workspace.name).toBe("My Academy");
    expect(response.body.data.accessToken).toBe("sess_abc");
  });

  it("POST /auth/login - successfully authenticates user", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "mentor@studentos.com",
      password: "SecurePassword123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBe("sess_abc");
    expect(response.body.data.user.name).toBe("John Doe");
  });

  it("GET /auth/me - returns session context", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer sess_abc");

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("mentor@studentos.com");
    expect(response.body.data.memberships[0].role).toBe("MENTOR");
  });

  it("POST /auth/logout - successfully logs out user", async () => {
    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", "Bearer sess_abc");

    expect(response.status).toBe(200);
    expect(response.body.data.message).toBe("Logged out successfully.");
  });
});
