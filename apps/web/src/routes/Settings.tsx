import { useEffect, useState } from 'react'

export default function Settings() {
    const [apiUrl, setApiUrl] = useState('')
    const [features, setFeatures] = useState({ confetti: true, toasts: true })
    const [importPreview, setImportPreview] = useState<string[][]>([])

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

    const downloadTemplate = () => {
        window.open('/jira/template.csv', '_blank')
    }

    const exportCsv = async () => {
        const res = await fetch('/jira/export', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('storyscope.token') || ''}` } })
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'jira_export.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const text = await file.text()
        const rows = text.split(/\r?\n/).filter(Boolean).map(r => r.split(','))
        setImportPreview(rows.slice(0, 6))
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

            <div className="panel card" style={{ maxWidth: 720, marginTop: 16 }}>
                <h2>Jira Integration (CSV)</h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={downloadTemplate}>Download Template</button>
                    <button onClick={exportCsv}>Export Stories CSV</button>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <input type="file" accept=".csv" onChange={onImport} /> Import CSV
                    </label>
                </div>
                {importPreview.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <div className="muted">Preview first 5 rows</div>
                        <div className="panel card" style={{ overflowX: 'auto' }}>
                            <table>
                                <tbody>
                                    {importPreview.map((r, i) => (
                                        <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: '4px 8px' }}>{c}</td>)}</tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}


