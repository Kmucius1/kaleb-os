import { generateContentPiece, type Platform } from "@/lib/content";

// POST /api/scripts/generate  { brandSlug, topic, platform, research? }
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { brandSlug, topic, platform, research } = body as {
      brandSlug?: string; topic?: string; platform?: Platform; research?: string;
    };
    if (!brandSlug || !topic || !platform) {
      return Response.json(
        { error: "brandSlug, topic, and platform are required" },
        { status: 400 }
      );
    }
    const result = await generateContentPiece({ brandSlug, topic, platform, research });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
