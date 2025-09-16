// server.cjs
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { db, initDB } = require("./db.cjs"); // knex setup in db.cjs
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

// Serve static UI (apps/web)
const uiDir = path.join(__dirname, "..", "web");
app.use(express.static(uiDir));

// POST /estimate - analyze story & save
app.post("/estimate", async (req, res) => {
    try {
        const { summary, description, labels } = req.body;

        // call NLP service
        const nlpBaseUrl = process.env.NLP_URL || "http://localhost:8001";
        const nlpResponse = await axios.post(`${nlpBaseUrl}/estimate`, {
            summary,
            description,
            labels,
        });

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
    res.json({ service: "api", status: "ok" });
});

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
