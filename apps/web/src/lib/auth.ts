export function isAuthed() {
    return !!localStorage.getItem('storyscope.token')
}

export function logout() {
    localStorage.removeItem('storyscope.token')
    localStorage.removeItem('storyscope.user')
}

export function getUser() {
    try { return JSON.parse(localStorage.getItem('storyscope.user') || 'null') } catch { return null }
}


