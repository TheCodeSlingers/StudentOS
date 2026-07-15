import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { AuthController } from "./auth.controller";
import { auth } from "../../lib/auth";
import { validateRequest } from "../../common/validation";
import { authRateLimiter } from "../../middleware/rate-limit";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schema";

const router = Router();

router.post(
  "/auth/signup",
  authRateLimiter,
  validateRequest(signupSchema),
  AuthController.signUp,
);

router.post(
  "/auth/login",
  authRateLimiter,
  validateRequest(loginSchema),
  AuthController.signIn,
);

router.post("/auth/logout", AuthController.signOut);

router.post("/auth/refresh", authRateLimiter, AuthController.refresh);

router.post(
  "/auth/forgot-password",
  authRateLimiter,
  validateRequest(forgotPasswordSchema),
  AuthController.forgotPassword,
);

router.post(
  "/auth/reset-password",
  authRateLimiter,
  validateRequest(resetPasswordSchema),
  AuthController.resetPassword,
);

router.get("/auth/me", AuthController.me);

router.get("/auth/google", (_req, res) => {
  res.redirect("/api/v1/auth/login/oauth2/google");
});

router.all("/auth/*any", toNodeHandler(auth));

export default router;
