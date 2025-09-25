import { useEffect, useMemo, useState } from 'react'
import './App.css'

type Story = {
  id: number
  summary: string
  description: string
  labels: string[]
  complexity_score: number
}

function App() {
  const apiBase = useMemo(() => (
    (import.meta as any).env.VITE_API_URL || ''
  ), [])

  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [labels, setLabels] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stories, setStories] = useState<Story[]>([])

  const fetchStories = async () => {
    try {
      setError(null)
      const res = await fetch(`${apiBase}/stories`)
      const data = await res.json()
      setStories(data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load stories')
    }
  }

  useEffect(() => {
    fetchStories()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          description,
          labels: labels.split(',').map(s => s.trim()).filter(Boolean)
        })
      })
      if (!res.ok) throw new Error('Request failed')
      await fetchStories()
      setSummary('')
      setDescription('')
      setLabels('')
    } catch (e: any) {
      setError(e?.message || 'Failed to estimate story')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
      <h1>Story Scope</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <input
          placeholder="Summary"
          value={summary}
          onChange={e => setSummary(e.target.value)}
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={5}
        />
        <input
          placeholder="Labels (comma separated)"
          value={labels}
          onChange={e => setLabels(e.target.value)}
        />
        <button disabled={loading} type="submit">
          {loading ? 'Estimating…' : 'Estimate'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2 style={{ marginTop: 24 }}>Recent Stories</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {stories.map(s => (
          <div key={s.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>#{s.id} {s.summary}</strong>
              <span>Complexity: {s.complexity_score}</span>
            </div>
            {s.description && <p style={{ marginTop: 8 }}>{s.description}</p>}
            {s.labels?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {s.labels.map((l, i) => (
                  <span key={i} style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 12 }}>{l}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {stories.length === 0 && <p>No stories yet.</p>}
      </div>
    </div>
  )
}

export default App
