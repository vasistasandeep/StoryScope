interface ValidationMessageProps {
    message: string
    type: 'error' | 'warning' | 'success'
}

export default function ValidationMessage({ message, type }: ValidationMessageProps) {
    const getStyles = () => {
        const base = {
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
        }

        switch (type) {
            case 'error':
                return {
                    ...base,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                }
            case 'warning':
                return {
                    ...base,
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                }
            case 'success':
                return {
                    ...base,
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                }
        }
    }

    const getIcon = () => {
        switch (type) {
            case 'error':
                return '⚠️'
            case 'warning':
                return '⚡'
            case 'success':
                return '✅'
        }
    }

    return (
        <div style={getStyles()}>
            <span>{getIcon()}</span>
            <span>{message}</span>
        </div>
    )
}
