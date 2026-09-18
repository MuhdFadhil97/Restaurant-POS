import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { stockAdjustmentSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/movements", controller.listMovements);
router.get("/low-stock", controller.lowStock);
router.post(
  "/adjustments",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: stockAdjustmentSchema }),
  controller.adjust
);

export default router;
