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
    <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <Star size={16} color="var(--accent)" />
        <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em' }}>PERSONAL BRAND</span>
        <span style={{ color: 'var(--muted)', fontSize: 10 }}>"One System. Built to Win."</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'IDEAS CAPTURED', value: String(all.length), color: '#8b5cf6' },
          { label: 'AUDIENCE GROWTH', value: ig ? `+${ig.weeklyFollowers}` : '—', color: ig ? '#10b981' : 'var(--muted)' },
          { label: 'CONTENT PUBLISHED', value: ig ? String(ig.posts) : '—', color: ig ? 'var(--foreground)' : 'var(--muted)' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px' }}>
            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {ig && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Camera size={12} color="#e1306c" />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em' }}>INSTAGRAM — @{ig.username}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'FOLLOWERS', value: ig.followers.toLocaleString(), color: '#e1306c' },
              { label: 'FOLLOWING', value: ig.following.toLocaleString(), color: 'var(--muted)' },
              { label: 'WEEKLY REACH', value: ig.weeklyReach.toLocaleString(), color: '#8b5cf6' },
              { label: 'NEW THIS WEEK', value: `+${ig.weeklyFollowers}`, color: '#10b981' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 5 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>DAILY REACH — LAST 7 DAYS</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
              {ig.reachDays.map((v: number, i: number) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div
                    title={`${v} reach`}
                    style={{
                      width: '100%',
                      height: `${Math.max(4, (v / maxReach) * 44)}px`,
                      background: 'linear-gradient(to top, #6d28d9, #8b5cf6)',
                      borderRadius: '2px 2px 0 0',
                      opacity: 0.6 + (i / Math.max(ig.reachDays.length - 1, 1)) * 0.4,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 12 }}>
        CONTENT IDEAS ({all.length})
      </div>
      {all.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
          <div style={{ marginBottom: 8 }}>— no ideas captured yet —</div>
          <div style={{ fontSize: 10, color: '#333' }}>Ask Atlas: "surface content ideas from my captures and voice notes"</div>
        </div>
      ) : (
        all.map((idea: any) => (
          <div key={idea.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--foreground)', fontWeight: 600, marginBottom: 3 }}>{idea.title}</div>
              {idea.description && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{idea.description.slice(0, 100)}</div>}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap', marginLeft: 12 }}>{formatTime(idea.created_at)}</div>
          </div>
        ))
      )}
    </div>
  )
}
