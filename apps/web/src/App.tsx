import { NavLink, Outlet } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
      <aside style={{ borderRight: '1px solid var(--border)', padding: 20, background: 'linear-gradient(180deg, #0c1016, #0b0d12 30%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--primary))' }} />
          <h2 style={{ margin: 0 }}>Story Scope</h2>
        </div>
        <nav style={{ display: 'grid', gap: 6 }}>
          <NavLink to="/" end style={({ isActive }) => ({ padding: '10px 12px', borderRadius: 10, color: isActive ? '#fff' : 'var(--muted)', background: isActive ? 'rgba(124, 226, 209, 0.12)' : 'transparent' })}>Dashboard</NavLink>
          <NavLink to="/submit" style={({ isActive }) => ({ padding: '10px 12px', borderRadius: 10, color: isActive ? '#fff' : 'var(--muted)', background: isActive ? 'rgba(108, 140, 255, 0.12)' : 'transparent' })}>Submit Story</NavLink>
          <NavLink to="/recent" style={({ isActive }) => ({ padding: '10px 12px', borderRadius: 10, color: isActive ? '#fff' : 'var(--muted)', background: isActive ? 'rgba(124, 226, 209, 0.12)' : 'transparent' })}>Recent Stories</NavLink>
          <NavLink to="/settings" style={({ isActive }) => ({ padding: '10px 12px', borderRadius: 10, color: isActive ? '#fff' : 'var(--muted)', background: isActive ? 'rgba(108, 140, 255, 0.12)' : 'transparent' })}>Settings</NavLink>
        </nav>
        <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>v0.1 • Gamified</div>
      </aside>
      <div style={{ display: 'grid', gridTemplateRows: '60px 1fr' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'rgba(14,17,22,0.6)', backdropFilter: 'blur(6px)' }}>
          <div className="muted">Make estimation fun — keep your streak 🔥</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button>New Story</button>
          </div>
        </header>
        <main style={{ padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default App
