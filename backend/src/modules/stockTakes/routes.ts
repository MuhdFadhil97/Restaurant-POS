import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { listQuerySchema, saveCountsSchema, startStockTakeSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "MANAGER"));

router.get("/", validate({ query: listQuerySchema }), controller.list);
router.get("/:id", controller.getOne);
router.post("/", validate({ body: startStockTakeSchema }), controller.start);
router.patch("/:id/items", validate({ body: saveCountsSchema }), controller.saveCounts);
router.post("/:id/complete", controller.complete);
router.post("/:id/cancel", controller.cancel);

export default router;
