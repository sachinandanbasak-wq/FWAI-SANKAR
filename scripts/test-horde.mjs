// Throwaway probe: does AI Horde (anonymous, no key) generate an image, and how slow?
// Run: node scripts/test-horde.mjs
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const submit = await fetch("https://stablehorde.net/api/v2/generate/async", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: "0000000000",
    "Client-Agent": "sweet-ginger-studio:1.0",
  },
  body: JSON.stringify({
    prompt: "simple flat red star logo, vector, plain white background",
    params: { width: 512, height: 512, steps: 20, n: 1 },
    nsfw: false,
    censor_nsfw: true,
    models: ["stable_diffusion"],
  }),
});

if (!submit.ok) {
  console.log("submit failed", submit.status, await submit.text());
  process.exit(1);
}
const { id, message } = await submit.json();
console.log("submitted", id, message);

for (let i = 0; i < 30; i++) {
  await sleep(4000);
  const chk = await (await fetch(`https://stablehorde.net/api/v2/generate/check/${id}`)).json();
  if (chk.done) {
    const st = await (await fetch(`https://stablehorde.net/api/v2/generate/status/${id}`)).json();
    const url = st.generations?.[0]?.img;
    console.log("done in ~" + (i * 4 + 4) + "s, url:", url);
    const img = await fetch(url);
    console.log("image:", img.status, img.headers.get("content-type"), (await img.arrayBuffer()).byteLength, "bytes");
    process.exit(0);
  }
  console.log(`wait ${i * 4 + 4}s  queue=${chk.queue_position} wait=${chk.wait_time}s`);
}
console.log("gave up after 120s");
process.exit(1);
