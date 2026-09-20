import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate";
import { submitOrderSchema, tokenParamsSchema } from "./validation";
import * as controller from "./controller";

// Public, unauthenticated router (see also einvoice/routes.ts). Keep its
// surface to exactly these three read/create-only endpoints; anything else
// belongs behind `authenticate` in another module.
const router = Router();

const menuLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const orderLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

router.get("/:token", menuLimiter, validate({ params: tokenParamsSchema }), controller.getMenu);
router.get("/:token/status", menuLimiter, validate({ params: tokenParamsSchema }), controller.getStatus);
router.post(
  "/:token/items",
  orderLimiter,
  validate({ params: tokenParamsSchema, body: submitOrderSchema }),
  controller.submitOrder
);

export default router;
