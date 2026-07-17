// Commerce Phase 2 — provider factory.
// Env-driven seam: 2a always returns the zero-dependency stubs below. In 2b,
// once external accounts/creds exist, flip COMMERCE_LIVE_MODE=live and the
// live branches (guarded by their own required env vars) take over —
// the orchestrator (commerce-build.ts) never has to change either way.

import type { SourcingProvider, StoreProvider } from './types'
import { LlmSourcingProvider } from './sourcing-llm'
import { ManualBridgeStoreProvider } from './store-manual'

export function getSourcingProvider(): SourcingProvider {
  // TODO Phase 2b: if (process.env.COMMERCE_LIVE_MODE === 'live' && process.env.AUTODS_API_KEY) return new AutodsSourcingProvider()
  return new LlmSourcingProvider()
}

export function getStoreProvider(): StoreProvider {
  // TODO Phase 2b: if (process.env.COMMERCE_LIVE_MODE === 'live' && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) return new ShopifyStoreProvider()
  return new ManualBridgeStoreProvider()
}
