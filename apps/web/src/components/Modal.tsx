export default function Modal({ title, children, onClose }: { title: string; children: any; onClose: () => void }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
            <div style={{ width: 420, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>{title}</h2>
                    <button onClick={onClose}>Close</button>
                </div>
                <div style={{ marginTop: 10 }}>{children}</div>
            </div>
        </div>
    )
}


