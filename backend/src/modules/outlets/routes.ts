import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { requireModule } from "../../middleware/moduleGuard";
import { validate } from "../../middleware/validate";
import { enforceOutletLimit } from "../../middleware/license";
import { createOutletSchema, updateOutletSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

// GET stays open to every authenticated user — the outlet switcher in the
// app header needs it regardless of Settings > Outlets access.
router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post(
  "/",
  requireRole("ADMIN"),
  requireModule("settings.outlets"),
  enforceOutletLimit,
  validate({ body: createOutletSchema }),
  controller.create
);
router.patch(
  "/:id",
  requireRole("ADMIN"),
  requireModule("settings.outlets"),
  validate({ body: updateOutletSchema }),
  controller.update
);
router.delete("/:id", requireRole("ADMIN"), requireModule("settings.outlets"), controller.remove);

export default router;
