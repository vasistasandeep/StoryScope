const knex = require("knex");

const databaseUrl = process.env.DATABASE_URL || null;

let db;
if (databaseUrl) {
    db = knex({
        client: "pg",
        connection: databaseUrl,
        pool: { min: 2, max: 10 }
    });
    console.log("Using PostgreSQL via DATABASE_URL");
} else {
    db = knex({
        client: "sqlite3",
        connection: {
            filename: "./guestimate.db"
        },
        useNullAsDefault: true
    });
    console.log("Using local SQLite database ./guestimate.db");
}

// Create table if it doesn’t exist (simple schema for API service)
async function initDB() {
    const exists = await db.schema.hasTable("stories");
    if (!exists) {
        await db.schema.createTable("stories", (table) => {
            table.increments("id").primary();
            table.string("summary");
            table.text("description");
            table.text("labels");
            table.integer("complexity_score");
            table.timestamp("created_at").defaultTo(db.fn.now());
        });
        console.log("✅ Table 'stories' created");
    }
}

module.exports = { db, initDB };



