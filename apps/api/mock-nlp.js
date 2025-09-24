// Mock NLP service for Railway deployment
// This simulates the NLP service when the real one isn't available

const express = require('express');
const app = express();

app.use(express.json());

// Mock complexity estimation
app.post('/estimate', (req, res) => {
    const { summary, description, labels } = req.body;
    
    // Simple mock scoring based on text length
    const text = `${summary} ${description} ${(labels || []).join(' ')}`.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    
    // Mock complexity score (0-100)
    let complexity = Math.min(100, wordCount * 2 + Math.random() * 20);
    
    // Add some randomness for uncertainty keywords
    if (text.includes('maybe') || text.includes('unclear') || text.includes('tbd')) {
        complexity += 15;
    }
    
    // Add technical complexity
    const techKeywords = ['api', 'database', 'auth', 'security', 'integration'];
    const techCount = techKeywords.filter(keyword => text.includes(keyword)).length;
    complexity += techCount * 10;
    
    complexity = Math.min(100, Math.max(1, complexity));
    
    // Map to Fibonacci story points
    const fibPoints = [1, 2, 3, 5, 8, 13, 21];
    const thresholds = [10, 20, 35, 50, 65, 80, 100];
    let storyPoints = fibPoints[0];
    for (let i = 0; i < thresholds.length; i++) {
        if (complexity <= thresholds[i]) {
            storyPoints = fibPoints[i];
            break;
        }
    }
    
    res.json({
        summary,
        description,
        labels: labels || [],
        complexity_score: Math.round(complexity * 10) / 10,
        story_points: storyPoints,
        analysis: {
            token_count: wordCount,
            sentence_count: text.split(/[.!?]+/).length,
            avg_sentence_len: wordCount / Math.max(1, text.split(/[.!?]+/).length),
            uncertainty_factor: (text.match(/maybe|unclear|tbd|unknown/gi) || []).length,
            technical_factor: techCount,
            entity_factor: 0,
            label_factor: (labels || []).length,
            short_sentence_penalty: 0
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mock-nlp' });
});

app.get('/', (req, res) => {
    res.json({ service: 'mock-nlp', status: 'ok' });
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mock NLP service running on port ${PORT}`);
});
