import imageSize from "image-size";
import path from "path";
import fs from "fs";

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

export default async function CheckImageRequirements(imagePath) {
  const ext = path.extname(imagePath).slice(1).toLowerCase();
  if (!IMG.format.includes(ext)) {
    throw new Error(`Invalid image format. Allowed: ${IMG.format.join(", ")}`);
  }

  const stats = await fs.promises.stat(imagePath);
  if (stats.size > IMG.size) {
    throw new Error(`Image too large. Max size: ${IMG.size / (1024 * 1024)} MB`);
  }

  const buffer = await fs.promises.readFile(imagePath);

  let width, height;
  try {
    ({ width, height } = imageSize(buffer));
  } catch {
    throw new Error("Cannot read image dimensions.");
  }

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