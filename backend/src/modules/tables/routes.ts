import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createTableSchema, saveLayoutSchema, updateTableSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/", controller.list);
router.post("/", requireRole("ADMIN", "MANAGER"), validate({ body: createTableSchema }), controller.create);
// Must be registered before "/:id" — otherwise Express matches "layout" as the :id param.
router.patch(
  "/layout",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: saveLayoutSchema }),
  controller.saveLayout
);
router.patch("/:id", validate({ body: updateTableSchema }), controller.update);
router.delete("/:id", requireRole("ADMIN", "MANAGER"), controller.remove);

export default router;
