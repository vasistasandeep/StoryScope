// Stories CRUD endpoint
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
    return auth(req, res, async () => {
        try {
            if (req.method === 'GET') {
                // Get stories
                const { page = 1, limit = 10, search = '' } = req.query;
                const offset = (Number(page) - 1) * Number(limit);

                let query = db('stories').where('user_id', req.user.id);
                if (search) {
                    query = query.where(function () {
                        this.where('summary', 'like', `%${search}%`)
                            .orWhere('description', 'like', `%${search}%`);
                    });
                }

                const [stories, [{ count }]] = await Promise.all([
                    query.clone().orderBy('created_at', 'desc').limit(Number(limit)).offset(offset),
                    query.clone().count('* as count')
                ]);

                res.status(200).json({
                    stories,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: Number(count)
                    }
                });
            } else {
                res.status(405).json({ error: 'Method not allowed' });
            }
        } catch (e) {
            console.error('Stories error:', e);
            res.status(500).json({ error: 'Failed to fetch stories' });
        }
    });
}
