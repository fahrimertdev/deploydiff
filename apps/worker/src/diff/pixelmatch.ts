import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";

export interface DiffResult {
  diffBuffer: Buffer;
  diffScore: number; // 0.0 – 1.0
  changedPixels: number;
  totalPixels: number;
}

export async function computeDiff(
  beforeBuffer: Buffer,
  afterBuffer: Buffer
): Promise<DiffResult> {
  // Decode both PNGs
  const beforePng = PNG.sync.read(beforeBuffer);
  const afterPng = PNG.sync.read(afterBuffer);

  // Normalize dimensions: both images must be the same size for pixelmatch.
  // Strategy: take the max of each dimension, pad the smaller image with white.
  const width = Math.max(beforePng.width, afterPng.width);
  const height = Math.max(beforePng.height, afterPng.height);

  const normalizePng = async (
    buffer: Buffer,
    targetWidth: number,
    targetHeight: number
  ): Promise<PNG> => {
    if (buffer.length === 0) {
      const blank = new PNG({ width: targetWidth, height: targetHeight });
      blank.data.fill(255);
      return blank;
    }

    const normalized = await sharp(buffer)
      .resize(targetWidth, targetHeight, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    return PNG.sync.read(normalized);
  };

  const [normBefore, normAfter] = await Promise.all([
    normalizePng(beforeBuffer, width, height),
    normalizePng(afterBuffer, width, height),
  ]);

  // Create output PNG for the diff
  const diffPng = new PNG({ width, height });

  const changedPixels = pixelmatch(
    normBefore.data,
    normAfter.data,
    diffPng.data,
    width,
    height,
    {
      threshold: 0.1,
      includeAA: false,
      alpha: 0.3,
      diffColor: [255, 0, 0],
      diffColorAlt: [0, 255, 0],
    }
  );

  const totalPixels = width * height;
  const diffScore = totalPixels > 0 ? changedPixels / totalPixels : 0;
  const diffBuffer = PNG.sync.write(diffPng);

  return {
    diffBuffer: Buffer.from(diffBuffer),
    diffScore,
    changedPixels,
    totalPixels,
  };
}
