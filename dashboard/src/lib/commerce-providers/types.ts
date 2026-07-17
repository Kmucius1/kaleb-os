// Commerce Phase 2 — adapter-seam types.
// Shared shapes for the sourcing/store adapters that fan an approved winner
// out into a sourcing brief, a Shopify draft listing, and a landing page.
// Stub (2a) and real (2b) providers both implement the interfaces below so
// the orchestrator (`commerce-build.ts`) never has to change.

export type BuildProduct = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  image_url: string | null;
  source_url: string | null;
  supplier_cost: number | null;
  suggested_price: number | null;
  scores: Record<string, { score: number; note: string }>;
  reasoning: string | null;
};

export type SupplierMatch = {
  supplier: 'aliexpress' | 'cjdropshipping';
  supplierUrl: string;
  cost: number;
  shippingDays: number | null;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
  alternates?: { supplierUrl: string; cost: number; notes: string }[];
};

export type StoreListing = {
  shopifyProductId: string | null;
  variantId: string | null;
  checkoutUrl: string | null;
  manualStepRequired: boolean;
  notes?: string;
};

export type LandingCopy = {
  seoTitle: string;
  seoDescription: string;
  heroBadge: string;
  headline: string;
  subhead: string;
  bullets: string[];
  features: { title: string; body: string }[];
  socialProof: { quote: string; name: string }[];
  faq: { q: string; a: string }[];
  guarantee: string;
  cta: string;
  urgency: string | null;
};

export interface SourcingProvider {
  readonly name: string;
  findSupplier(product: BuildProduct): Promise<SupplierMatch>;
}

export interface StoreProvider {
  readonly name: string;
  createDraftProduct(product: BuildProduct, sourcing: SupplierMatch | null): Promise<StoreListing>;
  publishProduct(shopifyProductId: string): Promise<void>;
}
