#!/usr/bin/env node

/**
 * Unified SmartStart Backend Server
 * Includes all API endpoints: core, professional profile, venture board, team management
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = 3344;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../app')));

// Database connection
const dbPath = path.join(__dirname, 'data/smartstart.db');
const db = new sqlite3.Database(dbPath);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Initialize database
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        // Core tables
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            role TEXT DEFAULT 'founder',
            isActive BOOLEAN DEFAULT 1,
            emailVerified BOOLEAN DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS ventures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            stage TEXT DEFAULT 'discovery',
            status TEXT DEFAULT 'active',
            progress INTEGER DEFAULT 0,
            industry TEXT,
            targetMarket TEXT,
            businessModel TEXT,
            teamSize INTEGER DEFAULT 1,
            revenue REAL DEFAULT 0,
            valuation REAL,
            startDate DATE,
            launchDate DATE,
            tags TEXT,
            isPublic BOOLEAN DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id)
        )`);

        // Professional profile tables
        db.run(`CREATE TABLE IF NOT EXISTS user_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            headline TEXT,
            summary TEXT,
            location TEXT,
            industry TEXT,
            experience_level TEXT,
            availability_status TEXT DEFAULT 'available',
            profile_visibility TEXT DEFAULT 'public',
            profile_completion INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS professional_experience (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            location TEXT,
            employment_type TEXT DEFAULT 'full-time',
            start_date DATE,
            end_date DATE,
            is_current BOOLEAN DEFAULT 0,
            description TEXT,
            achievements TEXT,
            skills TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS education (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            institution TEXT NOT NULL,
            degree TEXT,
            field_of_study TEXT,
            start_date DATE,
            end_date DATE,
            grade TEXT,
            activities TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            skill_name TEXT NOT NULL,
            skill_level TEXT DEFAULT 'intermediate',
            endorsements INTEGER DEFAULT 0,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id)
        )`);

        // Team and venture management tables
        db.run(`CREATE TABLE IF NOT EXISTS team_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ventureId INTEGER NOT NULL,
            userId INTEGER NOT NULL,
            role TEXT NOT NULL,
            equity_percentage REAL DEFAULT 0,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active',
            FOREIGN KEY (ventureId) REFERENCES ventures (id),
            FOREIGN KEY (userId) REFERENCES users (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ventureId INTEGER NOT NULL,
            userId INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'todo',
            priority TEXT DEFAULT 'medium',
            due_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ventureId) REFERENCES ventures (id),
            FOREIGN KEY (userId) REFERENCES users (id)
        )`);

        // Connections and networking
        db.run(`CREATE TABLE IF NOT EXISTS connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            connected_user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            connection_type TEXT DEFAULT 'professional',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (connected_user_id) REFERENCES users (id)
        )`);

        // Analytics and tracking
        db.run(`CREATE TABLE IF NOT EXISTS profile_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_user_id INTEGER NOT NULL,
            viewer_id INTEGER,
            view_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (profile_user_id) REFERENCES users (id),
            FOREIGN KEY (viewer_id) REFERENCES users (id)
        )`);

        // Audit trails
        db.run(`CREATE TABLE IF NOT EXISTS audit_trails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            ipAddress TEXT,
            userAgent TEXT,
            auditHash TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users (id)
        )`);

        resolve();
    });
};

// ========================================
// AUTHENTICATION ENDPOINTS
// ========================================

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        
        // Check if user already exists
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const userId = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (email, password, firstName, lastName) VALUES (?, ?, ?, ?)',
                [email, hashedPassword, firstName, lastName],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        // Generate JWT token
        const token = jwt.sign(
            { id: userId, email, role: 'founder' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                user: { id: userId, email, firstName, lastName, role: 'founder' }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// ========================================
// VENTURE MANAGEMENT ENDPOINTS
// ========================================

// Get user ventures
app.get('/api/ventures', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all('SELECT * FROM ventures WHERE userId = ? ORDER BY createdAt DESC', [userId], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: rows });
    });
});

// Get venture by ID
app.get('/api/ventures/:id', authenticateToken, (req, res) => {
    const ventureId = req.params.id;
    const userId = req.user.id;

    db.get('SELECT * FROM ventures WHERE id = ? AND userId = ?', [ventureId, userId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!row) {
            return res.status(404).json({ success: false, message: 'Venture not found' });
        }

        res.json({ success: true, data: row });
    });
});

// ========================================
// TEAM MANAGEMENT ENDPOINTS
// ========================================

// Get team members for a venture
app.get('/api/ventures/:ventureId/team', authenticateToken, (req, res) => {
    const ventureId = req.params.ventureId;

    const query = `
        SELECT tm.*, u.firstName, u.lastName, u.email
        FROM team_members tm
        JOIN users u ON tm.userId = u.id
        WHERE tm.ventureId = ?
    `;

    db.all(query, [ventureId], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: rows });
    });
});

// Get all team members (for team page)
app.get('/api/team-members', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT tm.*, u.firstName, u.lastName, u.email, v.name as ventureName
        FROM team_members tm
        JOIN users u ON tm.userId = u.id
        JOIN ventures v ON tm.ventureId = v.id
        WHERE v.userId = ?
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: rows });
    });
});

// ========================================
// TASK MANAGEMENT ENDPOINTS
// ========================================

// Get tasks for a venture
app.get('/api/ventures/:ventureId/tasks', authenticateToken, (req, res) => {
    const ventureId = req.params.ventureId;

    db.all('SELECT * FROM tasks WHERE ventureId = ? ORDER BY created_at DESC', [ventureId], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: rows });
    });
});

// Get all tasks for user
app.get('/api/tasks', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT t.*, v.name as ventureName
        FROM tasks t
        JOIN ventures v ON t.ventureId = v.id
        WHERE v.userId = ?
        ORDER BY t.created_at DESC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: rows });
    });
});

// ========================================
// PROFESSIONAL PROFILE ENDPOINTS
// ========================================

// Get user profile
app.get('/api/users/profile', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT 
            u.*,
            up.headline,
            up.summary,
            up.location,
            up.industry,
            up.experience_level,
            up.availability_status,
            up.profile_visibility,
            up.profile_completion
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.userId
        WHERE u.id = ?
    `;

    db.get(query, [userId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!row) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        res.json({ success: true, data: row });
    });
});

// Create or update user profile
app.post('/api/users/profile', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const profileData = req.body;

    const query = `
        INSERT OR REPLACE INTO user_profiles (
            userId, headline, summary, location, industry, experience_level,
            availability_status, profile_visibility, profile_completion, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const values = [
        userId,
        profileData.headline || '',
        profileData.summary || '',
        profileData.location || '',
        profileData.industry || '',
        profileData.experience_level || '',
        profileData.availability_status || 'available',
        profileData.profile_visibility || 'public',
        profileData.profile_completion || 0
    ];

    db.run(query, values, function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Profile updated successfully', id: this.lastID });
    });
});

// ========================================
// DASHBOARD ENDPOINTS
// ========================================

// Get dashboard stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;

    // Get venture count
    db.get('SELECT COUNT(*) as ventureCount FROM ventures WHERE userId = ?', [userId], (err, ventureResult) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        // Get team member count
        db.get(`
            SELECT COUNT(*) as teamCount 
            FROM team_members tm 
            JOIN ventures v ON tm.ventureId = v.id 
            WHERE v.userId = ?
        `, [userId], (err, teamResult) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }

            // Get task count
            db.get(`
                SELECT COUNT(*) as taskCount 
                FROM tasks t 
                JOIN ventures v ON t.ventureId = v.id 
                WHERE v.userId = ?
            `, [userId], (err, taskResult) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                res.json({
                    success: true,
                    data: {
                        ventures: ventureResult.ventureCount,
                        teamMembers: teamResult.teamCount,
                        tasks: taskResult.taskCount,
                        connections: 0,
                        profileViews: 0
                    }
                });
            });
        });
    });
});

// ========================================
// CONNECTIONS ENDPOINTS
// ========================================

// Get connections count
app.get('/api/connections/count', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.get('SELECT COUNT(*) as count FROM connections WHERE user_id = ? AND status = "accepted"', [userId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, count: row.count });
    });
});

// Get suggested connections
app.get('/api/connections/suggested', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT u.id, u.firstName, u.lastName, up.headline
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.userId
        WHERE u.id != ? AND u.id NOT IN (
            SELECT connected_user_id FROM connections WHERE user_id = ?
        )
        LIMIT 10
    `;

    db.all(query, [userId, userId], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        const suggestions = rows.map(row => ({
            id: row.id,
            name: `${row.firstName} ${row.lastName}`,
            title: row.headline || 'Professional',
            initials: `${row.firstName[0]}${row.lastName[0]}`
        }));

        res.json({ success: true, data: suggestions });
    });
});

// ========================================
// ANALYTICS ENDPOINTS
// ========================================

// Get profile views count
app.get('/api/profile-views/count', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.get('SELECT COUNT(*) as count FROM profile_views WHERE profile_user_id = ?', [userId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, count: row.count });
    });
});

// Get recent activity
app.get('/api/activity/recent', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT action, details, createdAt
        FROM audit_trails
        WHERE userId = ?
        ORDER BY createdAt DESC
        LIMIT 10
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        const activities = rows.map(row => ({
            type: row.action,
            description: row.details,
            time: formatTimeAgo(row.createdAt)
        }));

        res.json({ success: true, data: activities });
    });
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

// ========================================
// HEALTH CHECK
// ========================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ========================================
// START SERVER
// ========================================

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Unified SmartStart Backend running on port ${PORT}`);
        console.log(`📊 Database: SQLite (${dbPath})`);
        console.log(`🔐 Authentication: JWT enabled`);
        console.log(`🌐 API: http://localhost:${PORT}`);
        console.log(`✅ Database initialized successfully`);
        console.log(`📋 Available endpoints:`);
        console.log(`   • Authentication: /api/auth/register, /api/auth/login`);
        console.log(`   • Ventures: /api/ventures`);
        console.log(`   • Team: /api/team-members, /api/ventures/:id/team`);
        console.log(`   • Tasks: /api/tasks, /api/ventures/:id/tasks`);
        console.log(`   • Profile: /api/users/profile`);
        console.log(`   • Dashboard: /api/dashboard/stats`);
        console.log(`   • Connections: /api/connections/count, /api/connections/suggested`);
        console.log(`   • Analytics: /api/profile-views/count, /api/activity/recent`);
    });
}).catch(error => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
});

module.exports = app;
