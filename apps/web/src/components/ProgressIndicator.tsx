interface ProgressIndicatorProps {
    current: number
    total: number
    labels?: string[]
}

export default function ProgressIndicator({ current, total, labels }: ProgressIndicatorProps) {
    const percentage = Math.round((current / total) * 100)
    
    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                    Progress: {current}/{total} fields completed
                </span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                    {percentage}%
                </span>
            </div>
            <div style={{ 
                width: '100%', 
                height: '8px', 
                backgroundColor: 'var(--border)', 
                borderRadius: '4px',
                overflow: 'hidden'
            }}>
                <div 
                    style={{ 
                        width: `${percentage}%`, 
                        height: '100%', 
                        backgroundColor: percentage === 100 ? 'var(--accent)' : 'var(--primary)',
                        transition: 'width 0.3s ease',
                        borderRadius: '4px'
                    }} 
                />
            </div>
            {labels && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    {labels.map((label, index) => (
                        <span 
                            key={index}
                            style={{ 
                                fontSize: '11px', 
                                color: index < current ? 'var(--accent)' : 'var(--muted)',
                                fontWeight: index < current ? '600' : '400'
                            }}
                        >
                            {label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}
