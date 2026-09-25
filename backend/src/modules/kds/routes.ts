import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireModule } from "../../middleware/moduleGuard";
import { validate } from "../../middleware/validate";
import { queueQuerySchema, updatePrepStatusSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

// Module access is authoritative here (not stacked with requireRole) so an
// admin's per-user grant can genuinely extend beyond the role default.
router.use(authenticate, requireModule("kds"));

router.get("/queue", validate({ query: queueQuerySchema }), controller.queue);
router.patch("/items/:itemId", validate({ body: updatePrepStatusSchema }), controller.updateStatus);

export default router;
