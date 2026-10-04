import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { saveBytes } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// AI image generation.
//
// Default provider is Pollinations (https://pollinations.ai), which needs no
// API key, so the feature works out of the box. To use a paid provider later,
// add its key as an environment variable and branch here — the rest of the app
// only cares that this route returns a stored image URL.

const STYLE =
  "bold screen-print style graphic, solid flat colours, clean edges, centred composition, plain white background, no shirt, no mockup, no photo frame";

const bodySchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Please describe the design you want (at least a few words).")
    .max(300, "Please keep the description under 300 characters."),
});

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
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}` +
    `?width=1024&height=1024&nologo=true&seed=${seed}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(55000) });
  } catch {
    return NextResponse.json(
      { error: "The image service did not respond in time. Please try again." },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `The image service returned an error (${res.status}). Please try again.` },
      { status: 502 }
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: "The image service did not return an image. Please try again." },
      { status: 502 }
    );
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 1000) {
    return NextResponse.json(
      { error: "The generated image was empty. Please try again." },
      { status: 502 }
    );
  }

  const ext = contentType.includes("png") ? ".png" : ".jpg";
  const name = await saveBytes(bytes, ext);

  return NextResponse.json({ url: `/api/files/${name}`, provider: "pollinations", seed });
}
