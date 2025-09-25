import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

type Story = { id: number; summary: string; description: string; labels: string[]; complexity_score: number }

export default function StoryDetail() {
    const { id } = useParams()
    const apiBase = useMemo(() => (import.meta as any).env.VITE_API_URL || '', [])
    const [story, setStory] = useState<Story | null>(null)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${apiBase}/stories/${id}`)
                const data = await res.json()
                if (res.ok) setStory(data)
                else setError(data?.error || 'Failed to load')
            } catch (e: any) {
                setError(e?.message || 'Failed to load')
            }
        })()
    }, [id])

    const onDelete = async () => {
        if (!id) return
        const res = await fetch(`${apiBase}/stories/${id}`, { method: 'DELETE' })
        if (res.ok) navigate('/recent')
    }

    if (error) return <p style={{ color: 'red' }}>{error}</p>
    if (!story) return <p>Loading…</p>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>#{story.id} {story.summary}</h1>
                <button onClick={onDelete}>Delete</button>
            </div>
            <p>Complexity: <strong>{story.complexity_score}</strong></p>
            {story.description && <p style={{ marginTop: 8 }}>{story.description}</p>}
            {story.labels?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {story.labels.map((l, i) => (
                        <span key={i} style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 12 }}>{l}</span>
                    ))}
                </div>
            )}
        </div>
    )
}


