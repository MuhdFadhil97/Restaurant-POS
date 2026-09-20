import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createSupplierProductSchema, updateSupplierProductSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/", controller.list);
router.get("/price-history", controller.priceHistory);
router.post("/", validate({ body: createSupplierProductSchema }), controller.create);
router.patch("/:id", validate({ body: updateSupplierProductSchema }), controller.update);
router.delete("/:id", controller.remove);

export default router;
