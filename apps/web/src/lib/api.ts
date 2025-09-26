export function getApiBase() {
    const override = localStorage.getItem('storyscope.apiUrl')
    // In production, API is served from the same domain
    // In development, it might be a different port
    return override || (import.meta as any).env.VITE_API_URL || (window.location.origin)
}

export function getToken() {
    return localStorage.getItem('storyscope.token') || ''
}

export async function apiFetch(path: string, init: RequestInit = {}) {
    const base = getApiBase()
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as any || {}) }
    const token = getToken()
    
    // Debug logging
    console.log('API Request:', { base, path, token: token ? 'present' : 'missing' })
    
    if (token) headers['Authorization'] = `Bearer ${token}`
    const url = `${base}${path}`
    
    console.log('Making request to:', url, 'with headers:', headers)
    
    const res = await fetch(url, { ...init, headers })
    
    console.log('Response:', res.status, res.statusText)
    
    if (!res.ok) {
        const errorText = await res.text()
        console.error('API Error:', res.status, errorText)
        throw new Error(`${res.status}: ${errorText}`)
    }
    return res.json()
}


