import crypto from "crypto";
import { prisma } from "./db";

// Storage adapter. Files are stored in the database so the app works on
// serverless hosts with an ephemeral filesystem. Swap the bodies here for
// Supabase Storage / S3 without touching the routes.

export function isSafeName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..");
}

export async function saveBytes(bytes: Buffer, ext: string): Promise<string> {
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  await prisma.storedFile.create({
    data: {
      name,
      contentType: contentTypeFor(name),
      bytes: new Uint8Array(bytes),
    },
  });
  return name;
}

export async function readBytes(name: string): Promise<Buffer | null> {
  if (!isSafeName(name)) return null;
  const row = await prisma.storedFile.findUnique({ where: { name } });
  if (!row) return null;
  return Buffer.from(row.bytes);
}

export function contentTypeFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}
