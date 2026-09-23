import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { enforceUserLimit } from "../../middleware/license";
import { createUserSchema, updateUserSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", enforceUserLimit, validate({ body: createUserSchema }), controller.create);
router.patch("/:id", validate({ body: updateUserSchema }), controller.update);
router.delete("/:id", controller.remove);

export default router;
