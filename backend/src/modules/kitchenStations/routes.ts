import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import { createStationSchema, updateStationSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/", controller.list);
router.post("/", requireRole("ADMIN", "MANAGER"), validate({ body: createStationSchema }), controller.create);
router.patch("/:id", requireRole("ADMIN", "MANAGER"), validate({ body: updateStationSchema }), controller.update);
router.delete("/:id", requireRole("ADMIN", "MANAGER"), controller.remove);

export default router;
