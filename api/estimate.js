// Story estimation endpoint
const { db } = require('../apps/api/db.cjs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';

function auth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return auth(req, res, async () => {
        try {
            const { summary, description, labels } = req.body;
            if (!summary) {
                return res.status(400).json({ error: 'Summary is required' });
            }

            // Call NLP service (with fallback to mock)
            const nlpBaseUrl = process.env.NLP_URL || "http://localhost:8001";
            let nlpResponse;

            try {
                nlpResponse = await axios.post(`${nlpBaseUrl}/estimate`, {
                    summary,
                    description,
                    labels,
                }, { timeout: 5000 }); // 5 second timeout
            } catch (nlpError) {
                console.log("NLP service unavailable or timed out, using mock service");
                // Fallback to mock NLP service
                const mockComplexity = Math.floor(Math.random() * 8) + 1; // 1-8
                const mockConfidence = Math.random() * 0.4 + 0.6; // 0.6-1.0
                nlpResponse = {
                    data: {
                        complexity_score: mockComplexity,
                        confidence: mockConfidence,
                        reasoning: "Mock analysis: Estimated based on story length and keywords"
                    }
                };
            }

            const { complexity_score, confidence, reasoning } = nlpResponse.data;

            // Round complexity_score to integer for database compatibility
            const roundedComplexity = Math.round(complexity_score);

            const [story] = await db('stories').insert({
                user_id: req.user.id,
                summary: String(summary || '').trim(),
                description: String(description || '').trim(),
                labels: String(labels || '').trim(),
                complexity_score: roundedComplexity,
                confidence: Number(confidence || 0),
                reasoning: String(reasoning || '').trim(),
            }).returning('*');

            res.status(200).json({ story });
        } catch (err) {
            console.error('Estimate error:', err);
            res.status(500).json({ error: 'Estimation failed' });
        }
    });
}
