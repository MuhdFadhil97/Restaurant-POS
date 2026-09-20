import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import {
  createPurchaseOrderSchema,
  listQuerySchema,
  rejectPurchaseOrderSchema,
  updatePurchaseOrderSchema,
} from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/", validate({ query: listQuerySchema }), controller.list);
router.get("/:id", controller.getOne);
router.get("/:id/pdf", controller.getPdf);
router.post("/", validate({ body: createPurchaseOrderSchema }), controller.create);
router.patch("/:id", validate({ body: updatePurchaseOrderSchema }), controller.update);
router.delete("/:id", controller.remove);
router.post("/:id/submit-for-approval", controller.submitForApproval);
router.post("/:id/approve", requireRole("ADMIN"), controller.approve);
router.post("/:id/reject", requireRole("ADMIN"), validate({ body: rejectPurchaseOrderSchema }), controller.reject);
router.post("/:id/mark-ordered", controller.markOrdered);
router.post("/:id/cancel", controller.cancel);

export default router;
