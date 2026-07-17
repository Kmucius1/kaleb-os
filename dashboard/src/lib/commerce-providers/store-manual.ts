// Commerce Phase 2 — 2a store adapter (zero external deps).
// No Shopify account exists yet, so this bridges the gap: it never creates a
// real listing, it just flags that a short manual AutoDS -> Shopify import
// step is required before checkout can go live. Swapped for store-shopify.ts
// in Phase 2b once COMMERCE_LIVE_MODE=live and Shopify creds exist.

import type { BuildProduct, StoreListing, StoreProvider, SupplierMatch } from './types'

export class ManualBridgeStoreProvider implements StoreProvider {
  readonly name = 'manual-bridge'

  async createDraftProduct(
    _product: BuildProduct,
    _sourcing: SupplierMatch | null
  ): Promise<StoreListing> {
    return {
      shopifyProductId: null,
      variantId: null,
      checkoutUrl: null,
      manualStepRequired: true,
      notes:
        '2-min manual step: import the supplier URL into AutoDS → Shopify, then paste the Shopify variant ID (or cart permalink) back into Kaleb OS to go live.',
    }
  }

  async publishProduct(_shopifyProductId: string): Promise<void> {
    // No-op: nothing to publish until a real store adapter is wired in 2b.
    return
  }
}
