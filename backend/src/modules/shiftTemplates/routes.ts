import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireModule } from "../../middleware/moduleGuard";
import { validate } from "../../middleware/validate";
import { createShiftTemplateSchema, listShiftTemplatesQuerySchema, updateShiftTemplateSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

// Module access is authoritative here (not stacked with requireRole) so an
// admin's per-user grant can genuinely extend beyond the role default.
router.use(authenticate, requireModule("shift-management"));

router.get("/", validate({ query: listShiftTemplatesQuerySchema }), controller.list);
router.get("/:id", controller.getOne);
router.post("/", validate({ body: createShiftTemplateSchema }), controller.create);
router.patch("/:id", validate({ body: updateShiftTemplateSchema }), controller.update);
router.delete("/:id", controller.remove);

export default router;
