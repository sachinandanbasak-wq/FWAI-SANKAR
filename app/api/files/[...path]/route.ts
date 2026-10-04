import { NextRequest, NextResponse } from "next/server";
import { contentTypeFor, readBytes } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const name = (params.path || []).join("/");
  const bytes = await readBytes(name);
  if (!bytes) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(name),
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
