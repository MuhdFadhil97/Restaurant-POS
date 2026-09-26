import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/auth";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

// Unauthenticated by nature (that's the point) — rate-limited to blunt
// account-enumeration probing and reset-email spam.
const authLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post("/login", authLimiter, validate({ body: loginSchema }), controller.login);
router.post("/forgot-password", authLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);
router.post("/reset-password", authLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);
router.get("/me", authenticate, controller.me);

export default router;
