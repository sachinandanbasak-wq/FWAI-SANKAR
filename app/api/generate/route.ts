import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  STYLE,
  hordeSubmit,
  translateToEnglish,
  tryHuggingFace,
  tryPollinations,
} from "@/lib/ai";
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
  // The client retries the fast providers a few times. Only the final attempt
  // is allowed to enqueue the slow free queue, to avoid duplicate queued jobs.
  queue: z.boolean().optional().default(true),
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

  // Prompts may be in any language; the image models want English.
  const english = await translateToEnglish(parsed.data.prompt);
  const fullPrompt = `${english}. ${STYLE}`;

  // 1. Fast, keyless: FLUX.1-schnell on a public Hugging Face Space.
  const hf = await tryHuggingFace(fullPrompt);
  if (hf.ok) {
    const name = await saveBytes(hf.image.bytes, extForContentType(hf.image.contentType));
    return NextResponse.json({
      status: "done",
      url: `/api/files/${name}`,
      provider: "huggingface",
      usedPrompt: english,
    });
  }

  // 2. Fast when quota allows: Pollinations free model.
  const fast = await tryPollinations(fullPrompt, 1, 12000);
  if (fast.ok) {
    const name = await saveBytes(fast.image.bytes, extForContentType(fast.image.contentType));
    return NextResponse.json({
      status: "done",
      url: `/api/files/${name}`,
      provider: "pollinations",
      usedPrompt: english,
    });
  }

  // Fast providers are busy. If this is a retry from the client, do not queue
  // yet — let the client try again.
  if (!parsed.data.queue) {
    return NextResponse.json({ status: "busy" });
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
