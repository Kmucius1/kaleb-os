import type { Viewport } from 'next'

// Public storefront shell — bright, customer-facing, no OS chrome, no auth queries.
// Overrides the dark root themeColor for these pages.
export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#ffffff',
        color: '#0a0a0a',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        minHeight: '100dvh',
      }}
    >
      {children}
    </div>
  )
}
