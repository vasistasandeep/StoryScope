import { useEffect, useRef } from 'react'

type Particle = { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number }

export default function Confetti({ trigger }: { trigger: number }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const raf = useRef<number | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        const dpr = window.devicePixelRatio || 1
        const resize = () => {
            canvas.width = canvas.clientWidth * dpr
            canvas.height = canvas.clientHeight * dpr
            ctx.scale(dpr, dpr)
        }
        resize()
        const onResize = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); resize() }
        window.addEventListener('resize', onResize)

        let particles: Particle[] = []
        const colors = ['#7de2d1', '#6c8cff', '#ffd166', '#ef476f']
        const burst = () => {
            const w = canvas.clientWidth
            const h = canvas.clientHeight
            for (let i = 0; i < 120; i++) {
                particles.push({
                    x: w / 2,
                    y: h / 3,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 1) * 6,
                    size: 2 + Math.random() * 3,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    life: 60 + Math.random() * 40,
                })
            }
        }

        burst()

        const tick = () => {
            ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
            particles.forEach(p => {
                p.vy += 0.08
                p.x += p.vx
                p.y += p.vy
                p.life -= 1
                ctx.fillStyle = p.color
                ctx.fillRect(p.x, p.y, p.size, p.size)
            })
            particles = particles.filter(p => p.life > 0 && p.y < canvas.clientHeight + 20)
            raf.current = requestAnimationFrame(tick)
        }
        raf.current = requestAnimationFrame(tick)

        return () => {
            if (raf.current) cancelAnimationFrame(raf.current)
            window.removeEventListener('resize', onResize)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trigger])

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
    )
}


