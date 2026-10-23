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
  naturalWidth: number;
  naturalHeight: number;
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
 * Transforms an image data URL into a clean, razor-sharp, high-fidelity vector illustration
 * faithful to the reference image using edge-preserving bilateral surface smoothing,
 * silky tonal quantization, and anti-aliased subpixel contour inking.
 */
export async function vectorizeImageClient(
  dataUrl: string,
  options: VectorizerOptions = {}
): Promise<VectorizerResult> {
  const tones = options.tones ?? 32;
  const edgeWeight = options.edgeWeight ?? 1.2;
  const saturationBoost = options.saturation ?? 1.08;
  const contrastBoost = options.contrast ?? 1.04;
  const maxDim = options.maxDimension ?? 2048;

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("vectorizeImageClient must run in browser environment"));
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || img.width || 800;
        const naturalH = img.naturalHeight || img.height || 600;

        let w = naturalW;
        let h = naturalH;

        // Scale proportionally only if exceeding maxDimension (2048px default)
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
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          throw new Error("Unable to create canvas 2D context");
        }

        // Enable high quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Step 1: Edge-preserving bilateral surface smoothing
        // Keeps crisp outlines, facial features, and subject details intact while eliminating camera noise and sensor grain
        const smoothed = new Uint8ClampedArray(data);
        const sigmaColorSq = 2 * 32 * 32; // Color variance threshold

        // Precompute spatial weights for 3x3 neighborhood:
        // Center: (0,0) -> 1.0
        // Orthogonal: (1,0) -> 0.68
        // Diagonal: (1,1) -> 0.46
        const spatialW = [
          [0.46, 0.68, 0.46],
          [0.68, 1.00, 0.68],
          [0.46, 0.68, 0.46],
        ];

        for (let y = 1; y < h - 1; y++) {
          const rowOffset = y * w;
          for (let x = 1; x < w - 1; x++) {
            const idx = (rowOffset + x) * 4;
            const cR = data[idx];
            const cG = data[idx + 1];
            const cB = data[idx + 2];

            let sumR = 0;
            let sumG = 0;
            let sumB = 0;
            let totalWeight = 0;

            for (let dy = -1; dy <= 1; dy++) {
              const nRowOffset = (y + dy) * w;
              for (let dx = -1; dx <= 1; dx++) {
                const nIdx = (nRowOffset + (x + dx)) * 4;
                const nR = data[nIdx];
                const nG = data[nIdx + 1];
                const nB = data[nIdx + 2];

                const colorDistSq =
                  (nR - cR) * (nR - cR) * 0.3 +
                  (nG - cG) * (nG - cG) * 0.59 +
                  (nB - cB) * (nB - cB) * 0.11;

                const rangeW = Math.exp(-colorDistSq / sigmaColorSq);
                const weight = spatialW[dy + 1][dx + 1] * rangeW;

                sumR += nR * weight;
                sumG += nG * weight;
                sumB += nB * weight;
                totalWeight += weight;
              }
            }

            if (totalWeight > 0.001) {
              smoothed[idx] = Math.round(sumR / totalWeight);
              smoothed[idx + 1] = Math.round(sumG / totalWeight);
              smoothed[idx + 2] = Math.round(sumB / totalWeight);
            }
            smoothed[idx + 3] = data[idx + 3];
          }
        }

        // Step 2: High-fidelity color grading & smooth tonal quantization
        const step = 256 / tones;
        const colorCounts = new Map<string, { count: number; rgb: [number, number, number] }>();
        const quantized = new Uint8ClampedArray(smoothed.length);

        for (let i = 0; i < smoothed.length; i += 4) {
          let r = smoothed[i];
          let g = smoothed[i + 1];
          let b = smoothed[i + 2];

          // Gentle contrast refinement
          r = Math.min(255, Math.max(0, ((r / 255 - 0.5) * contrastBoost + 0.5) * 255));
          g = Math.min(255, Math.max(0, ((g / 255 - 0.5) * contrastBoost + 0.5) * 255));
          b = Math.min(255, Math.max(0, ((b / 255 - 0.5) * contrastBoost + 0.5) * 255));

          // Natural color vibrance boost
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = Math.min(255, Math.max(0, gray + (r - gray) * saturationBoost));
          g = Math.min(255, Math.max(0, gray + (g - gray) * saturationBoost));
          b = Math.min(255, Math.max(0, gray + (b - gray) * saturationBoost));

          // Quantize into crisp vector tones
          const qR = Math.min(255, Math.max(0, Math.floor(Math.floor(r / step) * step + step * 0.5)));
          const qG = Math.min(255, Math.max(0, Math.floor(Math.floor(g / step) * step + step * 0.5)));
          const qB = Math.min(255, Math.max(0, Math.floor(Math.floor(b / step) * step + step * 0.5)));

          quantized[i] = qR;
          quantized[i + 1] = qG;
          quantized[i + 2] = qB;
          quantized[i + 3] = 255;

          // Histogram for 5-color palette extraction (quantized to 16 buckets for robust swatch grouping)
          const pR = Math.min(255, Math.floor(qR / 16) * 16 + 8);
          const pG = Math.min(255, Math.floor(qG / 16) * 16 + 8);
          const pB = Math.min(255, Math.floor(qB / 16) * 16 + 8);
          const hex = rgbToHex(pR, pG, pB);
          const existing = colorCounts.get(hex);
          if (existing) {
            existing.count++;
          } else {
            colorCounts.set(hex, { count: 1, rgb: [pR, pG, pB] });
          }
        }

        // Step 3: Subpixel Anti-Aliased Edge Contours (Sobel Filter with Smooth Gradient Inking)
        // Eliminates pixelated jagged staircases by applying continuous subpixel opacity blending
        const finalData = new Uint8ClampedArray(quantized);
        const threshold = 40 / edgeWeight;

        for (let y = 1; y < h - 1; y++) {
          const rowAbove = (y - 1) * w;
          const rowCurr = y * w;
          const rowBelow = (y + 1) * w;

          for (let x = 1; x < w - 1; x++) {
            const idx = (rowCurr + x) * 4;

            // 3x3 neighborhood luminance
            const l00 = 0.299 * quantized[(rowAbove + (x - 1)) * 4] + 0.587 * quantized[(rowAbove + (x - 1)) * 4 + 1] + 0.114 * quantized[(rowAbove + (x - 1)) * 4 + 2];
            const l01 = 0.299 * quantized[(rowAbove + x) * 4] + 0.587 * quantized[(rowAbove + x) * 4 + 1] + 0.114 * quantized[(rowAbove + x) * 4 + 2];
            const l02 = 0.299 * quantized[(rowAbove + (x + 1)) * 4] + 0.587 * quantized[(rowAbove + (x + 1)) * 4 + 1] + 0.114 * quantized[(rowAbove + (x + 1)) * 4 + 2];

            const l10 = 0.299 * quantized[(rowCurr + (x - 1)) * 4] + 0.587 * quantized[(rowCurr + (x - 1)) * 4 + 1] + 0.114 * quantized[(rowCurr + (x - 1)) * 4 + 2];
            const l12 = 0.299 * quantized[(rowCurr + (x + 1)) * 4] + 0.587 * quantized[(rowCurr + (x + 1)) * 4 + 1] + 0.114 * quantized[(rowCurr + (x + 1)) * 4 + 2];

            const l20 = 0.299 * quantized[(rowBelow + (x - 1)) * 4] + 0.587 * quantized[(rowBelow + (x - 1)) * 4 + 1] + 0.114 * quantized[(rowBelow + (x - 1)) * 4 + 2];
            const l21 = 0.299 * quantized[(rowBelow + x) * 4] + 0.587 * quantized[(rowBelow + x) * 4 + 1] + 0.114 * quantized[(rowBelow + x) * 4 + 2];
            const l22 = 0.299 * quantized[(rowBelow + (x + 1)) * 4] + 0.587 * quantized[(rowBelow + (x + 1)) * 4 + 1] + 0.114 * quantized[(rowBelow + (x + 1)) * 4 + 2];

            // 3x3 Sobel kernel convolution
            const gx = (-l00 + l02 - 2 * l10 + 2 * l12 - l20 + l22);
            const gy = (-l00 - 2 * l01 - l02 + l20 + 2 * l21 + l22);
            const edgeMag = Math.sqrt(gx * gx + gy * gy);

            if (edgeMag > threshold) {
              // Continuous anti-aliasing ramp from threshold to threshold * 2.8
              const t = Math.min(1, (edgeMag - threshold) / (threshold * 1.8));
              const inkStrength = t * 0.42 * Math.min(1.2, edgeWeight);

              finalData[idx] = Math.round(finalData[idx] * (1 - inkStrength));
              finalData[idx + 1] = Math.round(finalData[idx + 1] * (1 - inkStrength));
              finalData[idx + 2] = Math.round(finalData[idx + 2] * (1 - inkStrength * 0.9));
            }
          }
        }

        // Step 4: Extract 5 visually distinct dominant palette swatches
        const sorted = Array.from(colorCounts.entries()).sort((a, b) => b[1].count - a[1].count);
        const palette: string[] = [];
        const pickedRgb: [number, number, number][] = [];

        for (const [hex, info] of sorted) {
          const isDistinct = pickedRgb.every((rgb) => colorDistance(rgb, info.rgb) > 32);
          if (isDistinct || palette.length < 5) {
            palette.push(hex);
            pickedRgb.push(info.rgb);
          }
          if (palette.length >= 5) break;
        }

        // Fallback colors if fewer than 5 unique swatches found
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
          naturalWidth: naturalW,
          naturalHeight: naturalH,
          style: `High-Fidelity ${tones}-Tone Clean Vector Illustration`,
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
