#!/usr/bin/env node

/**
 * Professional Profile API Endpoints
 * LinkedIn-style professional profile with full CRUD operations and RBAC
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3344;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../app')));

// Database connection
const dbPath = path.join(__dirname, 'data/smartstart.db');
const db = new sqlite3.Database(dbPath);

// JWT Secret (in production, use environment variable)
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

// RBAC middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Insufficient permissions' });
        }

        next();
    };
};

// Professional Profile API Endpoints

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

// Update profile completion
app.put('/api/users/profile/completion', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { completion } = req.body;

    const query = 'UPDATE user_profiles SET profile_completion = ?, updated_at = CURRENT_TIMESTAMP WHERE userId = ?';

    db.run(query, [completion, userId], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Profile completion updated' });
    });
});

// Professional Experience CRUD

// Get professional experience
app.get('/api/users/profile/experience', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = 'SELECT * FROM professional_experience WHERE userId = ? ORDER BY start_date DESC';

    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: rows });
    });
});

// Add professional experience
app.post('/api/users/profile/experience', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const experienceData = req.body;

    const query = `
        INSERT INTO professional_experience (
            userId, title, company, location, employment_type, start_date, end_date,
            is_current, description, achievements, skills
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        userId,
        experienceData.title,
        experienceData.company,
        experienceData.location || '',
        experienceData.employment_type || 'full-time',
        experienceData.start_date || null,
        experienceData.end_date || null,
        experienceData.is_current || 0,
        experienceData.description || '',
        experienceData.achievements || '',
        experienceData.skills || ''
    ];

    db.run(query, values, function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Experience added successfully', id: this.lastID });
    });
});

// Update professional experience
app.put('/api/users/profile/experience/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const experienceId = req.params.id;
    const experienceData = req.body;

    const query = `
        UPDATE professional_experience SET
            title = ?, company = ?, location = ?, employment_type = ?, start_date = ?,
            end_date = ?, is_current = ?, description = ?, achievements = ?, skills = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND userId = ?
    `;

    const values = [
        experienceData.title,
        experienceData.company,
        experienceData.location || '',
        experienceData.employment_type || 'full-time',
        experienceData.start_date || null,
        experienceData.end_date || null,
        experienceData.is_current || 0,
        experienceData.description || '',
        experienceData.achievements || '',
        experienceData.skills || '',
        experienceId,
        userId
    ];

    db.run(query, values, function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Experience not found' });
        }

        res.json({ success: true, message: 'Experience updated successfully' });
    });
});

// Delete professional experience
app.delete('/api/users/profile/experience/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const experienceId = req.params.id;

    const query = 'DELETE FROM professional_experience WHERE id = ? AND userId = ?';

    db.run(query, [experienceId, userId], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Experience not found' });
        }

        res.json({ success: true, message: 'Experience deleted successfully' });
    });
});

// Education CRUD

// Get education
app.get('/api/users/profile/education', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = 'SELECT * FROM education WHERE userId = ? ORDER BY end_date DESC';

    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: rows });
    });
});

// Add education
app.post('/api/users/profile/education', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const educationData = req.body;

    const query = `
        INSERT INTO education (
            userId, institution, degree, field_of_study, start_date, end_date,
            grade, activities, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        userId,
        educationData.institution,
        educationData.degree || '',
        educationData.field_of_study || '',
        educationData.start_date || null,
        educationData.end_date || null,
        educationData.grade || '',
        educationData.activities || '',
        educationData.description || ''
    ];

    db.run(query, values, function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Education added successfully', id: this.lastID });
    });
});

// Skills CRUD

// Get skills
app.get('/api/users/profile/skills', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = 'SELECT * FROM skills WHERE userId = ? ORDER BY endorsements DESC';

    db.all(query, [userId], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: rows });
    });
});

// Add skill
app.post('/api/users/profile/skills', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const skillData = req.body;

    const query = `
        INSERT INTO skills (
            userId, skill_name, skill_level, category
        ) VALUES (?, ?, ?, ?)
    `;

    const values = [
        userId,
        skillData.skill_name,
        skillData.skill_level || 'intermediate',
        skillData.category || ''
    ];

    db.run(query, values, function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Skill added successfully', id: this.lastID });
    });
});

// Connections API

// Get connections count
app.get('/api/connections/count', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = 'SELECT COUNT(*) as count FROM connections WHERE user_id = ? AND status = "accepted"';

    db.get(query, [userId], (err, row) => {
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

// Send connection request
app.post('/api/connections/request', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { userId: targetUserId } = req.body;

    const query = `
        INSERT INTO connections (user_id, connected_user_id, status, connection_type)
        VALUES (?, ?, 'pending', 'professional')
    `;

    db.run(query, [userId, targetUserId], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Connection request sent' });
    });
});

// Profile Views API

// Get profile views count
app.get('/api/profile-views/count', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = 'SELECT COUNT(*) as count FROM profile_views WHERE profile_user_id = ?';

    db.get(query, [userId], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, count: row.count });
    });
});

// Record profile view
app.post('/api/profile-views', authenticateToken, (req, res) => {
    const { profileUserId } = req.body;
    const viewerId = req.user.id;

    const query = `
        INSERT INTO profile_views (profile_user_id, viewer_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?)
    `;

    db.run(query, [profileUserId, viewerId, req.ip, req.get('User-Agent')], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Profile view recorded' });
    });
});

// Recent Activity API

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
            time: this.formatTimeAgo(row.createdAt)
        }));

        res.json({ success: true, data: activities });
    });
});

// Utility function to format time ago
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Professional Profile API running on port ${PORT}`);
    console.log(`📊 Database: SQLite (${dbPath})`);
    console.log(`🔐 Authentication: JWT enabled`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`✅ Professional Profile API initialized successfully`);
});

module.exports = app;
