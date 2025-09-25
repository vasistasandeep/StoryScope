// Stats endpoint
const { db } = require('../apps/api/db.cjs');
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
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return auth(req, res, async () => {
        try {
            const [stats] = await db('stories')
                .where('user_id', req.user.id)
                .select(
                    db.raw('COUNT(*) as total_stories'),
                    db.raw('AVG(complexity_score) as avg_complexity'),
                    db.raw('AVG(confidence) as avg_confidence'),
                    db.raw('COUNT(CASE WHEN created_at >= ? THEN 1 END) as stories_this_week', [
                        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ])
                );

            // Calculate streak (consecutive days with stories)
            const stories = await db('stories')
                .where('user_id', req.user.id)
                .orderBy('created_at', 'desc')
                .select('created_at');

            let streak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let i = 0; i < stories.length; i++) {
                const storyDate = new Date(stories[i].created_at);
                storyDate.setHours(0, 0, 0, 0);
                const daysDiff = Math.floor((today - storyDate) / (1000 * 60 * 60 * 24));

                if (daysDiff === i) {
                    streak++;
                } else {
                    break;
                }
            }

            res.status(200).json({ ...stats, streak });
        } catch (e) {
            console.error('Stats error:', e);
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    });
}
