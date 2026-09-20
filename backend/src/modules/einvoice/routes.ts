import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../middleware/validate";
import { verifyParamsSchema } from "./validation";
import * as controller from "./controller";

// Public, unauthenticated router — same reasoning as qrOrder/routes.ts:
// anyone scanning a printed receipt's QR has no session. Keep its surface to
// this one read-only endpoint.
const router = Router();

const verifyLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });
// Tighter limit: each request spins up a headless Chromium page, far costlier
// than the plain JSON lookup verifyLimiter guards.
const downloadLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

router.get("/:uuid/share/:longId", verifyLimiter, validate({ params: verifyParamsSchema }), controller.verify);
router.get(
  "/:uuid/share/:longId/receipt.pdf",
  downloadLimiter,
  validate({ params: verifyParamsSchema }),
  controller.downloadReceipt
);

export default router;
