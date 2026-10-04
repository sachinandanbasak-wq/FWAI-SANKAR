// Throwaway probe: FLUX.1-schnell Hugging Face Space, no key.
const BASE = "https://black-forest-labs-flux-1-schnell.hf.space";
const t0 = Date.now();

async function gen(prompt) {
  const submit = await fetch(`${BASE}/gradio_api/call/infer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [prompt, 0, true, 512, 512, 4] }),
  });
  if (!submit.ok) return { ok: false, status: submit.status };
  const { event_id } = await submit.json();
  const ev = await fetch(`${BASE}/gradio_api/call/infer/${event_id}`);
  const text = await ev.text();
  return { ok: true, text };
}

const r1 = await gen("a simple red star logo, plain white background");
console.log("run 1 in", Date.now() - t0, "ms");
console.log(r1.text?.slice(0, 300));

const r2 = await gen("a blue circle badge, plain white background");
console.log("run 2 (second image) in", Date.now() - t0, "ms");
const m = r2.text?.match(/"(https?:\/\/[^"]+|\/tmp\/[^"]+)"/);
if (m) {
  const raw = m[1];
  const url = raw.startsWith("http") ? raw : `${BASE}/gradio_api/file=${raw}`;
  const img = await fetch(url);
  console.log("image:", img.status, img.headers.get("content-type"), (await img.arrayBuffer()).byteLength, "bytes");
} else {
  console.log("no url in run 2");
}
