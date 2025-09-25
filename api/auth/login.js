// User login endpoint
const { db } = require('../../apps/api/db.cjs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';

function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password required' });
    }

    try {
        const [user] = await db('users').where({ email }).select('*');
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(String(password), user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signToken({
            id: user.id,
            email: user.email,
            role: user.role
        });

        res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (e) {
        res.status(500).json({ error: 'Login failed' });
    }
}
