export default function Sparkline({
  values,
  color,
  width = 90,
  height = 36,
}: {
  values: number[]
  color: string
  width?: number
  height?: number
}) {
  if (!values || values.length < 2) {
    return <svg width={width} height={height} />
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const pad = 3

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const lastX = pad + (width - pad * 2)
  const lastY = pad + (1 - (values[values.length - 1] - min) / range) * (height - pad * 2)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  )
}
