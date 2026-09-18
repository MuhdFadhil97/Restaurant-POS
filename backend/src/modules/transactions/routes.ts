import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  addItemSchema,
  checkoutSchema,
  createDraftSchema,
  finalizeSchema,
  listQuerySchema,
  updateItemSchema,
  updateTransactionSchema,
  voidSchema,
} from "./validation";
import * as controller from "./controller";

const router = Router();

router.use(authenticate);

router.get("/", validate({ query: listQuerySchema }), controller.list);
router.get("/:id", controller.getOne);

router.post("/", validate({ body: createDraftSchema }), controller.createDraft);
router.post("/checkout", validate({ body: checkoutSchema }), controller.checkout);
router.post("/:id/finalize", validate({ body: finalizeSchema }), controller.finalize);

router.patch("/:id", validate({ body: updateTransactionSchema }), controller.update);
router.post("/:id/items", validate({ body: addItemSchema }), controller.addItem);
router.patch("/:id/items/:itemId", validate({ body: updateItemSchema }), controller.updateItem);
router.delete("/:id/items/:itemId", controller.removeItem);

router.post("/:id/void", validate({ body: voidSchema }), controller.voidTransaction);
router.post("/:id/refund", validate({ body: voidSchema }), controller.refundTransaction);

export default router;
