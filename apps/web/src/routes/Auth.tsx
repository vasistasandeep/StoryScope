import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

export default function Auth() {
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        try {
            const res = await apiFetch(`/auth/${mode}`, { method: 'POST', body: JSON.stringify({ email, password }) })
            localStorage.setItem('storyscope.token', res.token)
            localStorage.setItem('storyscope.user', JSON.stringify(res.user))
            navigate('/')
        } catch (e: any) {
            setError('Invalid credentials')
        }
    }

    return (
        <div style={{ maxWidth: 420 }}>
            <h1>{mode === 'login' ? 'Login' : 'Create Account'}</h1>
            <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
                <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit">{mode === 'login' ? 'Login' : 'Sign up'}</button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <p className="muted" style={{ marginTop: 10 }}>
                {mode === 'login' ? (
                    <>No account? <a href="#" onClick={() => setMode('signup')}>Sign up</a></>
                ) : (
                    <>Have an account? <a href="#" onClick={() => setMode('login')}>Log in</a></>
                )}
            </p>
        </div>
    )
}


