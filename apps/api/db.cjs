const knex = require("knex");
const path = require("path");

// Railway database configuration
const isRailway = !!process.env.RAILWAY_ENVIRONMENT;
const isDevelopment = process.env.NODE_ENV === 'development';

// Use SQLite only in development when no DATABASE_URL
const useSQLite = !process.env.DATABASE_URL && isDevelopment;

// Create database connection
let db;

if (useSQLite) {
    console.log('🗄️ Using SQLite database for development');
    db = knex({
        client: 'sqlite3',
        connection: { filename: path.join(__dirname, 'story_scope.db') },
        useNullAsDefault: true,
    });
} else {
    console.log('🐘 Using PostgreSQL database');
    
    // Railway connection - use the internal DATABASE_URL
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.error('❌ DATABASE_URL not found');
        console.error('Available vars:', {
            PGHOST: process.env.PGHOST,
            PGUSER: process.env.PGUSER,
            PGDATABASE: process.env.PGDATABASE,
            RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT
        });
        throw new Error('DATABASE_URL is required');
    }
    
    console.log('📡 Connecting to PostgreSQL...');
    console.log('🔗 Connection string format:', connectionString.replace(/:[^:@]*@/, ':***@'));
    
    db = knex({
        client: "pg",
        connection: {
            connectionString: connectionString,
            ssl: { rejectUnauthorized: false }
        },
        pool: {
            min: 1,
            max: 3,
            createTimeoutMillis: 30000,
            acquireTimeoutMillis: 60000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 2000,
            propagateCreateError: false
        },
        migrations: {
            tableName: 'knex_migrations'
        },
        acquireConnectionTimeout: 60000
    });
}

// Add connection testing with retry logic
const testConnection = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            await db.raw('SELECT 1');
            console.log('✅ Database connection successful');
            return;
        } catch (error) {
            console.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);
            if (i === retries - 1) {
                console.error('🔥 All connection attempts failed');
                throw error;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
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
        } else {
            const hasRole = await db.schema.hasColumn('users', 'role');
            if (!hasRole) {
                await db.schema.alterTable('users', (t) => {
                    t.string('role').notNullable().defaultTo('user');
                });
                console.log("✅ Column users.role added");
            }
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
                table.string("estimation_type").defaultTo('story'); // 'story' or 'module'
                table.string("team").nullable(); // Backend, Frontend, QA, etc.
                table.string("module").nullable(); // Module name for module-level estimation
                table.integer("actual_effort").nullable(); // For feedback loop
                table.boolean("feedback_provided").defaultTo(false);
                table.text("tags").nullable(); // For better categorization
                table.integer("priority").defaultTo(3); // 1-5 priority scale
                table.string("status").defaultTo('estimated'); // estimated, in_progress, completed
                table.timestamp("created_at").defaultTo(db.fn.now());
                table.timestamp("updated_at").defaultTo(db.fn.now());
            });
            console.log("✅ Table 'stories' created");
        } else {
            const hasUserId = await db.schema.hasColumn('stories', 'user_id');
            if (!hasUserId) {
                await db.schema.alterTable('stories', (t) => {
                    t.integer('user_id').references('id').inTable('users').nullable();
                });
                console.log("✅ Column stories.user_id added");
            }
            
            // Add new columns for enhanced features
            const newColumns = [
                'estimation_type', 'team', 'module', 'actual_effort', 
                'feedback_provided', 'tags', 'priority', 'status'
            ];
            
            for (const column of newColumns) {
                const hasColumn = await db.schema.hasColumn('stories', column);
                if (!hasColumn) {
                    await db.schema.alterTable('stories', (t) => {
                        switch(column) {
                            case 'estimation_type':
                                t.string('estimation_type').defaultTo('story');
                                break;
                            case 'team':
                            case 'module':
                            case 'tags':
                            case 'status':
                                t.string(column).nullable();
                                break;
                            case 'actual_effort':
                            case 'priority':
                                t.integer(column).nullable();
                                break;
                            case 'feedback_provided':
                                t.boolean(column).defaultTo(false);
                                break;
                        }
                    });
                    console.log(`✅ Column stories.${column} added`);
                }
            }
            
            // Set default values for existing records
            await db('stories').whereNull('estimation_type').update({ estimation_type: 'story' });
            await db('stories').whereNull('status').update({ status: 'estimated' });
            await db('stories').whereNull('priority').update({ priority: 3 });
            
            console.log("✅ Table 'stories' updated with new columns");
        }

        // Comments table for collaboration
        const commentsExists = await db.schema.hasTable("comments");
        if (!commentsExists) {
            await db.schema.createTable("comments", (table) => {
                table.increments("id").primary();
                table.integer("story_id").references("id").inTable("stories").onDelete("CASCADE");
                table.integer("user_id").references("id").inTable("users").nullable();
                table.text("content").notNullable();
                table.timestamp("created_at").defaultTo(db.fn.now());
            });
            console.log("✅ Table 'comments' created");
        }

        // User preferences table
        const preferencesExists = await db.schema.hasTable("user_preferences");
        if (!preferencesExists) {
            await db.schema.createTable("user_preferences", (table) => {
                table.increments("id").primary();
                table.integer("user_id").references("id").inTable("users").onDelete("CASCADE").unique();
                table.boolean("dark_mode").defaultTo(false);
                table.boolean("auto_save").defaultTo(true);
                table.boolean("show_tooltips").defaultTo(true);
                table.string("default_team").nullable();
                table.json("notification_settings").nullable();
                table.timestamp("created_at").defaultTo(db.fn.now());
                table.timestamp("updated_at").defaultTo(db.fn.now());
            });
            console.log("✅ Table 'user_preferences' created");
        }

        // Onboarding progress table
        const onboardingExists = await db.schema.hasTable("onboarding_progress");
        if (!onboardingExists) {
            await db.schema.createTable("onboarding_progress", (table) => {
                table.increments("id").primary();
                table.integer("user_id").references("id").inTable("users").onDelete("CASCADE").unique();
                table.boolean("tutorial_completed").defaultTo(false);
                table.json("completed_steps").nullable(); // Array of completed step IDs
                table.timestamp("created_at").defaultTo(db.fn.now());
                table.timestamp("updated_at").defaultTo(db.fn.now());
            });
            console.log("✅ Table 'onboarding_progress' created");
        }

        try {
            await db.raw('CREATE INDEX IF NOT EXISTS idx_stories_user_created ON stories (user_id, created_at DESC)');
            await db.raw('CREATE INDEX IF NOT EXISTS idx_stories_team_status ON stories (team, status)');
            await db.raw('CREATE INDEX IF NOT EXISTS idx_comments_story ON comments (story_id, created_at DESC)');
        } catch (_) { }
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