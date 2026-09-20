import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleGuard";
import { validate } from "../../middleware/validate";
import {
  createProductSchema,
  updateProductSchema,
  importProductsBodySchema,
  bulkAdjustProductsBodySchema,
} from "./validation";
import * as controller from "./controller";
import { uploadProductImage } from "./upload";

const router = Router();

router.use(authenticate);

router.post("/upload-image", requireRole("ADMIN", "MANAGER"), uploadProductImage, controller.uploadImage);

router.get("/import/template", requireRole("ADMIN", "MANAGER"), controller.downloadTemplate);
router.post(
  "/import/preview",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: importProductsBodySchema }),
  controller.previewImportProducts
);
router.post(
  "/import",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: importProductsBodySchema }),
  controller.importProducts
);

router.get("/bulk-adjust/template", requireRole("ADMIN", "MANAGER"), controller.downloadBulkAdjustmentTemplate);
router.post(
  "/bulk-adjust/preview",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: bulkAdjustProductsBodySchema }),
  controller.previewBulkAdjustProducts
);
router.post(
  "/bulk-adjust",
  requireRole("ADMIN", "MANAGER"),
  validate({ body: bulkAdjustProductsBodySchema }),
  controller.bulkAdjustProducts
);

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", requireRole("ADMIN", "MANAGER"), validate({ body: createProductSchema }), controller.create);
router.patch("/:id", requireRole("ADMIN", "MANAGER"), validate({ body: updateProductSchema }), controller.update);
router.delete("/:id", requireRole("ADMIN", "MANAGER"), controller.remove);

export default router;
