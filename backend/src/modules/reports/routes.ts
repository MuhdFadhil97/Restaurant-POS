import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { reportQuerySchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER"));
router.use(validate({ query: reportQuerySchema }));

router.get("/sales-summary", controller.summary);
router.get("/top-products", controller.topProducts);
router.get("/sales-by-cashier", controller.byCashier);
router.get("/sales-by-payment-method", controller.byPaymentMethod);

export default router;
