import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import Tooltip from '../components/Tooltip'

type Story = { 
    id: number; 
    summary: string; 
    description: string; 
    labels: string[]; 
    complexity_score: number;
    story_points?: number;
    estimated_hours?: number;
    story_type?: string;
    confidence_level?: string;
    estimation_type: string;
    team: string;
    module: string;
    priority: number;
    tags: string;
    status: string;
    created_at: string;
}

const TEAMS = ['Backend', 'Frontend', 'QA', 'DevOps', 'Design', 'Product']
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low', 'Nice to have']
const STATUSES = ['estimated', 'in_progress', 'completed']

export default function Recent() {
    const [stories, setStories] = useState<Story[]>([])
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [filters, setFilters] = useState({
        team: '',
        estimationType: '',
        priority: '',
        status: ''
    })
    const [sortBy, setSortBy] = useState('created_at')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const limit = 10

    useEffect(() => {
        const controller = new AbortController()
        const id = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ 
                    page: String(page), 
                    limit: String(limit),
                    sortBy,
                    sortOrder,
                    ...(search ? { search } : {}),
                    ...(filters.team ? { team: filters.team } : {}),
                    ...(filters.estimationType ? { estimation_type: filters.estimationType } : {}),
                    ...(filters.priority ? { priority: filters.priority } : {}),
                    ...(filters.status ? { status: filters.status } : {})
                })
                const data = await apiFetch(`/stories?${params.toString()}`)
                setStories(data.items || [])
                setTotal(data.total || 0)
                setError(null)
            } catch (e: any) {
                setError('Could not fetch stories. Please try again.')
            }
        }, 250)
        return () => { clearTimeout(id); controller.abort() }
    }, [page, search, filters, sortBy, sortOrder])

    const updateFilter = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setPage(1)
    }

    const clearFilters = () => {
        setFilters({ team: '', estimationType: '', priority: '', status: '' })
        setSearch('')
        setPage(1)
    }

    const getPriorityLabel = (priority: number) => PRIORITIES[priority - 1] || 'Medium'
    const getPriorityColor = (priority: number) => {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
        return colors[priority - 1] || colors[2]
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return '#10b981'
            case 'in_progress': return '#f59e0b'
            default: return '#6b7280'
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1>Recent Stories</h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Tooltip content="Clear all filters and search">
                        <button onClick={clearFilters} style={{ padding: '6px 12px', fontSize: '12px' }}>
                            Clear Filters
                        </button>
                    </Tooltip>
                    <select 
                        value={`${sortBy}-${sortOrder}`} 
                        onChange={(e) => {
                            const [field, order] = e.target.value.split('-')
                            setSortBy(field)
                            setSortOrder(order as 'asc' | 'desc')
                        }}
                        style={{ fontSize: '12px' }}
                    >
                        <option value="created_at-desc">Newest First</option>
                        <option value="created_at-asc">Oldest First</option>
                        <option value="complexity_score-desc">Highest Complexity</option>
                        <option value="complexity_score-asc">Lowest Complexity</option>
                        <option value="priority-asc">Highest Priority</option>
                        <option value="priority-desc">Lowest Priority</option>
                    </select>
                </div>
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            
            {/* Search and Filters */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', 
                gap: 12, 
                marginBottom: 20,
                alignItems: 'center'
            }}>
                <input 
                    placeholder="🔍 Search stories..." 
                    value={search} 
                    onChange={e => { setPage(1); setSearch(e.target.value) }}
                    style={{
                        padding: '10px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'var(--input-bg)',
                        color: 'var(--text)'
                    }}
                />
                <select 
                    value={filters.team} 
                    onChange={e => updateFilter('team', e.target.value)}
                    style={{
                        padding: '10px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'var(--input-bg)',
                        color: 'var(--text)'
                    }}
                >
                    <option value="">👥 All Teams</option>
                    {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
                </select>
                <select 
                    value={filters.estimationType} 
                    onChange={e => updateFilter('estimationType', e.target.value)}
                    style={{
                        padding: '10px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'var(--input-bg)',
                        color: 'var(--text)'
                    }}
                >
                    <option value="">📊 All Types</option>
                    <option value="story">Story-level</option>
                    <option value="module">Module-level</option>
                </select>
                <select 
                    value={filters.priority} 
                    onChange={e => updateFilter('priority', e.target.value)}
                    style={{
                        padding: '10px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'var(--input-bg)',
                        color: 'var(--text)'
                    }}
                >
                    <option value="">⚡ All Priorities</option>
                    {PRIORITIES.map((priority, index) => (
                        <option key={index} value={index + 1}>{priority}</option>
                    ))}
                </select>
                <select 
                    value={filters.status} 
                    onChange={e => updateFilter('status', e.target.value)}
                    style={{
                        padding: '10px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: 'var(--input-bg)',
                        color: 'var(--text)'
                    }}
                >
                    <option value="">📋 All Statuses</option>
                    {STATUSES.map(status => (
                        <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </option>
                    ))}
                </select>
            </div>

            {/* Stories List */}
            <div style={{ display: 'grid', gap: 12 }}>
                {stories.map(s => (
                    <Link key={s.id} to={`/story/${s.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ 
                            border: '1px solid var(--border)', 
                            borderRadius: 8, 
                            padding: 16,
                            background: 'var(--card-bg)',
                            transition: 'all 0.2s ease'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <strong style={{ fontSize: '16px' }}>#{s.id} {s.summary}</strong>
                                        <span style={{ 
                                            fontSize: '10px', 
                                            padding: '2px 6px', 
                                            borderRadius: '4px',
                                            background: s.estimation_type === 'module' ? 'var(--accent)' : 'var(--primary)',
                                            color: 'white',
                                            fontWeight: '600'
                                        }}>
                                            {s.estimation_type?.toUpperCase() || 'STORY'}
                                        </span>
                                        {s.status === 'estimated' && (
                                            <span style={{ 
                                                fontSize: '10px', 
                                                padding: '2px 6px', 
                                                borderRadius: '4px',
                                                background: '#10b981',
                                                color: 'white',
                                                fontWeight: '600'
                                            }}>
                                                ✅ ESTIMATED
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Estimation Details */}
                                    <div style={{ 
                                        background: 'rgba(108, 140, 255, 0.1)', 
                                        padding: '8px 12px', 
                                        borderRadius: '6px', 
                                        marginBottom: '8px',
                                        border: '1px solid rgba(108, 140, 255, 0.2)'
                                    }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)', marginBottom: '4px' }}>
                                            📊 Estimated: {s.estimated_hours || 8} hours ({s.story_points || 1} story points)
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                            🎯 Type: {s.story_type || 'general'} | Confidence: {s.confidence_level || 'medium'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 12, fontSize: '12px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                                        {s.team && <span>👥 Team: {s.team}</span>}
                                        {s.module && <span>📦 Module: {s.module}</span>}
                                        <span style={{ color: getPriorityColor(s.priority), fontWeight: '600' }}>
                                            ⚡ {getPriorityLabel(s.priority)}
                                        </span>
                                        <span style={{ color: getStatusColor(s.status), fontWeight: '600' }}>
                                            📋 {s.status?.replace('_', ' ').toUpperCase() || 'ESTIMATED'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent)' }}>
                                        {s.complexity_score}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                                        Complexity Score
                                    </div>
                                </div>
                            </div>
                            {s.description && (
                                <p style={{ 
                                    marginTop: 8, 
                                    fontSize: '14px', 
                                    color: 'var(--muted)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                }}>
                                    {s.description}
                                </p>
                            )}
                            {(s.labels?.length > 0 || s.tags) && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                    {s.labels?.map((label, index) => (
                                        <span key={index} style={{ 
                                            fontSize: '10px', 
                                            padding: '2px 6px', 
                                            background: 'var(--border)', 
                                            borderRadius: '4px',
                                            color: 'var(--muted)'
                                        }}>
                                            {label}
                                        </span>
                                    ))}
                                    {s.tags?.split(',').map((tag, index) => (
                                        <span key={`tag-${index}`} style={{ 
                                            fontSize: '10px', 
                                            padding: '2px 6px', 
                                            background: 'var(--primary)', 
                                            borderRadius: '4px',
                                            color: 'white'
                                        }}>
                                            {tag.trim()}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
                {stories.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                        <p>No stories found matching your criteria.</p>
                        <button onClick={clearFilters} style={{ marginTop: '12px' }}>
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1}
                    style={{ opacity: page === 1 ? 0.5 : 1 }}
                >
                    Previous
                </button>
                <div className="muted">
                    Page {page} of {Math.max(1, Math.ceil(total / limit))} • {total} total stories
                </div>
                <button 
                    onClick={() => setPage(p => (page * limit < total ? p + 1 : p))} 
                    disabled={page * limit >= total}
                    style={{ opacity: page * limit >= total ? 0.5 : 1 }}
                >
                    Next
                </button>
            </div>
        </div>
    )
}


