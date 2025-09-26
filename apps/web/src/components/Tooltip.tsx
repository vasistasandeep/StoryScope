import { useState, type ReactNode } from 'react'

interface TooltipProps {
    content: string
    children: ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
    const [visible, setVisible] = useState(false)

    const getPositionStyles = () => {
        const base = {
            position: 'absolute' as const,
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            maxWidth: '200px',
            whiteSpace: 'normal' as const,
        }

        switch (position) {
            case 'top':
                return {
                    ...base,
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '5px',
                }
            case 'bottom':
                return {
                    ...base,
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '5px',
                }
            case 'left':
                return {
                    ...base,
                    right: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginRight: '5px',
                }
            case 'right':
                return {
                    ...base,
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginLeft: '5px',
                }
        }
    }

    return (
        <div
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div style={getPositionStyles()}>
                    {content}
                </div>
            )}
        </div>
    )
}
