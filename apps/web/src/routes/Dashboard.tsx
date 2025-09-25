import { useEffect, useMemo, useState } from 'react'
import Modal from '../components/Modal'

type Stat = {
    total: number
    average_complexity: number
    latest: { id: number; summary: string; complexity_score: number; created_at?: string }[]
}

export default function Dashboard() {
    const apiBase = useMemo(() => (import.meta as any).env.VITE_API_URL || '', [])
    const [stats, setStats] = useState<Stat | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${apiBase}/stats`)
                const data = await res.json()
                setStats(data)
            } catch (e: any) {
                setError(e?.message || 'Failed to load stats')
            }
        })()
    }, [])

    const streak = Math.min(7, Math.max(0, Math.floor((stats?.total || 0) / 3)))
    const level = Math.min(10, Math.floor((stats?.total || 0) / 5))
    const progress = Math.min(100, ((stats?.total || 0) % 5) * 20)

    const [showBadge, setShowBadge] = useState(false)
    useEffect(() => {
        const total = stats?.total || 0
        if (total === 5) setShowBadge(true)
    }, [stats?.total])

    return (
        <div>
            <h1>Dashboard</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div className="panel card">
                    <div className="muted">Total Stories</div>
                    <div style={{ fontSize: 36, fontWeight: 800 }}>{stats?.total ?? '—'}</div>
                </div>
                <div className="panel card">
                    <div className="muted">Avg Complexity</div>
                    <div style={{ fontSize: 36, fontWeight: 800 }}>{stats?.average_complexity ?? '—'}</div>
                </div>
                <div className="panel card">
                    <div className="muted">Level</div>
                    <div style={{ fontSize: 36, fontWeight: 800 }}>L{level}</div>
                    <div style={{ marginTop: 8, height: 8, background: '#141820', borderRadius: 8 }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--primary))', borderRadius: 8 }} />
                    </div>
                </div>
            </div>

            {/* XP widget */}
            <div className="panel card" style={{ marginTop: 16 }}>
                <h2>XP Progress</h2>
                {(() => {
                    const total = stats?.total || 0
                    const avg = stats?.average_complexity || 0
                    const xp = total * 10 + Math.round(avg)
                    const nextMilestone = Math.ceil(xp / 100) * 100 || 100
                    const pct = Math.min(100, Math.round((xp % 100) / 100 * 100))
                    return (
                        <div>
                            <div className="muted">{xp} XP • Next reward at {nextMilestone} XP</div>
                            <div style={{ marginTop: 8, height: 10, background: '#141820', borderRadius: 999 }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #ffd166, var(--accent))', borderRadius: 999 }} />
                            </div>
                            {pct >= 90 && <p style={{ color: '#ffd166', marginTop: 8 }}>Almost there! One more estimate to unlock a badge 🎉</p>}
                        </div>
                    )
                })()}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="panel card">
                    <h2>Streak</h2>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[...Array(7)].map((_, i) => (
                            <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: i < streak ? 'var(--accent)' : 'var(--border)' }} />
                        ))}
                    </div>
                    <p className="muted">Keep a 7‑day streak to earn a badge!</p>
                </div>
                <div className="panel card">
                    <h2>Latest</h2>
                    <ul>
                        {stats?.latest?.map(item => (
                            <li key={item.id}>#{item.id} {item.summary} — {item.complexity_score}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="panel card" style={{ marginTop: 16 }}>
                <h2>Achievements</h2>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Badge label="First 5" unlocked={(stats?.total || 0) >= 5} />
                    <Badge label="Week Streak" unlocked={streak >= 7} />
                    <Badge label="High Complexity" unlocked={(stats?.latest || []).some(l => (l.complexity_score || 0) >= 13)} />
                </div>
                <div style={{ marginTop: 12 }}>
                    <a href="/report.csv" download>Download Report (CSV)</a>
                </div>
            </div>

            {showBadge && (
                <Modal title="Achievement Unlocked!" onClose={() => setShowBadge(false)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 999, background: 'linear-gradient(135deg, var(--accent), var(--primary))' }} />
                        <div>
                            <div style={{ fontWeight: 700 }}>First 5 Stories</div>
                            <div className="muted">Great start! Keep your streak going.</div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

function Badge({ label, unlocked }: { label: string; unlocked: boolean }) {
    return (
        <div title={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px dashed var(--border)', borderRadius: 999, opacity: unlocked ? 1 : 0.5 }}>
            <div style={{ width: 18, height: 18, borderRadius: 999, background: unlocked ? 'linear-gradient(135deg, var(--accent), var(--primary))' : 'var(--border)' }} />
            <span>{label}</span>
        </div>
    )
}


