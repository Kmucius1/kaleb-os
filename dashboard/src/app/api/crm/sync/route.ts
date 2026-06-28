import { syncClientBrands } from "@/lib/crm-sync";

// POST /api/crm/sync — mirror DRYP CRM social/ads clients into the content engine.
export async function POST() {
  try {
    const result = await syncClientBrands();
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
