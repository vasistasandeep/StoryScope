import { useEffect, useState } from 'react'

export default function Settings() {
    const [apiUrl, setApiUrl] = useState('')
    const [features, setFeatures] = useState({ confetti: true, toasts: true })

    useEffect(() => {
        const savedUrl = localStorage.getItem('storyscope.apiUrl') || ''
        const savedFeat = localStorage.getItem('storyscope.features')
        if (savedUrl) setApiUrl(savedUrl)
        if (savedFeat) setFeatures(JSON.parse(savedFeat))
    }, [])

    const save = () => {
        localStorage.setItem('storyscope.apiUrl', apiUrl)
        localStorage.setItem('storyscope.features', JSON.stringify(features))
        alert('Settings saved. Reload the app to apply API URL override.')
    }

    return (
        <div>
            <h1>Settings</h1>
            <div className="panel card" style={{ maxWidth: 720 }}>
                <h2>API</h2>
                <p className="muted">Override API base URL for this browser.</p>
                <input placeholder="https://your-api" value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
            </div>
            <div className="panel card" style={{ maxWidth: 720, marginTop: 12 }}>
                <h2>Features</h2>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={features.confetti} onChange={e => setFeatures(f => ({ ...f, confetti: e.target.checked }))} /> Confetti
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={features.toasts} onChange={e => setFeatures(f => ({ ...f, toasts: e.target.checked }))} /> Toasts
                </label>
            </div>
            <div style={{ marginTop: 12 }}>
                <button onClick={save}>Save</button>
            </div>
        </div>
    )
}


