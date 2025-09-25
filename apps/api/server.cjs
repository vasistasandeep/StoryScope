// server.cjs
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { db, initDB } = require("./db.cjs"); // knex setup in db.cjs
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

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

// POST /estimate - analyze story & save
app.post("/estimate", async (req, res) => {
    try {
        const { summary, description, labels } = req.body;

        // call NLP service (with fallback to mock)
        const nlpBaseUrl = process.env.NLP_URL || "http://localhost:8001";
        let nlpResponse;

        try {
            nlpResponse = await axios.post(`${nlpBaseUrl}/estimate`, {
                summary,
                description,
                labels,
            });
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
        const complexity_score = Math.round(Number(nlpResponse.data.complexity_score) || 0);

        // insert into DB (ensure id is returned in Postgres)
        const inserted = await db("stories").insert({
            summary,
            description,
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
        res.status(500).json({ error: "NLP service unavailable" });
    }
});

// GET /stories - fetch all stories
app.get("/stories", async (req, res) => {
    try {
        const { search = "", page = "1", limit = "10" } = req.query;
        const pageNum = Math.max(1, parseInt(String(page)) || 1);
        const pageSize = Math.min(50, Math.max(1, parseInt(String(limit)) || 10));

        let query = db("stories").select("id", "summary", "description", "labels", "complexity_score", "created_at");
        if (search) {
            query = query.whereILike("summary", `%${search}%`).orWhereILike("description", `%${search}%`);
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
app.get("/stories/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id) return res.status(400).json({ error: "Invalid id" });
        const row = await db("stories").where({ id }).first();
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
app.patch("/stories/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { summary, description, labels } = req.body || {};
        const update = {};
        if (summary !== undefined) update.summary = summary;
        if (description !== undefined) update.description = description;
        if (labels !== undefined) update.labels = JSON.stringify(labels || []);
        if (Object.keys(update).length === 0) return res.status(400).json({ error: "No fields to update" });
        await db("stories").where({ id }).update(update);
        const row = await db("stories").where({ id }).first();
        if (!row) return res.status(404).json({ error: "Not found" });
        row.labels = row.labels ? JSON.parse(row.labels) : [];
        res.json(row);
    } catch (err) {
        console.error("Error updating story:", err.message);
        res.status(500).json({ error: "Failed to update story" });
    }
});

// DELETE /stories/:id - delete story
app.delete("/stories/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const deleted = await db("stories").where({ id }).del();
        if (!deleted) return res.status(404).json({ error: "Not found" });
        res.json({ ok: true });
    } catch (err) {
        console.error("Error deleting story:", err.message);
        res.status(500).json({ error: "Failed to delete story" });
    }
});

// GET /stats - simple stats for dashboard
app.get("/stats", async (_req, res) => {
    try {
        const total = await db("stories").count({ count: "id" }).first();
        const avg = await db("stories").avg({ avg: "complexity_score" }).first();
        const latest = await db("stories").select("id", "summary", "complexity_score", "created_at").orderBy("id", "desc").limit(5);
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

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
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
    } catch (e) {
        console.error("DB init failed:", e.message);
    }
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`API server running on http://0.0.0.0:${PORT}`);
    });
})();
