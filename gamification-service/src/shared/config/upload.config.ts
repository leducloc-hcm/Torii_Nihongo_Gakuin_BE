import * as multer from "multer";
import * as path from "path";

export const imageUploadOptions: multer.Options = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (
    _: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowed = [".png", ".jpg", ".jpeg", ".webp"];
    if (!allowed.includes(ext)) {
      return cb(new Error("Only image files are allowed") as any, false);
    }
    cb(null, true);
  },
};
