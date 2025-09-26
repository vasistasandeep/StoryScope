import { useState, useEffect, useCallback } from 'react'
import Confetti from '../components/Confetti'
import Toast from '../components/Toast'
import Tooltip from '../components/Tooltip'
import ProgressIndicator from '../components/ProgressIndicator'
import ValidationMessage from '../components/ValidationMessage'
import { apiFetch } from '../lib/api'

interface FormData {
    summary: string
    description: string
    labels: string
    estimationType: 'story' | 'module'
    team: string
    module: string
    priority: number
    tags: string
}

interface ValidationErrors {
    summary?: string
    description?: string
    team?: string
    module?: string
}

const TEAMS = ['Backend', 'Frontend', 'QA', 'DevOps', 'Design', 'Product']
const PRIORITIES = [
    { value: 1, label: 'Critical' },
    { value: 2, label: 'High' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Low' },
    { value: 5, label: 'Nice to have' }
]

export default function Submit() {
    const [formData, setFormData] = useState<FormData>({
        summary: '',
        description: '',
        labels: '',
        estimationType: 'story',
        team: '',
        module: '',
        priority: 3,
        tags: ''
    })
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [burst, setBurst] = useState(0)
    const [toast, setToast] = useState(false)
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
    const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')

    // Auto-save functionality
    const autoSave = useCallback(async () => {
        if (formData.summary.trim()) {
            setAutoSaveStatus('saving')
            try {
                localStorage.setItem('story-draft', JSON.stringify(formData))
                setAutoSaveStatus('saved')
            } catch {
                setAutoSaveStatus('unsaved')
            }
        }
    }, [formData])

    useEffect(() => {
        const timer = setTimeout(autoSave, 2000)
        return () => clearTimeout(timer)
    }, [autoSave])

    // Load draft on mount
    useEffect(() => {
        const draft = localStorage.getItem('story-draft')
        if (draft) {
            try {
                const parsed = JSON.parse(draft)
                setFormData(parsed)
            } catch {
                // Ignore invalid draft
            }
        }
    }, [])

    // Validation
    const validateForm = (): boolean => {
        const errors: ValidationErrors = {}
        
        if (!formData.summary.trim()) {
            errors.summary = 'Summary is required'
        } else if (formData.summary.length < 10) {
            errors.summary = 'Summary should be at least 10 characters'
        }
        
        if (formData.description.length > 0 && formData.description.length < 20) {
            errors.description = 'Description should be at least 20 characters if provided'
        }
        
        if (formData.estimationType === 'module' && !formData.team) {
            errors.team = 'Team is required for module-level estimation'
        }
        
        if (formData.estimationType === 'module' && !formData.module.trim()) {
            errors.module = 'Module name is required for module-level estimation'
        }
        
        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    // Calculate progress
    const getProgress = () => {
        const fields = ['summary', 'description', 'team', 'priority']
        if (formData.estimationType === 'module') {
            fields.push('module')
        }
        
        const completed = fields.filter(field => {
            const value = formData[field as keyof FormData]
            return typeof value === 'string' ? value.trim() : value !== 3 // 3 is default priority
        }).length
        
        return { current: completed, total: fields.length }
    }

    const updateFormData = (field: keyof FormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setAutoSaveStatus('unsaved')
        
        // Clear validation error for this field
        if (validationErrors[field as keyof ValidationErrors]) {
            setValidationErrors(prev => ({ ...prev, [field]: undefined }))
        }
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!validateForm()) {
            return
        }
        
        setLoading(true)
        setMsg(null)
        setError(null)
        
        try {
            await apiFetch(`/estimate`, {
                method: 'POST',
                body: JSON.stringify({
                    summary: formData.summary,
                    description: formData.description,
                    labels: formData.labels.split(',').map((s: string) => s.trim()).filter(Boolean),
                    estimation_type: formData.estimationType,
                    team: formData.team || null,
                    module: formData.module || null,
                    priority: formData.priority,
                    tags: formData.tags || null
                })
            })
            
            // Clear form and draft
            setFormData({
                summary: '',
                description: '',
                labels: '',
                estimationType: 'story',
                team: '',
                module: '',
                priority: 3,
                tags: ''
            })
            localStorage.removeItem('story-draft')
            
            setMsg('Story estimated successfully! Check Recent Stories.')
            setBurst(b => b + 1)
            setToast(true)
        } catch (e: any) {
            setError(e?.message || 'Failed to estimate story')
        } finally {
            setLoading(false)
        }
    }

    const progress = getProgress()

    return (
        <div>
            {burst > 0 && <Confetti trigger={burst} />}
            <Toast text="Story saved! +1" show={toast} onHide={() => setToast(false)} />
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1>Submit Story</h1>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Auto-save: {autoSaveStatus === 'saved' ? '✅ Saved' : autoSaveStatus === 'saving' ? '⏳ Saving...' : '❌ Unsaved'}
                </div>
            </div>

            <ProgressIndicator 
                current={progress.current} 
                total={progress.total}
                labels={['Summary', 'Description', 'Team', 'Priority', ...(formData.estimationType === 'module' ? ['Module'] : [])]}
            />

            <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
                {/* Estimation Type */}
                <div>
                    <Tooltip content="Choose whether this is a story-level estimation (for individual user stories) or module-level estimation (for entire modules or components)">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Estimation Type *
                        </label>
                    </Tooltip>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                                type="radio"
                                value="story"
                                checked={formData.estimationType === 'story'}
                                onChange={(e) => updateFormData('estimationType', e.target.value as 'story' | 'module')}
                            />
                            Story-level
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                                type="radio"
                                value="module"
                                checked={formData.estimationType === 'module'}
                                onChange={(e) => updateFormData('estimationType', e.target.value as 'story' | 'module')}
                            />
                            Module-level
                        </label>
                    </div>
                </div>

                {/* Summary */}
                <div>
                    <Tooltip content="A brief, clear summary of what needs to be built. This helps the AI understand the scope and complexity.">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Summary *
                        </label>
                    </Tooltip>
                    <input
                        placeholder="e.g., Add user authentication with OAuth"
                        value={formData.summary}
                        onChange={(e) => updateFormData('summary', e.target.value)}
                        required
                        style={{ width: '100%' }}
                    />
                    {validationErrors.summary && (
                        <ValidationMessage message={validationErrors.summary} type="error" />
                    )}
                </div>

                {/* Description */}
                <div>
                    <Tooltip content="Detailed description including requirements, acceptance criteria, and any technical considerations. More detail leads to better estimates.">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Description
                        </label>
                    </Tooltip>
                    <textarea
                        placeholder="Detailed description of requirements, acceptance criteria, technical considerations..."
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        rows={6}
                        style={{ width: '100%' }}
                    />
                    {validationErrors.description && (
                        <ValidationMessage message={validationErrors.description} type="error" />
                    )}
                </div>

                {/* Team */}
                <div>
                    <Tooltip content="Which team will work on this? This helps provide team-specific complexity insights.">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Team {formData.estimationType === 'module' && '*'}
                        </label>
                    </Tooltip>
                    <select
                        value={formData.team}
                        onChange={(e) => updateFormData('team', e.target.value)}
                        style={{ width: '100%' }}
                        required={formData.estimationType === 'module'}
                    >
                        <option value="">Select team...</option>
                        {TEAMS.map(team => (
                            <option key={team} value={team}>{team}</option>
                        ))}
                    </select>
                    {validationErrors.team && (
                        <ValidationMessage message={validationErrors.team} type="error" />
                    )}
                </div>

                {/* Module (only for module-level estimation) */}
                {formData.estimationType === 'module' && (
                    <div>
                        <Tooltip content="Name of the module or component being estimated (e.g., 'User Management', 'Payment Gateway', 'Notification System')">
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                Module Name *
                            </label>
                        </Tooltip>
                        <input
                            placeholder="e.g., User Management System"
                            value={formData.module}
                            onChange={(e) => updateFormData('module', e.target.value)}
                            required
                            style={{ width: '100%' }}
                        />
                        {validationErrors.module && (
                            <ValidationMessage message={validationErrors.module} type="error" />
                        )}
                    </div>
                )}

                {/* Priority */}
                <div>
                    <Tooltip content="Priority level affects estimation - higher priority items may need more thorough analysis and testing.">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Priority
                        </label>
                    </Tooltip>
                    <select
                        value={formData.priority}
                        onChange={(e) => updateFormData('priority', parseInt(e.target.value))}
                        style={{ width: '100%' }}
                    >
                        {PRIORITIES.map(priority => (
                            <option key={priority.value} value={priority.value}>
                                {priority.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Labels */}
                <div>
                    <Tooltip content="Comma-separated labels for categorization (e.g., 'frontend, api, database'). These help with filtering and analysis.">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Labels
                        </label>
                    </Tooltip>
                    <input
                        placeholder="frontend, api, database, authentication"
                        value={formData.labels}
                        onChange={(e) => updateFormData('labels', e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>

                {/* Tags */}
                <div>
                    <Tooltip content="Additional tags for better organization and searchability (e.g., 'sprint-1, critical-path, technical-debt')">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Tags
                        </label>
                    </Tooltip>
                    <input
                        placeholder="sprint-1, critical-path, technical-debt"
                        value={formData.tags}
                        onChange={(e) => updateFormData('tags', e.target.value)}
                        style={{ width: '100%' }}
                    />
                </div>

                <button 
                    disabled={loading || Object.keys(validationErrors).length > 0} 
                    type="submit"
                    style={{ 
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: '600',
                        opacity: loading || Object.keys(validationErrors).length > 0 ? 0.6 : 1
                    }}
                >
                    {loading ? 'Estimating…' : 'Estimate Story'}
                </button>
            </form>
            
            {msg && <ValidationMessage message={msg} type="success" />}
            {error && <ValidationMessage message={error} type="error" />}
        </div>
    )
}


