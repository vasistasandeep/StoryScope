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
        const { 
            summary, 
            description, 
            labels, 
            estimation_type = 'story',
            team,
            module,
            priority = 3,
            tags
        } = req.body || {};
        
        if (!summary || typeof summary !== 'string') {
            return res.status(400).json({ error: 'summary is required' });
        }
        
        // Validate module-level estimation requirements
        if (estimation_type === 'module') {
            if (!team) return res.status(400).json({ error: 'team required for module-level estimation' });
            if (!module) return res.status(400).json({ error: 'module required for module-level estimation' });
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
                    estimation_type,
                    team,
                    module,
                    priority
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
            // Fallback to mock NLP service - create mock response directly
            // Enhanced estimation with hour-based calculations using login story as baseline
            const text = `${summary} ${description} ${(labels || []).join(' ')} ${team || ''} ${module || ''}`.toLowerCase();
            const wordCount = text.split(/\s+/).length;
            
            // Baseline: Simple login story = 8 hours (1 story point)
            const LOGIN_BASELINE_HOURS = 8;
            
            // Calculate base complexity score
            let complexity = Math.min(100, wordCount * 2 + Math.random() * 10);

            // Story type analysis for more accurate estimation
            const storyTypes = {
                'login': { baseHours: 8, keywords: ['login', 'auth', 'authentication', 'signin', 'sign in'] },
                'crud': { baseHours: 12, keywords: ['create', 'read', 'update', 'delete', 'crud', 'form', 'list'] },
                'api': { baseHours: 16, keywords: ['api', 'endpoint', 'service', 'integration', 'rest', 'graphql'] },
                'ui': { baseHours: 10, keywords: ['ui', 'interface', 'component', 'page', 'screen', 'design'] },
                'database': { baseHours: 20, keywords: ['database', 'schema', 'migration', 'query', 'sql', 'table'] },
                'security': { baseHours: 24, keywords: ['security', 'encryption', 'validation', 'permission', 'role'] },
                'integration': { baseHours: 32, keywords: ['integration', 'third-party', 'external', 'webhook', 'sync'] },
                'deployment': { baseHours: 16, keywords: ['deployment', 'deploy', 'ci/cd', 'pipeline', 'docker'] }
            };

            // Determine story type and base hours
            let baseHours = LOGIN_BASELINE_HOURS;
            let detectedType = 'general';
            
            for (const [type, config] of Object.entries(storyTypes)) {
                const matchCount = config.keywords.filter(keyword => text.includes(keyword)).length;
                if (matchCount > 0) {
                    baseHours = config.baseHours;
                    detectedType = type;
                    complexity += matchCount * 5; // Boost complexity for keyword matches
                    break;
                }
            }

            // Estimation type factor
            if (estimation_type === 'module') {
                baseHours *= 2.5; // Module-level estimations are significantly more complex
                complexity *= 1.5;
            }

            // Team-specific complexity adjustments (based on typical team velocities)
            const teamFactors = {
                'Backend': { complexity: 1.2, hourMultiplier: 1.1 },
                'Frontend': { complexity: 1.0, hourMultiplier: 1.0 },
                'QA': { complexity: 0.8, hourMultiplier: 1.3 }, // QA takes longer but less complex
                'DevOps': { complexity: 1.3, hourMultiplier: 1.4 },
                'Design': { complexity: 0.9, hourMultiplier: 1.2 },
                'Product': { complexity: 0.7, hourMultiplier: 0.8 }
            };
            
            if (team && teamFactors[team]) {
                complexity *= teamFactors[team].complexity;
                baseHours *= teamFactors[team].hourMultiplier;
            }

            // Priority factor (higher priority = more thorough work needed)
            const priorityFactors = { 1: 1.4, 2: 1.2, 3: 1.0, 4: 0.9, 5: 0.8 };
            const priorityMultiplier = priorityFactors[priority] || 1.0;
            complexity *= priorityMultiplier;
            baseHours *= priorityMultiplier;

            // Uncertainty penalty
            const uncertaintyKeywords = ['maybe', 'unclear', 'tbd', 'unknown', 'investigate', 'research'];
            const uncertaintyCount = uncertaintyKeywords.filter(keyword => text.includes(keyword)).length;
            if (uncertaintyCount > 0) {
                complexity += uncertaintyCount * 15;
                baseHours *= (1 + uncertaintyCount * 0.3); // 30% more time per uncertainty
            }

            // Technical complexity boost
            const techKeywords = ['microservice', 'scalability', 'performance', 'optimization', 'algorithm', 'architecture'];
            const techCount = techKeywords.filter(keyword => text.includes(keyword)).length;
            complexity += techCount * 12;
            baseHours *= (1 + techCount * 0.25);

            // Finalize complexity score
            complexity = Math.min(100, Math.max(1, complexity));

            // Calculate story points using Fibonacci sequence
            const fibPoints = [1, 2, 3, 5, 8, 13, 21];
            const thresholds = [15, 25, 40, 55, 70, 85, 100];
            let storyPoints = fibPoints[0];
            for (let i = 0; i < thresholds.length; i++) {
                if (complexity <= thresholds[i]) {
                    storyPoints = fibPoints[i];
                    break;
                }
            }

            // Calculate estimated hours (round to nearest 0.5 hour)
            const estimatedHours = Math.round(baseHours * 2) / 2;
            
            // Calculate confidence level based on story clarity
            const confidenceFactors = {
                highConfidence: ['login', 'crud', 'simple', 'basic', 'standard'],
                mediumConfidence: ['complex', 'advanced', 'custom'],
                lowConfidence: ['unclear', 'tbd', 'investigate', 'research', 'unknown']
            };
            
            let confidence = 'medium';
            if (confidenceFactors.highConfidence.some(word => text.includes(word))) {
                confidence = 'high';
            } else if (confidenceFactors.lowConfidence.some(word => text.includes(word))) {
                confidence = 'low';
            }

            nlpResponse = {
                data: {
                    summary,
                    description,
                    labels: labels || [],
                    complexity_score: Math.round(complexity * 10) / 10,
                    story_points: storyPoints,
                    estimated_hours: estimatedHours,
                    story_type: detectedType,
                    confidence_level: confidence,
                    estimation_type,
                    team,
                    module,
                    priority,
                    baseline_reference: {
                        type: 'login_story',
                        hours: LOGIN_BASELINE_HOURS,
                        description: 'Simple user login functionality'
                    },
                    analysis: {
                        token_count: wordCount,
                        sentence_count: text.split(/[.!?]+/).length,
                        avg_sentence_len: wordCount / Math.max(1, text.split(/[.!?]+/).length),
                        uncertainty_factor: uncertaintyCount,
                        technical_factor: techCount,
                        entity_factor: 0,
                        label_factor: (labels || []).length,
                        team_factor: team ? teamFactors[team]?.hourMultiplier || 1 : 1,
                        priority_factor: priorityMultiplier,
                        story_type_factor: baseHours / LOGIN_BASELINE_HOURS,
                        short_sentence_penalty: 0
                    }
                }
            };
        }

        // Ensure complexity_score is an integer to match DB schema
        const complexity_score = Math.round(Number(nlpResponse.data?.complexity_score) || 0);

        // Prepare data for insertion, only include fields that exist in the database
        const insertData = {
            user_id: req.user?.id || null,
            summary,
            description: description || '',
            labels: JSON.stringify(labels || []),
            complexity_score
        };

        // Add new fields only if they exist in the database schema
        try {
            const hasEstimationType = await db.schema.hasColumn('stories', 'estimation_type');
            const hasTeam = await db.schema.hasColumn('stories', 'team');
            const hasModule = await db.schema.hasColumn('stories', 'module');
            const hasPriority = await db.schema.hasColumn('stories', 'priority');
            const hasTags = await db.schema.hasColumn('stories', 'tags');
            const hasStatus = await db.schema.hasColumn('stories', 'status');

            if (hasEstimationType) insertData.estimation_type = estimation_type;
            if (hasTeam) insertData.team = team || null;
            if (hasModule) insertData.module = module || null;
            if (hasPriority) insertData.priority = priority;
            if (hasTags) insertData.tags = tags || null;
            if (hasStatus) insertData.status = 'estimated';
        } catch (schemaError) {
            console.log("Schema check failed, using basic fields only:", schemaError.message);
        }

        // insert into DB (ensure id is returned in Postgres)
        const inserted = await db("stories").insert(insertData, ["id"]);
        const id = Array.isArray(inserted)
            ? (typeof inserted[0] === 'object' ? inserted[0].id : inserted[0])
            : inserted;

        res.json({
            id,
            summary,
            description,
            labels,
            complexity_score,
            story_points: nlpResponse.data?.story_points || 1,
            estimated_hours: nlpResponse.data?.estimated_hours || 8,
            story_type: nlpResponse.data?.story_type || 'general',
            confidence_level: nlpResponse.data?.confidence_level || 'medium',
            baseline_reference: nlpResponse.data?.baseline_reference,
            estimation_type,
            team,
            module,
            priority,
            tags,
            status: 'estimated',
            analysis: nlpResponse.data?.analysis
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

// Comments endpoints
app.get('/stories/:id/comments', auth, async (req, res) => {
    try {
        const storyId = parseInt(req.params.id);
        const comments = await db('comments')
            .join('users', 'comments.user_id', 'users.id')
            .select('comments.*', 'users.email as user_email')
            .where('comments.story_id', storyId)
            .orderBy('comments.created_at', 'desc');
        res.json(comments);
    } catch (err) {
        console.error('Error fetching comments:', err.message);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

app.post('/stories/:id/comments', auth, async (req, res) => {
    try {
        const storyId = parseInt(req.params.id);
        const { content } = req.body;
        
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Comment content is required' });
        }

        const [commentId] = await db('comments').insert({
            story_id: storyId,
            user_id: req.user.id,
            content: content.trim()
        }, ['id']);

        const comment = await db('comments')
            .join('users', 'comments.user_id', 'users.id')
            .select('comments.*', 'users.email as user_email')
            .where('comments.id', commentId.id || commentId)
            .first();

        res.json(comment);
    } catch (err) {
        console.error('Error creating comment:', err.message);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

// Feedback endpoint for reinforcement learning
app.post('/stories/:id/feedback', auth, async (req, res) => {
    try {
        const storyId = parseInt(req.params.id);
        const { actual_effort, feedback_notes } = req.body;
        
        if (!actual_effort || actual_effort < 0) {
            return res.status(400).json({ error: 'Valid actual effort is required' });
        }

        await db('stories')
            .where({ id: storyId, user_id: req.user.id })
            .update({
                actual_effort,
                feedback_provided: true,
                updated_at: db.fn.now()
            });

        // Add feedback as a comment
        if (feedback_notes) {
            await db('comments').insert({
                story_id: storyId,
                user_id: req.user.id,
                content: `📊 Feedback: Actual effort was ${actual_effort} points. ${feedback_notes}`
            });
        }

        res.json({ success: true, message: 'Feedback recorded successfully' });
    } catch (err) {
        console.error('Error recording feedback:', err.message);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
});

// User preferences endpoints
app.get('/user/preferences', auth, async (req, res) => {
    try {
        const preferences = await db('user_preferences')
            .where('user_id', req.user.id)
            .first();
        
        res.json(preferences || {
            dark_mode: false,
            auto_save: true,
            show_tooltips: true,
            default_team: null,
            notification_settings: {}
        });
    } catch (err) {
        console.error('Error fetching preferences:', err.message);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

app.post('/user/preferences', auth, async (req, res) => {
    try {
        const { dark_mode, auto_save, show_tooltips, default_team, notification_settings } = req.body;
        
        await db('user_preferences')
            .insert({
                user_id: req.user.id,
                dark_mode: !!dark_mode,
                auto_save: !!auto_save,
                show_tooltips: !!show_tooltips,
                default_team,
                notification_settings: JSON.stringify(notification_settings || {}),
                updated_at: db.fn.now()
            })
            .onConflict('user_id')
            .merge({
                dark_mode: !!dark_mode,
                auto_save: !!auto_save,
                show_tooltips: !!show_tooltips,
                default_team,
                notification_settings: JSON.stringify(notification_settings || {}),
                updated_at: db.fn.now()
            });

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating preferences:', err.message);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// Onboarding endpoints
app.get('/user/onboarding', auth, async (req, res) => {
    try {
        const progress = await db('onboarding_progress')
            .where('user_id', req.user.id)
            .first();
        
        res.json(progress || {
            tutorial_completed: false,
            completed_steps: []
        });
    } catch (err) {
        console.error('Error fetching onboarding progress:', err.message);
        res.status(500).json({ error: 'Failed to fetch onboarding progress' });
    }
});

app.post('/user/onboarding/step', auth, async (req, res) => {
    try {
        const { step_id } = req.body;
        
        if (!step_id) {
            return res.status(400).json({ error: 'Step ID is required' });
        }

        const existing = await db('onboarding_progress')
            .where('user_id', req.user.id)
            .first();

        if (existing) {
            const completedSteps = JSON.parse(existing.completed_steps || '[]');
            if (!completedSteps.includes(step_id)) {
                completedSteps.push(step_id);
            }
            
            const updateData = {
                completed_steps: JSON.stringify(completedSteps),
                updated_at: db.fn.now()
            };
            
            // Mark tutorial as completed if this is the completion step
            if (step_id === 'tutorial_completed') {
                updateData.tutorial_completed = true;
            }
            
            await db('onboarding_progress')
                .where('user_id', req.user.id)
                .update(updateData);
        } else {
            const insertData = {
                user_id: req.user.id,
                completed_steps: JSON.stringify([step_id])
            };
            
            // Mark tutorial as completed if this is the completion step
            if (step_id === 'tutorial_completed') {
                insertData.tutorial_completed = true;
            }
            
            await db('onboarding_progress').insert(insertData);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating onboarding step:', err.message);
        res.status(500).json({ error: 'Failed to update onboarding step' });
    }
});

// Database migration endpoint (admin only)
app.post("/admin/migrate", auth, requireAdmin, async (_req, res) => {
    try {
        console.log("Starting database migration...");
        await initDB();
        res.json({ success: true, message: "Database migration completed successfully" });
    } catch (error) {
        console.error("Migration failed:", error);
        res.status(500).json({ error: "Migration failed", details: error.message });
    }
});

// Health check (includes DB ping)
app.get("/health", async (_req, res) => {
    try {
        await db.raw('SELECT 1');
        
        // Check if new columns exist
        const hasNewColumns = await Promise.all([
            db.schema.hasColumn('stories', 'estimation_type'),
            db.schema.hasColumn('stories', 'team'),
            db.schema.hasColumn('stories', 'priority'),
            db.schema.hasTable('comments'),
            db.schema.hasTable('user_preferences')
        ]);
        
        const schemaStatus = hasNewColumns.every(Boolean) ? "updated" : "needs_migration";
        
        res.json({ 
            status: "ok", 
            db: "ok", 
            schema: schemaStatus,
            columns: {
                estimation_type: hasNewColumns[0],
                team: hasNewColumns[1], 
                priority: hasNewColumns[2],
                comments_table: hasNewColumns[3],
                preferences_table: hasNewColumns[4]
            }
        });
    } catch (e) {
        res.status(500).json({ status: "degraded", db: "error", error: e.message });
    }
});

// Root route for easy browser checks
app.get("/", (req, res) => {
    if (hasBuiltUI) {
        return res.sendFile(path.join(uiDir, "index.html"));
    }
    return res.json({ service: "api", status: "ok" });
});

// SPA fallback for client-side routes (only when UI is built) and not for asset files or API routes
if (hasBuiltUI) {
    app.get("*", (req, res, next) => {
        const requestedExtension = path.extname(req.path);
        // Don't serve SPA for asset files
        if (requestedExtension) return next();
        
        // Don't serve SPA for API routes - let them return proper 404/405 errors
        const apiRoutes = ['/estimate', '/stories', '/stats', '/auth', '/admin', '/health', '/report.csv', '/jira', '/user'];
        const isApiRoute = apiRoutes.some(route => req.path.startsWith(route));
        if (isApiRoute) return next();
        
        return res.sendFile(path.join(uiDir, "index.html"));
    });
}

// Start server
const PORT = Number(process.env.PORT) || 8000;

// Start server with graceful database handling
const startServer = async () => {
    try {
        console.log('🚀 Starting Story Scope server...');
        console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
        console.log('🌐 Port:', PORT);
        
        // Try to initialize database
        await initDB();
        console.log('✅ Database initialized successfully');
        
        // Start the server
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🎉 Story Scope API server running on http://0.0.0.0:${PORT}`);
            console.log('📊 Health check: /health');
            console.log('🗄️ Database: Connected');
        });
        
    } catch (error) {
        console.error("💥 Failed to start server:", error.message);
        console.error("🔍 Full error:", error);
        
        // In production, try to start without database (will fail gracefully on requests)
        if (process.env.NODE_ENV === 'production') {
            console.log('⚠️ Starting server without database (requests will fail until DB is fixed)');
            app.listen(PORT, "0.0.0.0", () => {
                console.log(`🆘 Story Scope API server running on http://0.0.0.0:${PORT} (DATABASE OFFLINE)`);
            });
        } else {
            process.exit(1);
        }
    }
};

startServer();
