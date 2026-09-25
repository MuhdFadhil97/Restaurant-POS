import { Router } from "express";
import { authenticate, requireOutletAccess } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { optionalIdQuery } from "../../lib/query";
import { createRunSchema } from "./validation";
import * as controller from "./controller";

// Financial export, so ADMIN/MANAGER only — same bar as the Reports module.
const router = Router();
router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/runs", requireOutletAccess((req) => optionalIdQuery(req.query.outletId)), controller.list);
router.post(
  "/runs",
  validate({ body: createRunSchema }),
  requireOutletAccess((req) => req.body.outletId),
  controller.create
);
router.get("/runs/:id/download", controller.download);

export default router;
