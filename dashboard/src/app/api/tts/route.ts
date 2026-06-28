// Atlas's voice — ElevenLabs text-to-speech. Returns mp3 audio.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = process.env.ELEVENLABS_VOICE_ID || "cjVigY5qzO86Huf0OWal"; // Eric
  if (!key) return Response.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });

  const { text } = await request.json().catch(() => ({}));
  if (!text || !String(text).trim()) return Response.json({ error: "text required" }, { status: 400 });

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: String(text).slice(0, 2500),
      model_id: "eleven_flash_v2_5", // low latency + low cost
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2 },
    }),
  });
  if (!res.ok) return new Response(await res.text(), { status: res.status });

  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
