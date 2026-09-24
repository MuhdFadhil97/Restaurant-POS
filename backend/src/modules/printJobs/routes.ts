import { Router } from "express";
import { authenticate, requireOutletAccess } from "../../middleware/auth";
import { optionalIdQuery } from "../../lib/query";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/", requireOutletAccess((req) => optionalIdQuery(req.query.outletId)), controller.list);
router.get("/:id", controller.get);
// Cashiers can retry too — a jammed receipt printer is usually fixed at the counter.
router.post("/:id/retry", controller.retry);

export default router;
