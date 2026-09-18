import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { queueQuerySchema, updatePrepStatusSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER", "CASHIER", "KITCHEN"));

router.get("/queue", validate({ query: queueQuerySchema }), controller.queue);
router.patch("/items/:itemId", validate({ body: updatePrepStatusSchema }), controller.updateStatus);

export default router;
