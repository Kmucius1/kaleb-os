// Premium area sparkline — gradient fill + animated line draw. Server-renderable.
export default function Sparkline({
  data, color = 'var(--accent)', width = 132, height = 44, strokeWidth = 2,
}: { data: number[]; color?: string; width?: number; height?: number; strokeWidth?: number }) {
  const pts = data.length >= 2 ? data : [data[0] ?? 0, data[0] ?? 0]
  const min = Math.min(...pts), max = Math.max(...pts)
  const range = max - min || 1
  const pad = 3
  const coords = pts.map((d, i) => [
    (i / (pts.length - 1)) * width,
    height - pad - ((d - min) / range) * (height - pad * 2),
  ])
  const line = coords.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${width} ${height} L 0 ${height} Z`
  // Stable gradient id per color (duplicates across same-color sparklines are harmless).
  const gid = 'spk-' + String(color).replace(/[^a-z0-9]/gi, '')
  // Approx path length for the draw animation.
  const len = Math.round(width * 1.4)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round"
        className="spark-anim" style={{ ['--len' as string]: len, strokeDasharray: len }}
      />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="2.6" fill={color} />
    </svg>
  )
}
