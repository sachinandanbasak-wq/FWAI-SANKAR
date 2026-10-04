import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

// Storage adapter. Local disk for this build; swap the bodies here for
// Supabase Storage / S3 in production without touching the routes.

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export function isSafeName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..");
}

export async function saveBytes(bytes: Buffer, ext: string): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), bytes);
  return name;
}

export function filePath(name: string): string | null {
  if (!isSafeName(name)) return null;
  return path.join(UPLOAD_DIR, name);
}

export async function readBytes(name: string): Promise<Buffer | null> {
  const p = filePath(name);
  if (!p) return null;
  try {
    return await fs.readFile(p);
  } catch {
    return null;
  }
}

export function contentTypeFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}
