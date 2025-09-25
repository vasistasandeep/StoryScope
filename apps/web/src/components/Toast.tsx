import { useEffect, useState } from 'react'

export default function Toast({ text, show, onHide }: { text: string; show: boolean; onHide?: () => void }) {
    const [visible, setVisible] = useState(show)
    useEffect(() => {
        setVisible(show)
        if (show) {
            const t = setTimeout(() => { setVisible(false); onHide && onHide() }, 2200)
            return () => clearTimeout(t)
        }
    }, [show])
    if (!visible) return null
    return (
        <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 10 }}>
            <div style={{ background: 'rgba(17,20,24,0.9)', color: 'var(--text)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>
                {text}
            </div>
        </div>
    )
}


