import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createSupplierSchema, updateSupplierSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", validate({ body: createSupplierSchema }), controller.create);
router.patch("/:id", validate({ body: updateSupplierSchema }), controller.update);
router.delete("/:id", controller.remove);

export default router;
