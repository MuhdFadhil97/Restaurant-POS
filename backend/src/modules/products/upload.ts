import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";
import { ApiError } from "../../lib/apiError";

const uploadDir = path.join(__dirname, "../../../uploads/products");
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
});

export const uploadProductImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(ApiError.badRequest("Image must be JPEG, PNG, or WEBP"));
      return;
    }
    cb(null, true);
  },
}).single("image");
