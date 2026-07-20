import { supabase } from '@/lib/supabase'
import { Star, Camera } from 'lucide-react'
import { formatTime } from '@/lib/utils'

export const revalidate = 120

async function getInstagramData() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const userId = process.env.INSTAGRAM_USER_ID
  if (!token || !userId) return null

  try {
    const since = Math.floor(Date.now() / 1000) - 7 * 86400
    const until = Math.floor(Date.now() / 1000)

    const [profileRes, insightsRes] = await Promise.all([
      fetch(`https://graph.instagram.com/me?fields=id,username,followers_count,follows_count,media_count&access_token=${token}`, { next: { revalidate: 3600 } }),
      fetch(`https://graph.instagram.com/${userId}/insights?metric=reach,follower_count&period=day&since=${since}&until=${until}&access_token=${token}`, { next: { revalidate: 3600 } }),
    ])

    const profile = await profileRes.json()
    const insights = await insightsRes.json()

    if (profile.error) return null

    const reachData = insights.data?.find((d: any) => d.name === 'reach')?.values ?? []
    const followerData = insights.data?.find((d: any) => d.name === 'follower_count')?.values ?? []

    const weeklyReach = reachData.reduce((sum: number, v: any) => sum + v.value, 0)
    const weeklyFollowers = followerData.reduce((sum: number, v: any) => sum + v.value, 0)

    return {
      followers: profile.followers_count as number,
      following: profile.follows_count as number,
      posts: profile.media_count as number,
      username: profile.username as string,
      weeklyReach,
      weeklyFollowers,
      reachDays: reachData.map((v: any) => v.value as number),
    }
  } catch {
    return null
  }
}

export default async function PersonalBrandPage() {
  const [{ data: ideas }, ig] = await Promise.all([
    supabase.from('ideas').select('*').order('created_at', { ascending: false }),
    getInstagramData(),
  ])

  const all = ideas ?? []
  const maxReach = ig && ig.reachDays.length > 0 ? Math.max(...ig.reachDays, 1) : 1

  return (
    <div className="page-pad" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div className="grad-icon" style={{ width: 40, height: 40, background: 'var(--accent-grad)' }}>
          <Star size={19} color="#fff" />
        </div>
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>Personal Brand</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>&ldquo;One System. Built to Win.&rdquo;</span>
      </div>

      {/* Top stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Ideas Captured', value: String(all.length), color: 'var(--accent)', sub: 'in the vault' },
          { label: 'Audience Growth', value: ig ? `+${ig.weeklyFollowers}` : '—', color: ig ? 'var(--green)' : 'var(--muted)', sub: 'this week' },
          { label: 'Content Published', value: ig ? String(ig.posts) : '—', color: ig ? 'var(--foreground)' : 'var(--muted)', sub: 'all-time posts' },
        ].map((s, i) => (
          <div key={i} className="stat-tile">
            <div className="stat-num" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-cap">{s.label}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {ig && (
        <div className="card2" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Camera size={13} color="#e1306c" />
            <span className="section-label" style={{ color: 'var(--foreground)' }}>Instagram — @{ig.username}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
            {[
              { label: 'Followers', value: ig.followers.toLocaleString(), color: '#e1306c' },
              { label: 'Following', value: ig.following.toLocaleString(), color: 'var(--foreground-2)' },
              { label: 'Weekly Reach', value: ig.weeklyReach.toLocaleString(), color: 'var(--accent)' },
              { label: 'New This Week', value: `+${ig.weeklyFollowers}`, color: 'var(--green)' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div className="stat-cap" style={{ marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="section-label" style={{ marginBottom: 10 }}>Daily Reach — Last 7 Days</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 48 }}>
              {ig.reachDays.map((v: number, i: number) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div
                    title={`${v} reach`}
                    style={{
                      width: '100%',
                      height: `${Math.max(4, (v / maxReach) * 44)}px`,
                      background: 'linear-gradient(to top, #6366f1, var(--accent-2))',
                      borderRadius: '3px 3px 0 0',
                      opacity: 0.6 + (i / Math.max(ig.reachDays.length - 1, 1)) * 0.4,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="section-label" style={{ marginBottom: 14 }}>
        Content Ideas ({all.length})
      </div>
      {all.length === 0 ? (
        <div className="card2" style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
          <div style={{ marginBottom: 8 }}>— no ideas captured yet —</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>Ask Atlas: &ldquo;surface content ideas from my captures and voice notes&rdquo;</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {all.map((idea: any) => (
            <div key={idea.id} className="list-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: 'var(--foreground)', fontWeight: 600, marginBottom: 3 }}>{idea.title}</div>
                {idea.description && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45 }}>{idea.description.slice(0, 100)}</div>}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatTime(idea.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
