import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireModule } from "../../middleware/moduleGuard";
import { validate } from "../../middleware/validate";
import { dashboardSummaryQuerySchema } from "./validation";
import * as controller from "./controller";

const router = Router();

// Module access is authoritative here (not stacked with requireRole) so an
// admin's per-user grant can genuinely extend beyond the role default.
router.use(authenticate, requireModule("dashboard"));

router.get("/summary", validate({ query: dashboardSummaryQuerySchema }), controller.summary);

export default router;
