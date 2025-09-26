import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import Tooltip from '../components/Tooltip'
import ValidationMessage from '../components/ValidationMessage'

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
    baseline_reference?: {
        type: string;
        hours: number;
        description: string;
    };
    analysis?: {
        token_count: number;
        uncertainty_factor: number;
        technical_factor: number;
        team_factor: number;
        priority_factor: number;
        story_type_factor: number;
    };
    estimation_type: string;
    team: string;
    module: string;
    priority: number;
    tags: string;
    status: string;
    actual_effort?: number;
    feedback_provided: boolean;
    created_at?: string;
}

type Comment = {
    id: number;
    content: string;
    user_email: string;
    created_at: string;
}

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low', 'Nice to have']

export default function StoryDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [story, setStory] = useState<Story | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [error, setError] = useState<string | null>(null)
    const [newComment, setNewComment] = useState('')
    const [feedbackForm, setFeedbackForm] = useState({
        actual_effort: '',
        feedback_notes: ''
    })
    const [showFeedbackForm, setShowFeedbackForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        loadStoryAndComments()
    }, [id])

    const loadStoryAndComments = async () => {
        try {
            const [storyData, commentsData] = await Promise.all([
                apiFetch(`/stories/${id}`),
                apiFetch(`/stories/${id}/comments`)
            ])
            setStory(storyData)
            setComments(commentsData)
        } catch (e: any) {
            setError(e?.message || 'Failed to load story')
        }
    }

    const onDelete = async () => {
        if (!id) return
        await apiFetch(`/stories/${id}`, { method: 'DELETE' })
        navigate('/recent')
    }

    const addComment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newComment.trim()) return

        setLoading(true)
        try {
            const comment = await apiFetch(`/stories/${id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content: newComment })
            })
            setComments(prev => [comment, ...prev])
            setNewComment('')
            setMessage('Comment added successfully!')
            setTimeout(() => setMessage(null), 3000)
        } catch (e: any) {
            setError(e?.message || 'Failed to add comment')
        } finally {
            setLoading(false)
        }
    }

    const submitFeedback = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!feedbackForm.actual_effort || parseInt(feedbackForm.actual_effort) < 0) {
            setError('Please enter a valid actual effort value')
            return
        }

        setLoading(true)
        try {
            await apiFetch(`/stories/${id}/feedback`, {
                method: 'POST',
                body: JSON.stringify({
                    actual_effort: parseInt(feedbackForm.actual_effort),
                    feedback_notes: feedbackForm.feedback_notes
                })
            })
            
            // Refresh story and comments
            await loadStoryAndComments()
            setFeedbackForm({ actual_effort: '', feedback_notes: '' })
            setShowFeedbackForm(false)
            setMessage('Feedback recorded successfully! This helps improve future estimations.')
            setTimeout(() => setMessage(null), 5000)
        } catch (e: any) {
            setError(e?.message || 'Failed to record feedback')
        } finally {
            setLoading(false)
        }
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

    if (error) return <ValidationMessage message={error} type="error" />
    if (!story) return <p>Loading...</p>

    const accuracyPercentage = story.actual_effort && story.complexity_score 
        ? Math.round((1 - Math.abs(story.actual_effort - story.complexity_score) / Math.max(story.actual_effort, story.complexity_score)) * 100)
        : null

    return (
        <div style={{ maxWidth: '800px' }}>
            {message && <ValidationMessage message={message} type="success" />}
            
            {/* Story Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1>Story #{story.id}</h1>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ 
                        fontSize: '12px', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        background: story.estimation_type === 'module' ? 'var(--accent)' : 'var(--primary)',
                        color: 'white'
                    }}>
                        {story.estimation_type?.toUpperCase() || 'STORY'}
                    </span>
                    <span style={{ 
                        fontSize: '12px', 
                        padding: '4px 8px', 
                        borderRadius: '4px',
                        background: getStatusColor(story.status),
                        color: 'white'
                    }}>
                        {story.status?.replace('_', ' ').toUpperCase() || 'ESTIMATED'}
                    </span>
                    <button onClick={onDelete} style={{ padding: '4px 8px', fontSize: '12px' }}>
                        Delete
                    </button>
                </div>
            </div>

            {/* Story Details */}
            <div style={{ 
                border: '1px solid var(--border)', 
                borderRadius: 8, 
                padding: 20,
                marginBottom: '20px',
                background: 'var(--card-bg)'
            }}>
                <h2 style={{ marginTop: 0 }}>{story.summary}</h2>
                
                {/* Enhanced Estimation Summary */}
                <div style={{ 
                    background: 'rgba(108, 140, 255, 0.1)', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    border: '1px solid rgba(108, 140, 255, 0.2)'
                }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--primary)', marginBottom: '12px' }}>
                        ✅ Story estimated successfully!
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--primary)', marginBottom: '8px' }}>
                        📊 Estimated: {story.estimated_hours || 8} hours ({story.story_points || 1} story points)
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '12px' }}>
                        🎯 Type: {story.story_type || 'general'} | Confidence: {story.confidence_level || 'medium'}
                    </div>
                    
                    {story.baseline_reference && (
                        <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>
                            📋 Baseline: {story.baseline_reference.description} ({story.baseline_reference.hours} hours)
                        </div>
                    )}
                </div>

                {/* Detailed Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                    <div>
                        <strong>Complexity Score:</strong>
                        <div style={{ fontSize: '24px', color: 'var(--accent)', fontWeight: '700' }}>
                            {story.complexity_score}
                        </div>
                    </div>
                    
                    <div>
                        <strong>Story Points:</strong>
                        <div style={{ fontSize: '24px', color: 'var(--primary)', fontWeight: '700' }}>
                            {story.story_points || 1}
                        </div>
                    </div>
                    
                    <div>
                        <strong>Estimated Hours:</strong>
                        <div style={{ fontSize: '24px', color: 'var(--accent)', fontWeight: '700' }}>
                            {story.estimated_hours || 8}h
                        </div>
                    </div>
                    
                    {story.actual_effort && (
                        <div>
                            <strong>Actual Effort:</strong>
                            <div style={{ fontSize: '24px', color: 'var(--primary)', fontWeight: '700' }}>
                                {story.actual_effort}h
                            </div>
                        </div>
                    )}
                    
                    {accuracyPercentage !== null && (
                        <div>
                            <strong>Accuracy:</strong>
                            <div style={{ 
                                fontSize: '24px', 
                                color: accuracyPercentage >= 80 ? '#10b981' : accuracyPercentage >= 60 ? '#f59e0b' : '#ef4444',
                                fontWeight: '700' 
                            }}>
                                {accuracyPercentage}%
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <strong>Priority:</strong>
                        <div style={{ color: getPriorityColor(story.priority), fontWeight: '600' }}>
                            {getPriorityLabel(story.priority)}
                        </div>
                    </div>
                </div>

                {/* Calculation Breakdown */}
                {story.analysis && (
                    <div style={{ 
                        background: 'var(--card-bg)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px', 
                        padding: '16px', 
                        marginBottom: '16px' 
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>📊 Calculation Breakdown</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: '14px' }}>
                            <div>
                                <strong>Word Count:</strong> {story.analysis.token_count}
                            </div>
                            <div>
                                <strong>Team Factor:</strong> {story.analysis.team_factor}x
                            </div>
                            <div>
                                <strong>Priority Factor:</strong> {story.analysis.priority_factor}x
                            </div>
                            <div>
                                <strong>Story Type Factor:</strong> {story.analysis.story_type_factor}x
                            </div>
                            <div>
                                <strong>Technical Complexity:</strong> {story.analysis.technical_factor}
                            </div>
                            <div>
                                <strong>Uncertainty Factor:</strong> {story.analysis.uncertainty_factor}
                            </div>
                        </div>
                    </div>
                )}

                {story.description && (
                    <div style={{ marginBottom: 16 }}>
                        <strong>Description:</strong>
                        <p style={{ marginTop: 8, lineHeight: 1.6 }}>{story.description}</p>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                    {story.team && (
                        <div>
                            <strong>Team:</strong> {story.team}
                        </div>
                    )}
                    {story.module && (
                        <div>
                            <strong>Module:</strong> {story.module}
                        </div>
                    )}
                    {story.created_at && (
                        <div>
                            <strong>Created:</strong> {new Date(story.created_at).toLocaleString()}
                        </div>
                    )}
                </div>

                {(story.labels?.length > 0 || story.tags) && (
                    <div style={{ marginBottom: 16 }}>
                        <strong>Labels & Tags:</strong>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            {story.labels?.map((label, index) => (
                                <span key={index} style={{ 
                                    fontSize: '12px', 
                                    padding: '4px 8px', 
                                    background: 'var(--border)', 
                                    borderRadius: '4px',
                                    color: 'var(--muted)'
                                }}>
                                    {label}
                                </span>
                            ))}
                            {story.tags?.split(',').map((tag, index) => (
                                <span key={`tag-${index}`} style={{ 
                                    fontSize: '12px', 
                                    padding: '4px 8px', 
                                    background: 'var(--primary)', 
                                    borderRadius: '4px',
                                    color: 'white'
                                }}>
                                    {tag.trim()}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Feedback Section */}
                {!story.feedback_provided && (
                    <div style={{ marginTop: 20, padding: 16, background: 'rgba(124, 226, 209, 0.1)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <strong>📊 Provide Feedback</strong>
                                <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--muted)' }}>
                                    Help improve future estimations by sharing the actual effort required
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                                style={{ padding: '8px 16px' }}
                            >
                                {showFeedbackForm ? 'Cancel' : 'Add Feedback'}
                            </button>
                        </div>

                        {showFeedbackForm && (
                            <form onSubmit={submitFeedback} style={{ marginTop: 16 }}>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    <div>
                                        <Tooltip content="Enter the actual story points or hours spent on this story">
                                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                                                Actual Effort *
                                            </label>
                                        </Tooltip>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={feedbackForm.actual_effort}
                                            onChange={(e) => setFeedbackForm(prev => ({ ...prev, actual_effort: e.target.value }))}
                                            placeholder="e.g., 8"
                                            required
                                            style={{ width: '200px' }}
                                        />
                                    </div>
                                    <div>
                                        <Tooltip content="Optional notes about what made this story easier or harder than expected">
                                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                                                Feedback Notes
                                            </label>
                                        </Tooltip>
                                        <textarea
                                            value={feedbackForm.feedback_notes}
                                            onChange={(e) => setFeedbackForm(prev => ({ ...prev, feedback_notes: e.target.value }))}
                                            placeholder="What made this story easier or harder than expected?"
                                            rows={3}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        style={{ width: 'fit-content', padding: '8px 16px' }}
                                    >
                                        {loading ? 'Recording...' : 'Record Feedback'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* Comments Section */}
            <div style={{ 
                border: '1px solid var(--border)', 
                borderRadius: 8, 
                padding: 20,
                background: 'var(--card-bg)'
            }}>
                <h3 style={{ marginTop: 0 }}>Team Discussion</h3>
                
                {/* Add Comment Form */}
                <form onSubmit={addComment} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment to discuss this story with your team..."
                                rows={3}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading || !newComment.trim()}
                            style={{ 
                                padding: '8px 16px',
                                opacity: loading || !newComment.trim() ? 0.6 : 1
                            }}
                        >
                            {loading ? 'Adding...' : 'Add Comment'}
                        </button>
                    </div>
                </form>

                {/* Comments List */}
                <div style={{ display: 'grid', gap: 12 }}>
                    {comments.map(comment => (
                        <div key={comment.id} style={{ 
                            padding: 12, 
                            background: 'var(--border)', 
                            borderRadius: 6,
                            borderLeft: '3px solid var(--primary)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <strong style={{ fontSize: '14px' }}>{comment.user_email}</strong>
                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                    {new Date(comment.created_at).toLocaleString()}
                                </span>
                            </div>
                            <p style={{ margin: 0, lineHeight: 1.5 }}>{comment.content}</p>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>
                            No comments yet. Start the discussion!
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}


