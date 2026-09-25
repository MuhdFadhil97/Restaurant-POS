import { Router } from "express";
import { authenticate, requireOutletAccess } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { optionalIdQuery } from "../../lib/query";
import { createPlatformSchema, updatePlatformSchema } from "./validation";
import * as controller from "./controller";

// A platform's api key / webhook secret is a credential, so only ADMIN
// manages it — same call as PrintBridge (see printBridge/routes.ts).
const router = Router();
router.use(authenticate, requireRole("ADMIN"));
router.get("/", requireOutletAccess((req) => optionalIdQuery(req.query.outletId)), controller.list);
router.post(
  "/",
  validate({ body: createPlatformSchema }),
  requireOutletAccess((req) => req.body.outletId),
  controller.create
);
router.patch("/:id", validate({ body: updatePlatformSchema }), controller.update);
router.delete("/:id", controller.remove);

export default router;
