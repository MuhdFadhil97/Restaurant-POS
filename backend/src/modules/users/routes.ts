import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { requireModule } from "../../middleware/moduleGuard";
import { validate } from "../../middleware/validate";
import { enforceUserLimit } from "../../middleware/license";
import { createUserSchema, updateUserSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN"), requireModule("settings.users"));

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", enforceUserLimit, validate({ body: createUserSchema }), controller.create);
router.patch("/:id", validate({ body: updateUserSchema }), controller.update);
router.post("/:id/revoke-sessions", controller.revokeSessions);
router.post("/:id/send-password-reset", controller.sendPasswordResetLink);
router.delete("/:id", controller.remove);

export default router;
