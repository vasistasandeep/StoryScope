// Health check endpoint
const { db } = require('../apps/api/db.cjs');

export default async function handler(req, res) {
    try {
        if (!db) {
            return res.status(500).json({
                status: 'error',
                db: 'not_initialized',
                message: 'Database not available'
            });
        }
        await db.raw('SELECT 1');
        res.status(200).json({ status: 'ok', db: 'ok' });
    } catch (e) {
        res.status(500).json({
            status: 'error',
            db: 'error',
            message: e.message
        });
    }
}
