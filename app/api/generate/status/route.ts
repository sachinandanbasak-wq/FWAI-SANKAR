import { NextRequest, NextResponse } from "next/server";
import { hordeCheck, hordeResult } from "@/lib/ai";
import { extForContentType, saveBytes } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Poll one AI Horde job. The client calls this every few seconds until done.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing job id." }, { status: 400 });
  }

  const check = await hordeCheck(id);
  if (!check.ok) {
    return NextResponse.json({ status: "pending" });
  }
  if (!check.done) {
    return NextResponse.json({
      status: "pending",
      queue: check.queue,
      waitTime: check.waitTime,
    });
  }

  const result = await hordeResult(id);
  if (!result.ok) {
    // Job finished but the image was not fetchable; let the client retry.
    return NextResponse.json({ status: "pending", finishing: true });
  }

  const name = await saveBytes(result.image.bytes, extForContentType(result.image.contentType));
  return NextResponse.json({
    status: "done",
    url: `/api/files/${name}`,
    provider: "horde",
  });
}
