export function getApiBase() {
    const override = localStorage.getItem('storyscope.apiUrl')
    return override || (import.meta as any).env.VITE_API_URL || '/api'
}

export function getToken() {
    return localStorage.getItem('storyscope.token') || ''
}

export async function apiFetch(path: string, init: RequestInit = {}) {
    const base = getApiBase()
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as any || {}) }
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${base}${path}`, { ...init, headers })
    if (!res.ok) throw new Error(`${res.status}`)
    return res.json()
}


