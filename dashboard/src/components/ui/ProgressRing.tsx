// Circular progress ring with animated draw — the "current block" centerpiece.
export default function ProgressRing({
  pct, size = 108, stroke = 8, color = 'var(--accent)', track = 'var(--surface-3)', children,
}: { pct: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  const off = circ * (1 - clamped / 100)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
          className="ring-anim" style={{ ['--circ' as string]: circ }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        {children}
      </div>
    </div>
  )
}
