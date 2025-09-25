// server.cjs
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { db, initDB } = require("./db.cjs"); // knex setup in db.cjs
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
// Global axios timeout (overridden per-call where needed)
axios.defaults.timeout = Number(process.env.HTTP_TIMEOUT_MS || 10000);

// Serve static UI (built assets from apps/web/dist) if present
const uiDir = path.join(__dirname, "..", "web", "dist");
const hasBuiltUI = (() => {
    try {
        return fs.existsSync(path.join(uiDir, "index.html"));
    } catch (_) { return false; }
})();

if (hasBuiltUI) {
    app.use(express.static(uiDir));
}

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

// Auth routes
app.post('/auth/signup', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const hash = await bcrypt.hash(String(password), 10);
    try {
        const [user] = await db('users').insert({ email, password_hash: hash }).returning(['id', 'email', 'role']);
        const id = user?.id ?? user; // sqlite returns id number
        const found = await db('users').where({ id }).first();
        const token = signToken({ id, email, role: found.role });
        res.json({ token, user: { id, email, role: found.role } });
    } catch (e) {
        return res.status(400).json({ error: 'User exists?' });
    }
});

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    const user = await db('users').where({ email }).first();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/me', auth, async (req, res) => {
    res.json({ user: { id: req.user.id, email: req.user.email, role: req.user.role } });
});

function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
}

// Admin endpoints (example): list users
app.get('/admin/users', auth, requireAdmin, async (_req, res) => {
    const users = await db('users').select('id', 'email', 'role', 'created_at').orderBy('id', 'desc');
    res.json(users);
});

// POST /estimate - analyze story & save
app.post("/estimate", auth, async (req, res) => {
    try {
        const { summary, description, labels } = req.body || {};
        if (!summary || typeof summary !== 'string') {
            return res.status(400).json({ error: 'summary is required' });
        }

        // call NLP service (with fallback to mock)
        const nlpBaseUrl = process.env.NLP_URL || "http://localhost:8001";
        let nlpResponse;

        try {
            nlpResponse = await axios.post(
                `${nlpBaseUrl}/estimate`,
                {
                    summary,
                    description,
                    labels,
                },
                {
                    timeout: 5000,
                    validateStatus: (s) => s >= 200 && s < 500, // treat 5xx as error below
                }
            );
            if (!nlpResponse || nlpResponse.status >= 500) {
                throw new Error(`NLP service error: ${nlpResponse?.status || 'no response'}`);
            }
        } catch (nlpError) {
            console.log("NLP service unavailable, using mock service");
            // Fallback to mock NLP service
            const mockNlp = require('./mock-nlp.js');
            const mockApp = require('express')();
            mockApp.use(require('body-parser').json());

            // Create a mock response
            const text = `${summary} ${description} ${(labels || []).join(' ')}`.toLowerCase();
            const wordCount = text.split(/\s+/).length;
            let complexity = Math.min(100, wordCount * 2 + Math.random() * 20);

            if (text.includes('maybe') || text.includes('unclear') || text.includes('tbd')) {
                complexity += 15;
            }

            const techKeywords = ['api', 'database', 'auth', 'security', 'integration'];
            const techCount = techKeywords.filter(keyword => text.includes(keyword)).length;
            complexity += techCount * 10;

            complexity = Math.min(100, Math.max(1, complexity));

            const fibPoints = [1, 2, 3, 5, 8, 13, 21];
            const thresholds = [10, 20, 35, 50, 65, 80, 100];
            let storyPoints = fibPoints[0];
            for (let i = 0; i < thresholds.length; i++) {
                if (complexity <= thresholds[i]) {
                    storyPoints = fibPoints[i];
                    break;
                }
            }

            nlpResponse = {
                data: {
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
                }
            };
        }

        // Ensure complexity_score is an integer to match DB schema
        const complexity_score = Math.round(Number(nlpResponse.data?.complexity_score) || 0);

        // insert into DB (ensure id is returned in Postgres)
        const inserted = await db("stories").insert({
            user_id: req.user?.id || null,
            summary,
            description: description || '',
            labels: JSON.stringify(labels || []),
            complexity_score,
        }, ["id"]);
        const id = Array.isArray(inserted)
            ? (typeof inserted[0] === 'object' ? inserted[0].id : inserted[0])
            : inserted;

        res.json({
            id,
            summary,
            description,
            labels,
            complexity_score,
        });
    } catch (err) {
        if (err.response) {
            console.error("Error in /estimate:", err.response.status, err.response.data);
            return res.status(502).json({ error: "NLP error", status: err.response.status, data: err.response.data });
        }
        console.error("Error in /estimate:", err.message);
        res.status(500).json({ error: "Failed to estimate" });
    }
});

// GET /stories - fetch all stories
app.get("/stories", auth, async (req, res) => {
    try {
        const { search = "", page = "1", limit = "10" } = req.query;
        const pageNum = Math.max(1, parseInt(String(page)) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(String(limit)) || 10));

        let query = db("stories")
            .select("id", "summary", "description", "labels", "complexity_score", "created_at")
            .where((builder) => {
                if (req.user?.id) builder.where('user_id', req.user.id);
            });
        if (search) {
            query = query.andWhere((q) => {
                q.whereILike("summary", `%${search}%`).orWhereILike("description", `%${search}%`);
            });
        }
        const [{ count }] = await query.clone().count({ count: "id" });
        const rows = await query.orderBy("id", "desc").offset((pageNum - 1) * pageSize).limit(pageSize);

        // convert labels back from JSON string
        const parsed = rows.map((s) => ({
            ...s,
            labels: s.labels ? JSON.parse(s.labels) : [],
        }));

        res.json({ items: parsed, total: Number(count || 0), page: pageNum, limit: pageSize });
    } catch (err) {
        console.error("Error fetching stories:", err.message);
        res.status(500).json({ error: "Failed to fetch stories" });
    }
});

// GET /stories/:id - fetch single story
app.get("/stories/:id", auth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "Invalid id" });
        const row = await db("stories").where({ id, user_id: req.user?.id }).first();
        if (!row) return res.status(404).json({ error: "Not found" });
        const story = {
            ...row,
            labels: row.labels ? JSON.parse(row.labels) : [],
        };
        res.json(story);
    } catch (err) {
        console.error("Error fetching story:", err.message);
        res.status(500).json({ error: "Failed to fetch story" });
    }
});

// PATCH /stories/:id - update story
app.patch("/stories/:id", auth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { summary, description, labels } = req.body || {};
        const update = {};
        if (summary !== undefined) update.summary = summary;
        if (description !== undefined) update.description = description;
        if (labels !== undefined) update.labels = JSON.stringify(labels || []);
        if (Object.keys(update).length === 0) return res.status(400).json({ error: "No fields to update" });
        await db("stories").where({ id, user_id: req.user?.id }).update(update);
        const row = await db("stories").where({ id, user_id: req.user?.id }).first();
        if (!row) return res.status(404).json({ error: "Not found" });
        row.labels = row.labels ? JSON.parse(row.labels) : [];
        res.json(row);
    } catch (err) {
        console.error("Error updating story:", err.message);
        res.status(500).json({ error: "Failed to update story" });
    }
});

// DELETE /stories/:id - delete story
app.delete("/stories/:id", auth, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const deleted = await db("stories").where({ id, user_id: req.user?.id }).del();
        if (!deleted) return res.status(404).json({ error: "Not found" });
        res.json({ ok: true });
    } catch (err) {
        console.error("Error deleting story:", err.message);
        res.status(500).json({ error: "Failed to delete story" });
    }
});

// GET /stats - simple stats for dashboard
app.get("/stats", auth, async (_req, res) => {
    try {
        const userId = _req.user?.id; // optional if guarded later
        const base = db("stories");
        const scoped = userId ? base.where({ user_id: userId }) : base;
        const total = await scoped.clone().count({ count: "id" }).first();
        const avg = await scoped.clone().avg({ avg: "complexity_score" }).first();
        const latest = await scoped.clone().select("id", "summary", "complexity_score", "created_at").orderBy("id", "desc").limit(5);
        res.json({
            total: Number(total?.count || 0),
            average_complexity: Math.round(Number(avg?.avg || 0)),
            latest,
        });
    } catch (err) {
        console.error("Error fetching stats:", err.message);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

// Dashboard report CSV (user-scoped)
app.get('/report.csv', auth, async (req, res) => {
    try {
        const scoped = db('stories').where({ user_id: req.user.id });
        const totalRow = await scoped.clone().count({ count: 'id' }).first();
        const avgRow = await scoped.clone().avg({ avg: 'complexity_score' }).first();
        const latest = await scoped.clone().select('id', 'summary', 'complexity_score', 'created_at').orderBy('id', 'desc').limit(20);
        const lines = [
            'Metric,Value',
            `Total Stories,${Number(totalRow?.count || 0)}`,
            `Average Complexity,${Math.round(Number(avgRow?.avg || 0))}`,
            '',
            'Latest ID,Summary,Complexity,Created At',
            ...latest.map(r => {
                const s = String(r.summary || '').replace(/"/g, '""');
                return `${r.id},"${s}",${r.complexity_score || ''},${r.created_at || ''}`
            })
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="dashboard_report.csv"');
        res.send(lines);
    } catch (e) {
        res.status(500).json({ error: 'Report failed' });
    }
});

// Jira import/export stubs
app.get('/jira/template.csv', (_req, res) => {
    const header = 'Summary,Description,Labels,Story Points\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="jira_template.csv"');
    res.send(header);
});

app.post('/jira/export', auth, async (req, res) => {
    try {
        const rows = await db('stories').select('summary', 'description', 'labels', 'complexity_score').where({ user_id: req.user.id }).orderBy('id', 'desc');
        const header = 'Summary,Description,Labels,Story Points\n';
        const csv = rows.map(r => {
            const labels = (r.labels ? JSON.parse(r.labels) : []).join(' ');
            const s = String(r.summary || '').replace(/"/g, '""');
            const d = String(r.description || '').replace(/"/g, '""');
            return `"${s}","${d}","${labels}",${r.complexity_score || ''}`
        }).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="jira_export.csv"');
        res.send(header + csv);
    } catch (e) {
        res.status(500).json({ error: 'Export failed' });
    }
});

// Health check (includes DB ping)
app.get("/health", async (_req, res) => {
    try {
        await db.raw('SELECT 1');
        res.json({ status: "ok", db: "ok" });
    } catch (e) {
        res.status(500).json({ status: "degraded", db: "error" });
    }
});

// Root route for easy browser checks
app.get("/", (req, res) => {
    if (hasBuiltUI) {
        return res.sendFile(path.join(uiDir, "index.html"));
    }
    return res.json({ service: "api", status: "ok" });
});

// SPA fallback for client-side routes (only when UI is built) and not for asset files
if (hasBuiltUI) {
    app.get("*", (req, res, next) => {
        const requestedExtension = path.extname(req.path);
        if (requestedExtension) return next();
        return res.sendFile(path.join(uiDir, "index.html"));
    });
}

// Start server
const PORT = Number(process.env.PORT) || 8000;
(async () => {
    try {
        await initDB();
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`API server running on http://0.0.0.0:${PORT}`);
        });
    } catch (e) {
        console.error("DB init failed:", e.message);
        process.exit(1);
    }
})();
