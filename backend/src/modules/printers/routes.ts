import { Router } from "express";
import { authenticate, requireOutletAccess } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { optionalIdQuery } from "../../lib/query";
import { createPrinterSchema, updatePrinterSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/", requireOutletAccess((req) => optionalIdQuery(req.query.outletId)), controller.list);
router.post(
  "/",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: createPrinterSchema }),
  requireOutletAccess((req) => req.body.outletId),
  controller.create
);
router.patch("/:id", requireRole("ADMIN", "MANAGER"), validate({ body: updatePrinterSchema }), controller.update);
router.delete("/:id", requireRole("ADMIN", "MANAGER"), controller.remove);
router.post("/:id/test", requireRole("ADMIN", "MANAGER"), controller.test);

export default router;
