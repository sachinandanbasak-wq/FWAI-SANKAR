"use client";

// Upload validation that runs in the browser BEFORE anything is uploaded, so a
// bad file gets a clear message and nothing is saved.

export type UploadRules = {
  acceptedUploadTypes: string[];
  maxFileSizeMB: number;
  minImageDimensionPx: number;
  recommendedImageDimensionPx: number;
};

export type ArtworkCheck =
  | {
      ok: true;
      image: HTMLImageElement;
      width: number;
      height: number;
      warning?: string;
    }
  | { ok: false; error: string };

function loadImageFromObjectUrl(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

export async function validateArtworkFile(
  file: File,
  rules: UploadRules
): Promise<ArtworkCheck> {
  if (!rules.acceptedUploadTypes.includes(file.type)) {
    return {
      ok: false,
      error: "That file type is not supported. Please upload a PNG or JPG image.",
    };
  }

  const maxBytes = rules.maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `That file is ${(file.size / 1024 / 1024).toFixed(
        1
      )} MB. The maximum size is ${rules.maxFileSizeMB} MB.`,
    };
  }

  let image: HTMLImageElement;
  try {
    image = await loadImageFromObjectUrl(file);
  } catch {
    return { ok: false, error: "That image could not be read. Please try another file." };
  }

  const shortest = Math.min(image.naturalWidth, image.naturalHeight);
  if (shortest < rules.minImageDimensionPx) {
    return {
      ok: false,
      error: `That image is only ${image.naturalWidth}×${image.naturalHeight} pixels. It is too small to print — the shortest side must be at least ${rules.minImageDimensionPx} pixels.`,
    };
  }

  let warning: string | undefined;
  if (shortest < rules.recommendedImageDimensionPx) {
    warning = `Heads up: this image is ${image.naturalWidth}×${image.naturalHeight} pixels. It may look slightly soft when printed. For best results use at least ${rules.recommendedImageDimensionPx} pixels on the shortest side.`;
  }

  return {
    ok: true,
    image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    warning,
  };
}
