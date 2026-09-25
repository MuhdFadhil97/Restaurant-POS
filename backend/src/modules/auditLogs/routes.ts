import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { requireModule } from "../../middleware/moduleGuard";
import { validate } from "../../middleware/validate";
import { auditLogQuerySchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN"), requireModule("settings.auditLog"));
router.get("/", validate({ query: auditLogQuerySchema }), controller.list);

export default router;
