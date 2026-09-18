import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", requireRole("ADMIN", "MANAGER"), validate({ body: createCategorySchema }), controller.create);
router.patch("/:id", requireRole("ADMIN", "MANAGER"), validate({ body: updateCategorySchema }), controller.update);
router.delete("/:id", requireRole("ADMIN", "MANAGER"), controller.remove);

export default router;
