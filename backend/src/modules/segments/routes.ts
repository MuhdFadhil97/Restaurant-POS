import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireModule } from "../../middleware/moduleGuard";
import { validate } from "../../middleware/validate";
import { createSegmentSchema } from "./validation";
import * as controller from "./controller";

// Customers (and therefore segments) are shared across outlets — no
// requireOutletAccess check here, same scope as the Customers module.
const router = Router();
// Module access is authoritative here (not stacked with requireRole) so an
// admin's per-user grant can genuinely extend beyond the role default.
router.use(authenticate, requireModule("crm"));

router.get("/", controller.list);
router.post("/", validate({ body: createSegmentSchema }), controller.create);
router.get("/:id/preview", controller.preview);

export default router;
