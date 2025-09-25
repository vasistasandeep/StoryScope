import { useState } from 'react'
import Confetti from '../components/Confetti'
import Toast from '../components/Toast'
import { apiFetch } from '../lib/api'

export default function Submit() {
    const [summary, setSummary] = useState('')
    const [description, setDescription] = useState('')
    const [labels, setLabels] = useState('')
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [burst, setBurst] = useState(0)
    const [toast, setToast] = useState(false)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMsg(null)
        setError(null)
        try {
            await apiFetch(`/estimate`, {
                method: 'POST',
                body: JSON.stringify({
                    summary,
                    description,
                    labels: labels.split(',').map(s => s.trim()).filter(Boolean)
                })
            })
            setSummary('')
            setDescription('')
            setLabels('')
            setMsg('Saved! Check Recent Stories.')
            setBurst(b => b + 1)
            setToast(true)
        } catch (e: any) {
            setError(e?.message || 'Failed to estimate story')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            {burst > 0 && <Confetti trigger={burst} />}
            <Toast text="Story saved! +1" show={toast} onHide={() => setToast(false)} />
            <h1>Submit Story</h1>
            <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 700 }}>
                <input placeholder="Summary" value={summary} onChange={e => setSummary(e.target.value)} required />
                <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={6} />
                <input placeholder="Labels (comma separated)" value={labels} onChange={e => setLabels(e.target.value)} />
                <button disabled={loading} type="submit">{loading ? 'Estimating…' : 'Estimate'}</button>
            </form>
            {msg && <p style={{ color: 'green' }}>{msg}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    )
}


