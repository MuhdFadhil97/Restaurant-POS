import { Router } from "express";
import { authenticate, requireOutletAccess } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { optionalIdQuery } from "../../lib/query";
import { createTerminalSchema, updateTerminalSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/", requireOutletAccess((req) => optionalIdQuery(req.query.outletId)), controller.list);
router.get("/:id", controller.get);
router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: createTerminalSchema }),
  requireOutletAccess((req) => req.body.outletId),
  controller.create
);
router.patch("/:id", requireRole("ADMIN", "MANAGER"), validate({ body: updateTerminalSchema }), controller.update);
router.delete("/:id", requireRole("ADMIN", "MANAGER"), controller.remove);
// Any signed-in role on the device (usually a cashier) keeps the terminal "online".
router.post("/:id/heartbeat", controller.heartbeat);
router.post("/:id/regenerate-display-token", requireRole("ADMIN", "MANAGER"), controller.regenerateDisplayToken);

export default router;
