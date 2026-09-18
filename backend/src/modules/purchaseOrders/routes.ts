import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createPurchaseOrderSchema, listQuerySchema, receiveSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/", validate({ query: listQuerySchema }), controller.list);
router.get("/:id", controller.getOne);
router.post("/", validate({ body: createPurchaseOrderSchema }), controller.create);
router.post("/:id/mark-ordered", controller.markOrdered);
router.post("/:id/cancel", controller.cancel);
router.post("/:id/receive", validate({ body: receiveSchema }), controller.receive);

export default router;
