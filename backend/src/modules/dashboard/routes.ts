import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { dashboardSummaryQuerySchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/summary", validate({ query: dashboardSummaryQuerySchema }), controller.summary);

export default router;
