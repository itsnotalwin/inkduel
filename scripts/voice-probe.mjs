/**
 * One-off probe of OpenRouter's heygen/heygen-voice-1-turbo (TTS) — discover
 * availability, pricing, and the audio response shape. Never prints the key.
 */
const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error("OPENROUTER_API_KEY missing");
  process.exit(1);
}

const list = await fetch("https://openrouter.ai/api/v1/models").then((r) => r.json());
const heygen = list.data.filter((m) => m.id.includes("heygen"));
for (const m of heygen) {
  console.log(m.id, "| prompt:", m.pricing?.prompt, "| completion:", m.pricing?.completion, "| arch:", m.architecture?.output_modalities);
}

console.log("\n--- test generation ---");
const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "heygen/heygen-voice-1-turbo",
    modalities: ["text", "audio"],
    audio: { voice: "default", format: "mp3" },
    messages: [{ role: "user", content: "Read this exactly: The archive is open." }],
  }),
});
console.log("status:", res.status);
const body = await res.json().catch(() => null);
if (!body) {
  console.log("non-JSON response:", await res.text());
} else if (body.error) {
  console.log("API error:", JSON.stringify(body.error).slice(0, 600));
} else {
  const msg = body.choices?.[0]?.message ?? {};
  console.log("message keys:", Object.keys(msg));
  if (msg.audio) {
    const bytes = Buffer.from(msg.audio.data ?? "", "base64");
    console.log("audio.data present, base64 length:", (msg.audio.data ?? "").length, "-> bytes:", bytes.length);
    const { writeFileSync } = await import("node:fs");
    writeFileSync("voice-probe-out.mp3", bytes);
    console.log("saved voice-probe-out.mp3");
    console.log("transcript:", JSON.stringify(msg.audio.transcript ?? "").slice(0, 200));
  } else {
    console.log("no audio in message; content:", JSON.stringify(msg.content ?? "").slice(0, 400));
  }
}
