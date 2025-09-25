import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

type User = { id: number; email: string; role: string; created_at: string }

export default function Admin() {
    const [users, setUsers] = useState<User[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch('/admin/users')
                setUsers(data)
            } catch (e: any) {
                setError('Forbidden or failed to load')
            }
        })()
    }, [])

    return (
        <div>
            <h1>Admin</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div className="panel card" style={{ overflowX: 'auto' }}>
                <table>
                    <thead><tr><th>ID</th><th>Email</th><th>Role</th><th>Created</th></tr></thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}><td>{u.id}</td><td>{u.email}</td><td>{u.role}</td><td>{u.created_at}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}


