import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { ApiResponse } from "../../common/api-response";
import { asyncHandler } from "../../common/async-handler";

export class AuthController {
  static signUp = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = await AuthService.signUp(req.body);

      result.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });

      ApiResponse.created(res, result.data);
    },
  );

  static signIn = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = await AuthService.signIn(req.body);

      result.headers.forEach((value: string, key: string) => {
        res.setHeader(key, value);
      });

      ApiResponse.success(res, result.data);
    },
  );

  static signOut = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      await AuthService.signOut(req.headers);
      ApiResponse.success(res, { message: "Logged out successfully." });
    },
  );

  static refresh = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const data = await AuthService.refresh(req.headers);
      ApiResponse.success(res, data);
    },
  );

  static forgotPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      await AuthService.forgotPassword(req.body.email);
      ApiResponse.success(res, {
        message: "Password reset link sent to your email.",
      });
    },
  );

  static resetPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      await AuthService.resetPassword(req.body);
      ApiResponse.success(res, {
        message: "Password has been reset successfully.",
      });
    },
  );

  static me = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const data = await AuthService.getMe(req.headers);
      ApiResponse.success(res, data);
    },
  );
}
