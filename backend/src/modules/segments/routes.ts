import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createSegmentSchema } from "./validation";
import * as controller from "./controller";

// Customers (and therefore segments) are shared across outlets — no
// requireOutletAccess check here, same scope as the Customers module.
const router = Router();
router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/", controller.list);
router.post("/", validate({ body: createSegmentSchema }), controller.create);
router.get("/:id/preview", controller.preview);

export default router;
