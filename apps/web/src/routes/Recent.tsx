import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type Story = { id: number; summary: string; description: string; labels: string[]; complexity_score: number }

export default function Recent() {
    const apiBase = useMemo(() => (import.meta as any).env.VITE_API_URL || '', [])
    const [stories, setStories] = useState<Story[]>([])
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const limit = 10

    useEffect(() => {
        (async () => {
            try {
                const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(search ? { search } : {}) })
                const res = await fetch(`${apiBase}/stories?${params.toString()}`)
                const data = await res.json()
                setStories(data.items || [])
                setTotal(data.total || 0)
            } catch (e: any) {
                setError(e?.message || 'Failed to load stories')
            }
        })()
    }, [page, search])

    return (
        <div>
            <h1>Recent Stories</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input placeholder="Search" value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} />
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
                {stories.map(s => (
                    <Link key={s.id} to={`/story/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <strong>#{s.id} {s.summary}</strong>
                                <span>Complexity: {s.complexity_score}</span>
                            </div>
                            {s.description && <p style={{ marginTop: 8 }}>{s.description}</p>}
                        </div>
                    </Link>
                ))}
                {stories.length === 0 && <p>No stories yet.</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                <div className="muted">Page {page} of {Math.max(1, Math.ceil(total / limit))}</div>
                <button onClick={() => setPage(p => (page * limit < total ? p + 1 : p))} disabled={page * limit >= total}>Next</button>
            </div>
        </div>
    )
}


