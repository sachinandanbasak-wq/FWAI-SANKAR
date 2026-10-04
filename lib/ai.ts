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

const HORDE = "https://stablehorde.net/api/v2";
const HORDE_KEY = process.env.HORDE_API_KEY || "0000000000"; // anonymous
const AGENT = "sweet-ginger-studio:1.0";

export const POLL_MODEL = process.env.POLLINATIONS_MODEL || "sana";
const POLL_TOKEN = process.env.POLLINATIONS_TOKEN || "";

export const STYLE =
  "bold screen-print style graphic, solid flat colours, clean edges, centred composition, plain white background, no shirt, no mockup, no photo frame";

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
