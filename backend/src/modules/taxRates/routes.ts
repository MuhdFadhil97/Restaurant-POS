import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { requireModule } from "../../middleware/moduleGuard";
import { validate } from "../../middleware/validate";
import { createTaxRateSchema, updateTaxRateSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

// GET stays open — checkout tax calculation needs it regardless of Settings access.
router.get("/", controller.list);
router.post(
  "/",
  requireRole("ADMIN"),
  requireModule("settings.taxRates"),
  validate({ body: createTaxRateSchema }),
  controller.create
);
router.patch(
  "/:id",
  requireRole("ADMIN"),
  requireModule("settings.taxRates"),
  validate({ body: updateTaxRateSchema }),
  controller.update
);
router.delete("/:id", requireRole("ADMIN"), requireModule("settings.taxRates"), controller.remove);

export default router;
