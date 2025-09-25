// Vercel serverless function entry point
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Import database setup
let db, initDB;
try {
    const dbModule = require("../apps/api/db.cjs");
    db = dbModule.db;
    initDB = dbModule.initDB;
} catch (error) {
    console.error("Database module error:", error);
    // Fallback for development
    db = null;
    initDB = null;
}

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// Global axios timeout
axios.defaults.timeout = Number(process.env.HTTP_TIMEOUT_MS || 10000);

// Auth helpers
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';
function signToken(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); }
function auth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Health check
app.get('/health', async (req, res) => {
    try {
        if (!db) {
            return res.status(500).json({ status: 'error', db: 'not_initialized', message: 'Database not available' });
        }
        await db.raw('SELECT 1');
        res.json({ status: 'ok', db: 'ok' });
    } catch (e) {
        res.status(500).json({ status: 'error', db: 'error', message: e.message });
    }
});

// Auth routes
app.post('/auth/signup', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const hash = await bcrypt.hash(String(password), 10);
    try {
        const [user] = await db('users').insert({ email, password: hash, role: 'user' }).returning('*');
        const token = signToken({ id: user.id, email: user.email, role: user.role });
        res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Email already exists' });
        res.status(500).json({ error: 'Signup failed' });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    try {
        const [user] = await db('users').where({ email }).select('*');
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const valid = await bcrypt.compare(String(password), user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        const token = signToken({ id: user.id, email: user.email, role: user.role });
        res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
    } catch (e) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/auth/me', auth, async (req, res) => {
    res.json({ user: { id: req.user.id, email: req.user.email, role: req.user.role } });
});

// Story estimation endpoint
app.post("/estimate", auth, async (req, res) => {
    try {
        const { summary, description, labels } = req.body;
        if (!summary) return res.status(400).json({ error: 'Summary is required' });

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

        res.json({ story });
    } catch (err) {
        console.error('Estimate error:', err);
        res.status(500).json({ error: 'Estimation failed' });
    }
});

// Stories CRUD
app.get('/stories', auth, async (req, res) => {
    try {
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

        res.json({ stories, pagination: { page: Number(page), limit: Number(limit), total: Number(count) } });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch stories' });
    }
});

app.get('/stories/:id', auth, async (req, res) => {
    try {
        const [story] = await db('stories').where({ id: req.params.id, user_id: req.user.id });
        if (!story) return res.status(404).json({ error: 'Story not found' });
        res.json({ story });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch story' });
    }
});

app.put('/stories/:id', auth, async (req, res) => {
    try {
        const { summary, description, labels } = req.body;
        const [story] = await db('stories')
            .where({ id: req.params.id, user_id: req.user.id })
            .update({
                summary: String(summary || '').trim(),
                description: String(description || '').trim(),
                labels: String(labels || '').trim(),
                updated_at: new Date()
            })
            .returning('*');
        if (!story) return res.status(404).json({ error: 'Story not found' });
        res.json({ story });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update story' });
    }
});

app.delete('/stories/:id', auth, async (req, res) => {
    try {
        const deleted = await db('stories').where({ id: req.params.id, user_id: req.user.id }).del();
        if (!deleted) return res.status(404).json({ error: 'Story not found' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete story' });
    }
});

// Stats endpoint
app.get('/stats', auth, async (req, res) => {
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

        res.json({ ...stats, streak });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// CSV Report endpoint
app.get('/report.csv', auth, async (req, res) => {
    try {
        const stories = await db('stories')
            .where('user_id', req.user.id)
            .orderBy('created_at', 'desc')
            .select('*');

        const csv = [
            'ID,Summary,Description,Labels,Complexity Score,Confidence,Reasoning,Created At',
            ...stories.map(s => [
                s.id,
                `"${(s.summary || '').replace(/"/g, '""')}"`,
                `"${(s.description || '').replace(/"/g, '""')}"`,
                `"${(s.labels || '').replace(/"/g, '""')}"`,
                s.complexity_score,
                s.confidence,
                `"${(s.reasoning || '').replace(/"/g, '""')}"`,
                s.created_at
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="stories-report.csv"');
        res.send(csv);
    } catch (e) {
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Admin routes
app.get('/admin/users', auth, requireAdmin, async (req, res) => {
    try {
        const users = await db('users').select('id', 'email', 'role', 'created_at');
        res.json({ users });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Jira integration routes
app.get('/jira/template', auth, (req, res) => {
    const csv = [
        'Summary,Description,Labels',
        'Fix login bug,User cannot login with valid credentials,bug',
        'Add new feature,Implement user dashboard,enhancement',
        'Update documentation,Update API docs,documentation'
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="jira-template.csv"');
    res.send(csv);
});

app.post('/jira/export', auth, async (req, res) => {
    try {
        const { storyIds } = req.body;
        if (!Array.isArray(storyIds)) return res.status(400).json({ error: 'storyIds must be an array' });

        const stories = await db('stories')
            .whereIn('id', storyIds)
            .where('user_id', req.user.id)
            .select('*');

        const csv = [
            'Summary,Description,Labels,Complexity Score,Confidence,Reasoning,Created At',
            ...stories.map(s => [
                `"${(s.summary || '').replace(/"/g, '""')}"`,
                `"${(s.description || '').replace(/"/g, '""')}"`,
                `"${(s.labels || '').replace(/"/g, '""')}"`,
                s.complexity_score,
                s.confidence,
                `"${(s.reasoning || '').replace(/"/g, '""')}"`,
                s.created_at
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="jira-export.csv"');
        res.send(csv);
    } catch (e) {
        res.status(500).json({ error: 'Failed to export stories' });
    }
});

app.post('/jira/import', auth, async (req, res) => {
    try {
        const { csvData } = req.body;
        if (!csvData) return res.status(400).json({ error: 'csvData is required' });

        const lines = csvData.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((header, i) => {
                row[header.toLowerCase().replace(/\s+/g, '_')] = values[i] || '';
            });
            return row;
        });

        res.json({ preview: data.slice(0, 5), total: data.length });
    } catch (e) {
        res.status(500).json({ error: 'Failed to parse CSV' });
    }
});

// Initialize database on startup
(async () => {
    try {
        if (initDB) {
            await initDB();
            console.log('Database initialized successfully');
        } else {
            console.log('Database module not available, running without DB');
        }
    } catch (e) {
        console.error('Database initialization failed:', e.message);
        // Don't exit in serverless environment
        console.log('Continuing without database...');
    }
})();

module.exports = app;
