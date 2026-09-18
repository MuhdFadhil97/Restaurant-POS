import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createTaxRateSchema, updateTaxRateSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/", controller.list);
router.post("/", requireRole("ADMIN"), validate({ body: createTaxRateSchema }), controller.create);
router.patch("/:id", requireRole("ADMIN"), validate({ body: updateTaxRateSchema }), controller.update);
router.delete("/:id", requireRole("ADMIN"), controller.remove);

export default router;
