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

        const complexity_score = nlpResponse.data.complexity_score || 0;

        // insert into DB
        const [id] = await db("stories").insert({
            summary,
            description,
            labels: JSON.stringify(labels || []),
            complexity_score,
        });

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
        const stories = await db("stories").select("*").orderBy("id", "desc");

        // convert labels back from JSON string
        const parsed = stories.map((s) => ({
            ...s,
            labels: s.labels ? JSON.parse(s.labels) : [],
        }));

        res.json(parsed);
    } catch (err) {
        console.error("Error fetching stories:", err.message);
        res.status(500).json({ error: "Failed to fetch stories" });
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
