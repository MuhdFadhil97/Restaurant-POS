import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createShiftTemplateSchema, listShiftTemplatesQuerySchema, updateShiftTemplateSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/", validate({ query: listShiftTemplatesQuerySchema }), controller.list);
router.get("/:id", controller.getOne);
router.post("/", validate({ body: createShiftTemplateSchema }), controller.create);
router.patch("/:id", validate({ body: updateShiftTemplateSchema }), controller.update);
router.delete("/:id", controller.remove);

export default router;
