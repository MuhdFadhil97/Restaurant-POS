import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createCampaignSchema } from "./validation";
import * as controller from "./controller";

const router = Router();
router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", validate({ body: createCampaignSchema }), controller.create);
router.post("/:id/send", controller.send);

export default router;
