import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { STYLE, hordeSubmit, tryHuggingFace, tryPollinations } from "@/lib/ai";
import { extForContentType, saveBytes } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Please describe the design you want (at least a few words).")
    .max(300, "Please keep the description under 300 characters."),
});

// Fast path: Pollinations. Slow fallback: AI Horde (queued, polled by client).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please describe the design." },
      { status: 400 }
    );
  }

  const fullPrompt = `${parsed.data.prompt}. ${STYLE}`;

  // 1. Fast, keyless: FLUX.1-schnell on a public Hugging Face Space.
  const hf = await tryHuggingFace(fullPrompt);
  if (hf.ok) {
    const name = await saveBytes(hf.image.bytes, extForContentType(hf.image.contentType));
    return NextResponse.json({
      status: "done",
      url: `/api/files/${name}`,
      provider: "huggingface",
    });
  }

  // 2. Fast when quota allows: Pollinations free model.
  const fast = await tryPollinations(fullPrompt);
  if (fast.ok) {
    const name = await saveBytes(fast.image.bytes, extForContentType(fast.image.contentType));
    return NextResponse.json({
      status: "done",
      url: `/api/files/${name}`,
      provider: "pollinations",
    });
  }

  // 3. Free but queued: AI Horde, polled by the client.
  const sub = await hordeSubmit(fullPrompt);
  if (!sub.ok) {
    return NextResponse.json(
      {
        error:
          "The image service is busy right now. Please wait a moment and press Generate again.",
      },
      { status: 502 }
    );
  }
  return NextResponse.json({ status: "pending", provider: "horde", jobId: sub.id });
}
