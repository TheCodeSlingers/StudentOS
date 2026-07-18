import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../common/errors";
import { logger } from "../../lib/logger";

export class AuthService {
  static async signUp(payload: any) {
    const { email, password, name, workspaceName } = payload;

    const result = (await auth.api.signUpEmail({
      body: { email, password, name },
      returnHeaders: true,
    })) as any;

    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceName || `${name}'s Workspace`,
        settings: {
          create: { defaultAttendanceDurationMins: 15, lateThresholdMins: 10 },
        },
      },
    });

    await prisma.membership.create({
      data: {
        userId: result.response.user.id,
        workspaceId: workspace.id,
        role: "MENTOR",
        status: "ACTIVE",
      },
    });

    return {
      headers: result.headers,
      data: {
        user: {
          id: result.response.user.id,
          email: result.response.user.email,
          name: result.response.user.name,
        },
        workspace: { id: workspace.id, name: workspace.name },
        accessToken: result.response.token,
        refreshToken: result.response.token,
      },
    };
  }

  static async signIn(payload: any) {
    const { email, password } = payload;

    const result = (await auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    })) as any;

    return {
      headers: result.headers,
      data: {
        accessToken: result.response.token,
        refreshToken: result.response.token,
        user: {
          id: result.response.user.id,
          email: result.response.user.email,
          name: result.response.user.name,
        },
      },
    };
  }

  static async signOut(headers: any) {
    await auth.api.signOut({ headers }).catch((err) => {
      logger.warn(
        {
          err,
          operation: "signOut",
        },
        "Failed to sign out user",
      );
    });
  }

  static async refresh(headers: any) {
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new UnauthorizedError(
        "Session expired or invalid.",
        "UNAUTHENTICATED",
      );
    }

    return {
      accessToken: session.session.token,
      refreshToken: session.session.token,
    };
  }

  static async forgotPassword(email: string) {
    await auth.api
      .requestPasswordReset({
        body: {
          email,
          redirectTo: `${process.env.BETTER_AUTH_URL ?? ""}/auth/reset-password`,
        },
      })
      .catch((err) => {
        logger.warn(
          {
            err,
            email,
            operation: "forgotPassword",
          },
          "Password reset request failed",
        );
      });
  }

  static async resetPassword(payload: any) {
    await auth.api.resetPassword({
      body: { newPassword: payload.newPassword, token: payload.token },
    });
  }

  static async getMe(headers: any) {
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw new UnauthorizedError(
        "Authentication required.",
        "UNAUTHENTICATED",
      );
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
      activeWorkspaceId: memberships[0]?.workspaceId ?? null,
      memberships: memberships.map((m) => ({
        membershipId: m.id,
        workspaceId: m.workspaceId,
        workspaceName: m.workspace.name,
        role: m.role,
      })),
    };
  }
}
