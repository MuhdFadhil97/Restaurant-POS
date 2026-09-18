import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createCustomerSchema, updateCustomerSchema } from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.get("/:id/history", controller.history);
router.post("/", validate({ body: createCustomerSchema }), controller.create);
router.patch("/:id", validate({ body: updateCustomerSchema }), controller.update);
router.delete("/:id", controller.remove);

export default router;
