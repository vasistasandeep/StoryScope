#!/usr/bin/env node

/**
 * Database Migration Script for Story Scope
 * Run this to update your database schema with the new enhanced features
 */

const { initDB, testConnection } = require('./apps/api/db.cjs');

async function runMigration() {
    console.log('🚀 Starting Story Scope database migration...');
    
    try {
        // Test connection first
        await testConnection();
        
        // Run the migration
        await initDB();
        
        console.log('✅ Migration completed successfully!');
        console.log('📊 Your database now supports:');
        console.log('   - Team & module-level estimation');
        console.log('   - Priority levels (1-5 scale)');
        console.log('   - Estimation types (story/module)');
        console.log('   - Feedback collection for learning');
        console.log('   - Comments for team collaboration');
        console.log('   - User preferences');
        console.log('   - Onboarding progress tracking');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

// Run the migration
runMigration();
