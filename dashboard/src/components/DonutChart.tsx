export default function DonutChart({
  percent,
  color,
  size = 76,
}: {
  percent: number
  color: string
  size?: number
}) {
  const r = (size - 14) / 2
  const cx = size / 2
  const cy = size / 2
  const circ = 2 * Math.PI * r
  const dashOffset = circ - (Math.min(Math.max(percent, 0), 100) / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e1e1e" strokeWidth="7" />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={circ}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx} y={cy + 5}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        style={{ fill: 'var(--foreground)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
      >
        {percent}%
      </text>
    </svg>
  )
}
