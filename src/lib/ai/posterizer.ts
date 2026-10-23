export interface VectorizerOptions {
  tones?: number;
  edgeWeight?: number;
  saturation?: number;
  contrast?: number;
  maxDimension?: number;
}

export interface VectorizerResult {
  vectorDataUrl: string;
  palette: string[];
  width: number;
  height: number;
  style: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) * 0.3 +
    Math.pow(c1[1] - c2[1], 2) * 0.59 +
    Math.pow(c1[2] - c2[2], 2) * 0.11
  );
}

/**
 * Transforms an image data URL into a stylized, multi-tone vector illustration
 * using box-blur noise suppression, color quantization, and inked edge contours.
 */
export async function vectorizeImageClient(
  dataUrl: string,
  options: VectorizerOptions = {}
): Promise<VectorizerResult> {
  const tones = options.tones ?? 8;
  const edgeWeight = options.edgeWeight ?? 1.4;
  const saturationBoost = options.saturation ?? 1.35;
  const contrastBoost = options.contrast ?? 1.15;
  const maxDim = options.maxDimension ?? 800;

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("vectorizeImageClient must run in browser environment"));
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width || 400;
        let h = img.naturalHeight || img.height || 400;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Unable to create canvas 2D context");
        }

        // Draw original scaled image
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Step 1: Horizontal & vertical smoothing pass to remove photo sensor noise
        const smoothed = new Uint8ClampedArray(data);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            let sumR = 0;
            let sumG = 0;
            let sumB = 0;

            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nIdx = ((y + dy) * w + (x + dx)) * 4;
                sumR += data[nIdx];
                sumG += data[nIdx + 1];
                sumB += data[nIdx + 2];
              }
            }

            smoothed[idx] = sumR / 9;
            smoothed[idx + 1] = sumG / 9;
            smoothed[idx + 2] = sumB / 9;
            smoothed[idx + 3] = data[idx + 3];
          }
        }

        // Step 2: Color quantization, saturation, and contrast adjustment
        const step = 256 / tones;
        const colorCounts = new Map<string, { count: number; rgb: [number, number, number] }>();
        const quantized = new Uint8ClampedArray(smoothed.length);

        for (let i = 0; i < smoothed.length; i += 4) {
          let r = smoothed[i];
          let g = smoothed[i + 1];
          let b = smoothed[i + 2];

          // Contrast curve
          r = Math.min(255, Math.max(0, ((r / 255 - 0.5) * contrastBoost + 0.5) * 255));
          g = Math.min(255, Math.max(0, ((g / 255 - 0.5) * contrastBoost + 0.5) * 255));
          b = Math.min(255, Math.max(0, ((b / 255 - 0.5) * contrastBoost + 0.5) * 255));

          // Saturation boost
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = Math.min(255, Math.max(0, gray + (r - gray) * saturationBoost));
          g = Math.min(255, Math.max(0, gray + (g - gray) * saturationBoost));
          b = Math.min(255, Math.max(0, gray + (b - gray) * saturationBoost));

          // Quantize into discrete illustrative tone bands
          const qR = Math.min(255, Math.floor(Math.floor(r / step) * step + step / 2));
          const qG = Math.min(255, Math.floor(Math.floor(g / step) * step + step / 2));
          const qB = Math.min(255, Math.floor(Math.floor(b / step) * step + step / 2));

          quantized[i] = qR;
          quantized[i + 1] = qG;
          quantized[i + 2] = qB;
          quantized[i + 3] = 255;

          // Histogram for 5-color palette extraction
          const hex = rgbToHex(qR, qG, qB);
          const existing = colorCounts.get(hex);
          if (existing) {
            existing.count++;
          } else {
            colorCounts.set(hex, { count: 1, rgb: [qR, qG, qB] });
          }
        }

        // Step 3: Edge contour tracing (Sobel gradient filter) for crisp vector ink lines
        const finalData = new Uint8ClampedArray(quantized);
        const threshold = 38 / edgeWeight;

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;

            const leftLum = 0.299 * quantized[((y * w + (x - 1)) * 4)] + 0.587 * quantized[((y * w + (x - 1)) * 4) + 1] + 0.114 * quantized[((y * w + (x - 1)) * 4) + 2];
            const rightLum = 0.299 * quantized[((y * w + (x + 1)) * 4)] + 0.587 * quantized[((y * w + (x + 1)) * 4) + 1] + 0.114 * quantized[((y * w + (x + 1)) * 4) + 2];
            const topLum = 0.299 * quantized[(((y - 1) * w + x) * 4)] + 0.587 * quantized[(((y - 1) * w + x) * 4) + 1] + 0.114 * quantized[(((y - 1) * w + x) * 4) + 2];
            const bottomLum = 0.299 * quantized[(((y + 1) * w + x) * 4)] + 0.587 * quantized[(((y + 1) * w + x) * 4) + 1] + 0.114 * quantized[(((y + 1) * w + x) * 4) + 2];

            const dx = Math.abs(rightLum - leftLum);
            const dy = Math.abs(bottomLum - topLum);
            const edgeMag = Math.sqrt(dx * dx + dy * dy);

            if (edgeMag > threshold) {
              // Blend a subtle inked outline for cel-shaded art
              finalData[idx] = Math.round(finalData[idx] * 0.25);
              finalData[idx + 1] = Math.round(finalData[idx + 1] * 0.25);
              finalData[idx + 2] = Math.round(finalData[idx + 2] * 0.3);
            }
          }
        }

        // Step 4: Extract 5 visually distinct dominant palette swatches
        const sorted = Array.from(colorCounts.entries()).sort((a, b) => b[1].count - a[1].count);
        const palette: string[] = [];
        const pickedRgb: [number, number, number][] = [];

        for (const [hex, info] of sorted) {
          const isDistinct = pickedRgb.every((rgb) => colorDistance(rgb, info.rgb) > 35);
          if (isDistinct || palette.length < 5) {
            palette.push(hex);
            pickedRgb.push(info.rgb);
          }
          if (palette.length >= 5) break;
        }

        // Fill palette if fewer than 5 unique colors were detected
        const fallbackColors = ["#0F172A", "#2E5CFF", "#00E676", "#FF5E2E", "#F8FAFC"];
        while (palette.length < 5) {
          palette.push(fallbackColors[palette.length]);
        }

        // Step 5: Render final vector pixels and return data URL
        const outputImageData = new ImageData(finalData, w, h);
        ctx.putImageData(outputImageData, 0, 0);

        const vectorDataUrl = canvas.toDataURL("image/png");

        resolve({
          vectorDataUrl,
          palette,
          width: w,
          height: h,
          style: `${tones}-Tone Cel-Shaded Vector Illustration`,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load reference image for vectorization"));
    };

    img.src = dataUrl;
  });
}
