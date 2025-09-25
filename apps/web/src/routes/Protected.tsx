import { Navigate, Outlet } from 'react-router-dom'
import { isAuthed } from '../lib/auth'

export default function Protected() {
    if (!isAuthed()) return <Navigate to="/auth" replace />
    return <Outlet />
}


