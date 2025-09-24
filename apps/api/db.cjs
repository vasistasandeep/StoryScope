const knex = require("knex");

const isDevelopment = process.env.NODE_ENV === 'development';
const databaseUrl = process.env.DATABASE_URL;

// More detailed error message
if (!databaseUrl && !isDevelopment) {
    console.error('Configuration Error: DATABASE_URL is not set');
    console.error('Please ensure you have:');
    console.error('1. Created a PostgreSQL database in Railway');
    console.error('2. Connected the database to your service');
    console.error('3. Set the DATABASE_URL environment variable');
    throw new Error("DATABASE_URL environment variable is required in production");
}

const db = knex({
    client: "pg",
    connection: databaseUrl,
    pool: { min: 2, max: 10 },
    migrations: {
        tableName: 'knex_migrations'
    }
});

console.log("Using PostgreSQL database");

// Create table if it doesn't exist
async function initDB() {
    const exists = await db.schema.hasTable("stories");
    if (!exists) {
        await db.schema.createTable("stories", (table) => {
            table.increments("id").primary();
            table.string("summary").notNullable();
            table.text("description");
            table.text("labels");
            table.integer("complexity_score");
            table.timestamp("created_at").defaultTo(db.fn.now());
            table.timestamp("updated_at").defaultTo(db.fn.now());
        });
        console.log("✅ Table 'stories' created");
    }
}

// Error handling
db.on('error', (err) => {
    console.error('Database error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await db.destroy();
        console.log('Database connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during database shutdown:', err);
        process.exit(1);
    }
});

module.exports = { db, initDB };