import { getSupabaseBrowserClient } from "./client";

export const PROJECT_ASSETS_BUCKET = "project-assets";
export const EXPORTS_BUCKET = "exports";

export interface UploadAssetResult {
  storagePath: string;
  signedUrl: string;
}

/**
 * Converts a Blob or File to a Base64 Data URL (used as fallback for offline or unauthenticated mode).
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads an image asset to the private `project-assets` Supabase Storage bucket.
 * Bucket path structure enforced by RLS: `{user_id}/{project_id}/{filename}`
 * If user is unauthenticated, offline, or in demo mode, gracefully falls back to a Data URL.
 */
export async function uploadProjectAsset(
  file: File | Blob,
  projectId: string,
  filename?: string
): Promise<UploadAssetResult> {
  const rawName = filename || (file instanceof File ? file.name : "asset.png");
  const cleanName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${cleanName}`;

  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.id) {
      const storagePath = `${user.id}/${projectId}/${uniqueName}`;
      const { error: uploadError } = await supabase.storage
        .from(PROJECT_ASSETS_BUCKET)
        .upload(storagePath, file, {
          contentType: file.type || "image/png",
          upsert: true,
        });

      if (!uploadError) {
        // Create signed URL with 30 days validity
        const { data: signedData, error: signError } = await supabase.storage
          .from(PROJECT_ASSETS_BUCKET)
          .createSignedUrl(storagePath, 60 * 60 * 24 * 30);

        if (!signError && signedData?.signedUrl) {
          return {
            storagePath,
            signedUrl: signedData.signedUrl,
          };
        }
      } else {
        console.warn("Supabase asset upload failed, falling back to data URL:", uploadError.message);
      }
    }
  } catch (err) {
    console.warn("Storage upload error, using local fallback:", err);
  }

  // Graceful offline / guest / fallback mode
  const dataUrl = await blobToDataUrl(file);
  return {
    storagePath: dataUrl,
    signedUrl: dataUrl,
  };
}

/**
 * Retrieves a fresh signed URL for an asset storage path.
 */
export async function getAssetSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 60 * 60 * 24 * 7 // 7 days
): Promise<string> {
  if (
    storagePath.startsWith("data:") ||
    storagePath.startsWith("blob:") ||
    storagePath.startsWith("http://") ||
    storagePath.startsWith("https://")
  ) {
    return storagePath;
  }

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.storage
      .from(PROJECT_ASSETS_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (err) {
    console.warn("Failed to get signed URL:", err);
  }

  return storagePath;
}

/**
 * Uploads an exported PNG or SVG to the `exports` Supabase storage bucket (optional cloud backup).
 */
export async function uploadExportFile(
  file: Blob,
  projectId: string,
  filename: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const storagePath = `${user.id}/${projectId}/${Date.now()}-${filename}`;
    const { error } = await supabase.storage
      .from(EXPORTS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (error) return null;

    const { data } = await supabase.storage
      .from(EXPORTS_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30);

    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
