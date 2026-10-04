// AI image providers.
//
// Two providers, tried in order:
//  1. Pollinations — fast, but a datacenter IP (Vercel) gets a small free
//     allowance then "402 Payment Required". Optional free token via
//     POLLINATIONS_TOKEN raises the limit.
//  2. AI Horde — free, no key needed, works from any IP, but queued (often
//     30-120 s anonymously), so generation runs as a job the client polls.
//
// Both return image bytes; the caller stores them.

// Primary provider: a public Hugging Face Space running FLUX.1-schnell.
// Free, no key, fast (a few seconds), and works from datacenter IPs. Spaces can
// sleep or rate-limit, so failures fall through to the providers below.
const HF_SPACE = process.env.HF_SPACE || "black-forest-labs-flux-1-schnell";
const HF_BASE = `https://${HF_SPACE}.hf.space`;

const HORDE = "https://stablehorde.net/api/v2";
const HORDE_KEY = process.env.HORDE_API_KEY || "0000000000"; // anonymous
const AGENT = "sweet-ginger-studio:1.0";

export const POLL_MODEL = process.env.POLLINATIONS_MODEL || "sana";
const POLL_TOKEN = process.env.POLLINATIONS_TOKEN || "";

export const STYLE =
  "bold screen-print style graphic, solid flat colours, clean edges, centred composition, plain white background, no shirt, no mockup, no photo frame";

/**
 * Turn a short idea into a clear single-subject print brief.
 * Without this, a one-word prompt like "tree" makes the model fill the frame
 * with a repeating pattern. This is deterministic (no second API call), so it
 * cannot fail or be rate-limited.
 */
export function buildImagePrompt(subject: string): string {
  const s = subject.trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");
  return [
    `A single centred illustration of: ${s}.`,
    "One subject only, filling the middle of the frame, on a plain white background.",
    "Not a repeating pattern, not a tile, not a texture, no collage, no multiple copies.",
    "No text, no letters, no numbers, no watermark, no logo frame, no person wearing it.",
    STYLE + ".",
  ].join(" ");
}

function pollinationsUrl(prompt: string, seed: number): string {
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    nologo: "true",
    model: POLL_MODEL,
    seed: String(seed),
  });
  if (POLL_TOKEN) params.set("token", POLL_TOKEN);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

export type ImageBytes = { bytes: Buffer; contentType: string };

// ---- Prompt translation -----------------------------------------------------
// Image models understand English best. Any prompt typed in another script is
// translated to English first. Romanised text (plain ASCII) is left alone.

const ASCII_ONLY = /^[\x20-\x7E\r\n\t]*$/;

export function isAscii(prompt: string): boolean {
  return ASCII_ONLY.test(prompt);
}

function scriptLang(prompt: string): string | null {
  if (/[\u0900-\u097F]/.test(prompt)) return "hi"; // Devanagari (Hindi/Marathi)
  if (/[\u0980-\u09FF]/.test(prompt)) return "bn"; // Bengali
  if (/[\u0A00-\u0A7F]/.test(prompt)) return "pa"; // Punjabi
  if (/[\u0A80-\u0AFF]/.test(prompt)) return "gu"; // Gujarati
  if (/[\u0B00-\u0B7F]/.test(prompt)) return "or"; // Odia
  if (/[\u0B80-\u0BFF]/.test(prompt)) return "ta"; // Tamil
  if (/[\u0C00-\u0C7F]/.test(prompt)) return "te"; // Telugu
  if (/[\u0C80-\u0CFF]/.test(prompt)) return "kn"; // Kannada
  if (/[\u0D00-\u0D7F]/.test(prompt)) return "ml"; // Malayalam
  if (/[\u0600-\u06FF]/.test(prompt)) return "ar"; // Arabic
  if (/[\u0400-\u04FF]/.test(prompt)) return "ru"; // Russian
  if (/[\u4E00-\u9FFF]/.test(prompt)) return "zh-CN"; // Chinese
  if (/[\u3040-\u30FF]/.test(prompt)) return "ja"; // Japanese
  if (/[\uAC00-\uD7AF]/.test(prompt)) return "ko"; // Korean
  return null;
}

async function viaMyMemory(prompt: string): Promise<string | null> {
  const src = scriptLang(prompt);
  if (!src) return null;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      prompt
    )}&langpair=${src}|en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000), cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    const t = j?.responseData?.translatedText;
    if (typeof t === "string" && t.trim()) return t.trim();
    return null;
  } catch {
    return null;
  }
}

async function viaPollinationsText(prompt: string): Promise<string | null> {
  try {
    const instr = `Translate the text below into English. Reply with only the English translation, nothing else.\n\n${prompt}`;
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(instr)}`, {
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const raw = (await res.text()).trim();
    if (!raw) return null;
    const line = raw.split("\n").map((s) => s.trim()).filter(Boolean)[0] ?? "";
    return line.replace(/^["'`]+|["'`]+$/g, "").trim() || null;
  } catch {
    return null;
  }
}

/** Translate any script to English. Falls back to the original if unavailable. */
export async function translateToEnglish(prompt: string): Promise<string> {
  if (isAscii(prompt)) return prompt;
  return (await viaMyMemory(prompt)) ?? (await viaPollinationsText(prompt)) ?? prompt;
}

export async function tryHuggingFace(
  prompt: string,
  submitMs = 8000,
  eventMs = 34000
): Promise<{ ok: true; image: ImageBytes } | { ok: false; status: number }> {
  try {
    const submit = await fetch(`${HF_BASE}/gradio_api/call/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [prompt, 0, true, 1024, 1024, 4] }),
      signal: AbortSignal.timeout(submitMs),
      cache: "no-store",
    });
    if (!submit.ok) return { ok: false, status: submit.status };
    const sub = await submit.json();
    const eventId = sub?.event_id;
    if (!eventId) return { ok: false, status: 502 };

    const ev = await fetch(`${HF_BASE}/gradio_api/call/infer/${eventId}`, {
      signal: AbortSignal.timeout(eventMs),
      cache: "no-store",
    });
    if (!ev.ok) return { ok: false, status: ev.status };
    const text = await ev.text();

    const m =
      text.match(/"url":\s*"([^"]+)"/) || text.match(/"path":\s*"([^"]+)"/);
    if (!m) return { ok: false, status: 502 };
    let url = m[1].replace(/\\\//g, "/");
    if (!url.startsWith("http")) url = `${HF_BASE}/gradio_api/file=${url}`;

    const img = await fetch(url, { signal: AbortSignal.timeout(20000), cache: "no-store" });
    if (!img.ok) return { ok: false, status: img.status };
    const contentType = img.headers.get("content-type") || "image/webp";
    const bytes = Buffer.from(await img.arrayBuffer());
    if (bytes.length < 1000) return { ok: false, status: 502 };
    return { ok: true, image: { bytes, contentType } };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function tryPollinations(
  prompt: string,
  attempts = 2,
  timeoutMs = 18000
): Promise<{ ok: true; image: ImageBytes } | { ok: false; status: number }> {
  let lastStatus = 0;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(pollinationsUrl(prompt, Math.floor(Math.random() * 1e9)), {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": AGENT },
        cache: "no-store",
      });
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) {
        lastStatus = res.status;
        continue;
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length < 1000) {
        lastStatus = res.status;
        continue;
      }
      return { ok: true, image: { bytes, contentType } };
    } catch {
      lastStatus = 0;
    }
  }
  return { ok: false, status: lastStatus };
}

export async function hordeSubmit(
  prompt: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${HORDE}/generate/async`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: HORDE_KEY,
        "Client-Agent": AGENT,
      },
      body: JSON.stringify({
        prompt,
        params: { width: 512, height: 512, steps: 20, n: 1 },
        nsfw: false,
        censor_nsfw: true,
        models: ["stable_diffusion"],
      }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `horde submit ${res.status}` };
    const json = await res.json();
    if (!json?.id) return { ok: false, error: "horde did not return a job id" };
    return { ok: true, id: String(json.id) };
  } catch {
    return { ok: false, error: "horde unreachable" };
  }
}

export async function hordeCheck(
  id: string
): Promise<{ ok: true; done: boolean; waitTime: number; queue: number } | { ok: false }> {
  try {
    const res = await fetch(`${HORDE}/generate/check/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    const j = await res.json();
    return {
      ok: true,
      done: Boolean(j.done),
      waitTime: Number(j.wait_time ?? 0),
      queue: Number(j.queue_position ?? 0),
    };
  } catch {
    return { ok: false };
  }
}

export async function hordeResult(
  id: string
): Promise<{ ok: true; image: ImageBytes } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${HORDE}/generate/status/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, error: `horde status ${res.status}` };
    const j = await res.json();
    const url = j?.generations?.[0]?.img as string | undefined;
    if (!url) return { ok: false, error: "no image in horde result" };
    const img = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!img.ok) return { ok: false, error: `horde image ${img.status}` };
    const bytes = Buffer.from(await img.arrayBuffer());
    if (bytes.length < 1000) return { ok: false, error: "horde image empty" };
    return { ok: true, image: { bytes, contentType: img.headers.get("content-type") || "image/webp" } };
  } catch {
    return { ok: false, error: "horde result failed" };
  }
}
