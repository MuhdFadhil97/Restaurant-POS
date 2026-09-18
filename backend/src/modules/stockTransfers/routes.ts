import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createTransferSchema, listQuerySchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/", validate({ query: listQuerySchema }), controller.list);
router.get("/:id", controller.getOne);
router.post("/", validate({ body: createTransferSchema }), controller.create);
router.post("/:id/send", controller.send);
router.post("/:id/receive", controller.receive);
router.post("/:id/cancel", controller.cancel);

export default router;
