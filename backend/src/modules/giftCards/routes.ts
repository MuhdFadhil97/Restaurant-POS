import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { adjustGiftCardSchema, createGiftCardSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/lookup", controller.lookup);
router.get("/", requireRole("ADMIN", "MANAGER"), controller.list);
router.post("/", requireRole("ADMIN", "MANAGER"), validate({ body: createGiftCardSchema }), controller.create);
router.patch("/:id", requireRole("ADMIN", "MANAGER"), validate({ body: adjustGiftCardSchema }), controller.adjust);

export default router;
