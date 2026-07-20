// Minimal bar chart (Apple Health / Stripe style) — colored bars, no axes.
export default function MiniBars({
  data, color = 'var(--accent)', width = 150, height = 46, gap = 3,
}: { data: number[]; color?: string; width?: number; height?: number; gap?: number }) {
  const pts = data.length ? data : [0]
  const max = Math.max(...pts.map(Math.abs), 1)
  const bw = (width - gap * (pts.length - 1)) / pts.length
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {pts.map((v, i) => {
        const h = Math.max(2, (Math.abs(v) / max) * (height - 2))
        const neg = v < 0
        return (
          <rect key={i} x={i * (bw + gap)} y={height - h} width={bw} height={h} rx={Math.min(2.5, bw / 2)}
            fill={neg ? 'var(--red)' : color} opacity={neg ? 0.85 : 0.9} />
        )
      })}
    </svg>
  )
}
