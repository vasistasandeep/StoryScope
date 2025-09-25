const knex = require("knex");
const path = require("path");

const isDevelopment = process.env.NODE_ENV === 'development';
const databaseUrl = process.env.DATABASE_URL;

// Decide if SSL is needed (Railway often requires it when using external connection strings)
const shouldUseSSL = (
    process.env.PGSSLMODE === 'require' ||
    process.env.DATABASE_SSL === 'true' ||
    (
        databaseUrl &&
        // Internal service URL usually doesn't need SSL
        !databaseUrl.includes('postgres.railway.internal')
    )
);

// Use SQLite locally if DATABASE_URL is not provided
const useSQLite = !databaseUrl;

const db = useSQLite
    ? knex({
        client: 'sqlite3',
        connection: { filename: path.join(__dirname, 'guestimate.db') },
        useNullAsDefault: true,
    })
    : knex({
        client: "pg",
        connection: shouldUseSSL
            ? { connectionString: databaseUrl, ssl: { rejectUnauthorized: false } }
            : { connectionString: databaseUrl },
        pool: {
            min: 2,
            max: 10,
            createTimeoutMillis: 3000,
            acquireTimeoutMillis: 30000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 100
        },
        migrations: {
            tableName: 'knex_migrations'
        }
    });

// Add connection testing
const testConnection = async () => {
    try {
        await db.raw('SELECT 1');
        console.log('✅ Database connection successful');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
};

// Create table if it doesn't exist
async function initDB() {
    try {
        await testConnection();
        // users table
        const usersExists = await db.schema.hasTable("users");
        if (!usersExists) {
            await db.schema.createTable("users", (t) => {
                t.increments("id").primary();
                t.string("email").notNullable().unique();
                t.string("password_hash").notNullable();
                t.string("role").notNullable().defaultTo('user');
                t.timestamp("created_at").defaultTo(db.fn.now());
            });
            console.log("✅ Table 'users' created");
        }

        const exists = await db.schema.hasTable("stories");
        if (!exists) {
            await db.schema.createTable("stories", (table) => {
                table.increments("id").primary();
                table.integer("user_id").references("id").inTable("users").nullable();
                table.string("summary").notNullable();
                table.text("description");
                table.text("labels");
                table.integer("complexity_score");
                table.timestamp("created_at").defaultTo(db.fn.now());
                table.timestamp("updated_at").defaultTo(db.fn.now());
            });
            console.log("✅ Table 'stories' created");
        } else {
            console.log("✅ Table 'stories' already exists");
        }
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
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

module.exports = { db, initDB, testConnection };