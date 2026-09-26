import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireModule } from "../../middleware/moduleGuard";
import { validate } from "../../middleware/validate";
import { createCampaignSchema } from "./validation";
import * as controller from "./controller";

const router = Router();
// Module access is authoritative here (not stacked with requireRole) so an
// admin's per-user grant can genuinely extend beyond the role default.
router.use(authenticate, requireModule("crm"));

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", validate({ body: createCampaignSchema }), controller.create);
router.post("/:id/send", controller.send);
router.post("/:id/pause", controller.pause);
router.post("/:id/resume", controller.resume);

export default router;
