// Instant loading skeleton shown the moment a tab is tapped, while the server
// renders the real page. Keeps the shell + tab bar in place so navigation feels
// immediate instead of freezing on the old page.
export default function PageSkeleton({
  cards = 4,
  springboard = false,
}: { cards?: number; springboard?: boolean }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 14px 28px' }}>
      <div className="skel" style={{ height: 30, width: 180, margin: '4px 6px 6px' }} />
      <div className="skel" style={{ height: 14, width: 240, margin: '0 6px 22px', opacity: 0.6 }} />
      {springboard ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, padding: '0 6px' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="skel" style={{ width: 58, height: 58, borderRadius: 15 }} />
              <div className="skel" style={{ width: 40, height: 9 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="skel" style={{ height: i === 0 ? 120 : 88 }} />
          ))}
        </div>
      )}
    </div>
  )
}
