import imageSize from "image-size";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);

// Image requirements
const IMG = {
  format: ["jpeg", "png", "jpg", "webp"],
  size: 20 * 1024 * 1024, // 20MB
  Dimensions: {
    ShortSide: 300,
    RatioMin: 2 / 5,
    RatioMax: 5 / 2,
  },
};

// Validate Image
export default function CheckImageRequierements(imagePath) {
  const ext = path.extname(imagePath).replace(".", "").toLowerCase();
  if (!IMG.format.includes(ext)) {
    throw new Error(`Invalid image format. Allowed: ${IMG.format.join(", ")}`);
  }

  const stats = fs.statSync(imagePath);
  if (stats.size > IMG.size) {
    throw new Error(`Image too large. Max size: ${IMG.size / (1024 * 1024)} MB`);
  }

  const buffer = fs.readFileSync(imagePath);
  const { width, height } = imageSize(buffer);

  if (!width || !height) throw new Error("Cannot read image dimensions.");

  if (Math.min(width, height) < IMG.Dimensions.ShortSide) {
    throw new Error(`Short side too small. Min: ${IMG.Dimensions.ShortSide}px`);
  }

  const ratio = width / height;
  if (ratio < IMG.Dimensions.RatioMin || ratio > IMG.Dimensions.RatioMax) {
    throw new Error(
      `Invalid aspect ratio. Must be between ${IMG.Dimensions.RatioMin} and ${IMG.Dimensions.RatioMax}`
    );
  }

  return true;
}
