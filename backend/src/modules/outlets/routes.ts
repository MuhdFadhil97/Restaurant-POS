import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { enforceOutletLimit } from "../../middleware/license";
import { createOutletSchema, updateOutletSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post(
  "/",
  requireRole("ADMIN"),
  enforceOutletLimit,
  validate({ body: createOutletSchema }),
  controller.create
);
router.patch("/:id", requireRole("ADMIN"), validate({ body: updateOutletSchema }), controller.update);
router.delete("/:id", requireRole("ADMIN"), controller.remove);

export default router;
