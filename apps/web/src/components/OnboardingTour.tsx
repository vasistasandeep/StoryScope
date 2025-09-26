import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface OnboardingStep {
    id: string
    title: string
    description: string
    target?: string
    action?: string
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 'welcome',
        title: '🎉 Welcome to Story Scope!',
        description: 'Story Scope helps you estimate development effort using AI-powered analysis. Let\'s get you started with a quick tour.',
        action: 'Get Started'
    },
    {
        id: 'estimation_types',
        title: '📊 Two Types of Estimation',
        description: 'You can estimate individual user stories or entire modules. Story-level is great for sprint planning, while module-level helps with project planning.',
        target: 'estimation-type'
    },
    {
        id: 'team_context',
        title: '👥 Team-Specific Insights',
        description: 'Select your team to get more accurate estimates. Different teams have different complexity factors - Backend work might be more complex than Frontend for the same story.',
        target: 'team-select'
    },
    {
        id: 'tooltips',
        title: '💡 Helpful Tooltips',
        description: 'Hover over any field label to see helpful tips about what to include and how it affects your estimate.',
        target: 'tooltip-example'
    },
    {
        id: 'progress_tracking',
        title: '📈 Progress Tracking',
        description: 'Watch your progress as you fill out the form. The progress bar shows how complete your estimation is.',
        target: 'progress-indicator'
    },
    {
        id: 'auto_save',
        title: '💾 Auto-Save',
        description: 'Don\'t worry about losing your work! Your draft is automatically saved as you type.',
        target: 'auto-save-status'
    },
    {
        id: 'feedback_loop',
        title: '🔄 Continuous Learning',
        description: 'After completing stories, provide feedback on actual effort. This helps improve future estimates through machine learning.',
        target: 'feedback-section'
    },
    {
        id: 'collaboration',
        title: '💬 Team Collaboration',
        description: 'Use comments to discuss stories with your team. Share insights, ask questions, and build better estimates together.',
        target: 'comments-section'
    },
    {
        id: 'filtering',
        title: '🔍 Advanced Filtering',
        description: 'Find stories quickly using filters by team, priority, status, and more. Use the search to find specific stories.',
        target: 'filter-section'
    },
    {
        id: 'complete',
        title: '✅ You\'re All Set!',
        description: 'You\'re ready to start estimating! Remember, the more you use Story Scope and provide feedback, the better it gets at helping your team.',
        action: 'Start Estimating'
    }
]

interface OnboardingTourProps {
    onComplete: () => void
    currentRoute: string
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        loadOnboardingProgress()
    }, [])

    const loadOnboardingProgress = async () => {
        try {
            const progress = await apiFetch('/user/onboarding')
            if (!progress.tutorial_completed) {
                setIsVisible(true)
            }
        } catch (error) {
            console.error('Failed to load onboarding progress:', error)
        }
    }

    const markStepCompleted = async (stepId: string) => {
        try {
            await apiFetch('/user/onboarding/step', {
                method: 'POST',
                body: JSON.stringify({ step_id: stepId })
            })
        } catch (error) {
            console.error('Failed to mark step as completed:', error)
        }
    }

    const nextStep = async () => {
        const step = ONBOARDING_STEPS[currentStep]
        await markStepCompleted(step.id)

        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            // Mark tutorial as completed
            try {
                await apiFetch('/user/onboarding/step', {
                    method: 'POST',
                    body: JSON.stringify({ step_id: 'tutorial_completed' })
                })
            } catch (error) {
                console.error('Failed to mark tutorial as completed:', error)
            }
            setIsVisible(false)
            onComplete()
        }
    }

    const skipTour = async () => {
        try {
            await apiFetch('/user/onboarding/step', {
                method: 'POST',
                body: JSON.stringify({ step_id: 'tutorial_completed' })
            })
        } catch (error) {
            console.error('Failed to skip tutorial:', error)
        }
        setIsVisible(false)
        onComplete()
    }

    const previousStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }

    if (!isVisible) return null

    const step = ONBOARDING_STEPS[currentStep]
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto',
                position: 'relative',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
                {/* Progress indicator */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        fontSize: '12px',
                        color: '#666',
                        fontWeight: '600'
                    }}>
                        Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                    </div>
                    <button
                        onClick={skipTour}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            fontSize: '12px',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Skip Tour
                    </button>
                </div>

                {/* Progress bar */}
                <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '2px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%`,
                        height: '100%',
                        backgroundColor: 'var(--primary)',
                        borderRadius: '2px',
                        transition: 'width 0.3s ease'
                    }} />
                </div>

                {/* Step content */}
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{
                        margin: '0 0 12px 0',
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#333'
                    }}>
                        {step.title}
                    </h2>
                    <p style={{
                        margin: 0,
                        fontSize: '16px',
                        lineHeight: '1.5',
                        color: '#666'
                    }}>
                        {step.description}
                    </p>
                </div>

                {/* Sample data showcase for certain steps */}
                {step.id === 'estimation_types' && (
                    <div style={{
                        padding: '16px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                            <span style={{
                                fontSize: '12px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: 'var(--primary)',
                                color: 'white'
                            }}>
                                STORY
                            </span>
                            <span style={{
                                fontSize: '12px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: 'var(--accent)',
                                color: 'white'
                            }}>
                                MODULE
                            </span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                            Choose the right type for your estimation needs
                        </div>
                    </div>
                )}

                {step.id === 'team_context' && (
                    <div style={{
                        padding: '16px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['Backend', 'Frontend', 'QA', 'DevOps'].map(team => (
                                <span key={team} style={{
                                    fontSize: '12px',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: '#e9ecef',
                                    color: '#495057'
                                }}>
                                    {team}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation buttons */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={previousStep}
                        disabled={currentStep === 0}
                        style={{
                            padding: '8px 16px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            background: 'white',
                            color: '#666',
                            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                            opacity: currentStep === 0 ? 0.5 : 1
                        }}
                    >
                        Previous
                    </button>

                    <button
                        onClick={nextStep}
                        style={{
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '6px',
                            background: 'var(--primary)',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px'
                        }}
                    >
                        {step.action || (isLastStep ? 'Complete Tour' : 'Next')}
                    </button>
                </div>
            </div>
        </div>
    )
}
