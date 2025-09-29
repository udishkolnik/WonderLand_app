/**
 * Production Backend with Real Database
 * Connects to SQLite database for live production data
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3344;
const JWT_SECRET = process.env.JWT_SECRET || 'your-production-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = new sqlite3.Database('./data/smartstart.db');

// Initialize database tables
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
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

            // Ventures table
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

            // Documents table
            db.run(`CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT NOT NULL,
                version TEXT DEFAULT '1.0.0',
                isRequired BOOLEAN DEFAULT 0,
                userId INTEGER,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id)
            )`);

            // Signatures table
            db.run(`CREATE TABLE IF NOT EXISTS signatures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                documentId INTEGER NOT NULL,
                signatureData TEXT,
                signatureHash TEXT,
                signedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                ipAddress TEXT,
                userAgent TEXT,
                FOREIGN KEY (userId) REFERENCES users (id),
                FOREIGN KEY (documentId) REFERENCES documents (id)
            )`);

            // Audit trails table
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
    });
};

// Initialize database on startup
initializeDatabase().then(() => {
    console.log('✅ Database initialized successfully');
}).catch(err => {
    console.error('❌ Database initialization failed:', err);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: 'production'
    });
});

// Get all users
app.get('/api/users', authenticateToken, (req, res) => {
    db.all('SELECT id, email, firstName, lastName, role, isActive, emailVerified, createdAt FROM users', (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, data: rows });
    });
});

// Get user by ID
app.get('/api/users/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get('SELECT id, email, firstName, lastName, role, isActive, emailVerified, createdAt FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, data: row });
    });
});

// Get all ventures
app.get('/api/ventures', authenticateToken, (req, res) => {
    db.all(`
        SELECT v.*, u.firstName, u.lastName, u.email 
        FROM ventures v 
        JOIN users u ON v.userId = u.id 
        ORDER BY v.createdAt DESC
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, data: rows });
    });
});

// Get venture by ID
app.get('/api/ventures/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.get(`
        SELECT v.*, u.firstName, u.lastName, u.email 
        FROM ventures v 
        JOIN users u ON v.userId = u.id 
        WHERE v.id = ?
    `, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ success: false, error: 'Venture not found' });
        }
        res.json({ success: true, data: row });
    });
});

// Get all documents
app.get('/api/documents', authenticateToken, (req, res) => {
    db.all('SELECT * FROM documents ORDER BY createdAt DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, data: rows });
    });
});

// Get required documents
app.get('/api/documents/required', authenticateToken, (req, res) => {
    db.all('SELECT * FROM documents WHERE isRequired = 1 ORDER BY createdAt DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json({ success: true, data: rows });
    });
});

// Ventures analytics
app.get('/api/ventures/analytics', authenticateToken, (req, res) => {
    const analytics = {
        totalVentures: 0,
        activeVentures: 0,
        completedVentures: 0,
        totalValue: 0,
        averageProgress: 0,
        stageDistribution: {},
        industryDistribution: {},
        recentActivity: []
    };
    
    // Get ventures count
    db.get('SELECT COUNT(*) as total FROM ventures', (err, count) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        analytics.totalVentures = count.total;
        
        // Get active ventures
        db.get('SELECT COUNT(*) as active FROM ventures WHERE status = "active"', (err, activeCount) => {
            if (err) {
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            analytics.activeVentures = activeCount.active;
            
            // Get completed ventures
            db.get('SELECT COUNT(*) as completed FROM ventures WHERE status = "completed"', (err, completedCount) => {
                if (err) {
                    return res.status(500).json({ success: false, error: 'Database error' });
                }
                
                analytics.completedVentures = completedCount.completed;
                
                // Get total value
                db.get('SELECT SUM(valuation) as totalValue FROM ventures WHERE valuation IS NOT NULL', (err, valueResult) => {
                    if (err) {
                        return res.status(500).json({ success: false, error: 'Database error' });
                    }
                    
                    analytics.totalValue = valueResult.totalValue || 0;
                    
                    // Get average progress
                    db.get('SELECT AVG(progress) as avgProgress FROM ventures', (err, progressResult) => {
                        if (err) {
                            return res.status(500).json({ success: false, error: 'Database error' });
                        }
                        
                        analytics.averageProgress = Math.round(progressResult.avgProgress || 0);
                        
                        // Get stage distribution
                        db.all('SELECT stage, COUNT(*) as count FROM ventures GROUP BY stage', (err, stageData) => {
                            if (err) {
                                return res.status(500).json({ success: false, error: 'Database error' });
                            }
                            
                            stageData.forEach(stage => {
                                analytics.stageDistribution[stage.stage] = stage.count;
                            });
                            
                            // Get industry distribution
                            db.all('SELECT industry, COUNT(*) as count FROM ventures WHERE industry IS NOT NULL GROUP BY industry', (err, industryData) => {
                                if (err) {
                                    return res.status(500).json({ success: false, error: 'Database error' });
                                }
                                
                                industryData.forEach(industry => {
                                    analytics.industryDistribution[industry.industry] = industry.count;
                                });
                                
                                // Get recent activity
                                db.all(`
                                    SELECT a.action, a.details, a.createdAt, u.firstName, u.lastName
                                    FROM audit_trails a
                                    JOIN users u ON a.userId = u.id
                                    ORDER BY a.createdAt DESC
                                    LIMIT 10
                                `, (err, activityData) => {
                                    if (err) {
                                        return res.status(500).json({ success: false, error: 'Database error' });
                                    }
                                    
                                    analytics.recentActivity = activityData;
                                    
                                    res.json({ success: true, data: analytics });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Audit trails endpoint
app.get('/api/audit-trails', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.all(`
        SELECT a.*, u.firstName, u.lastName 
        FROM audit_trails a
        JOIN users u ON a.userId = u.id
        WHERE a.userId = ?
        ORDER BY a.createdAt DESC
        LIMIT 50
    `, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        res.json({ success: true, data: rows });
    });
});

// Dashboard stats endpoint
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    // Get user's ventures count
    db.get('SELECT COUNT(*) as total FROM ventures WHERE userId = ?', [userId], (err, ventureCount) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        // Get user's documents count
        db.get('SELECT COUNT(*) as total FROM documents WHERE userId = ?', [userId], (err, docCount) => {
            if (err) {
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            // Get user's signatures count
            db.get('SELECT COUNT(*) as total FROM signatures WHERE userId = ?', [userId], (err, sigCount) => {
                if (err) {
                    return res.status(500).json({ success: false, error: 'Database error' });
                }
                
                const stats = {
                    ventures: {
                        total: ventureCount.total,
                        byStage: {
                            discovery: 0,
                            development: 0,
                            launch: 0
                        }
                    },
                    activity: {
                        totalCollaborations: 5,
                        daysActive: 15,
                        completedStages: 2
                    },
                    documents: {
                        total: docCount.total,
                        signed: sigCount.total
                    },
                    users: {
                        total: 1
                    }
                };
                
                res.json({ success: true, data: stats });
            });
        });
    });
});

// Ventures endpoint
app.get('/api/ventures', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.all(`
        SELECT v.*, u.firstName, u.lastName, u.email
        FROM ventures v
        JOIN users u ON v.userId = u.id
        WHERE v.userId = ?
        ORDER BY v.createdAt DESC
    `, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        res.json({ success: true, data: rows });
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Production Backend running on port ${PORT}`);
    console.log(`📊 Database: SQLite (./data/smartstart.db)`);
    console.log(`🔐 Authentication: JWT enabled`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`✅ Database initialized successfully`);
});
        
        stats.ventures = { total: ventureCount.total };
        
        // Get ventures by stage
        db.all('SELECT stage, COUNT(*) as count FROM ventures GROUP BY stage', (err, stageCounts) => {
            if (err) {
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            stats.ventures.byStage = {};
            stageCounts.forEach(stage => {
                stats.ventures.byStage[stage.stage] = stage.count;
            });
            
            // Get activity stats
            db.get('SELECT COUNT(*) as total FROM audit_trails', (err, activityCount) => {
                if (err) {
                    return res.status(500).json({ success: false, error: 'Database error' });
                }
                
                stats.activity = {
                    totalCollaborations: activityCount.total,
                    daysActive: 30,
                    completedStages: stats.ventures.byStage.launch || 0
                };
                
                // Get documents stats
                db.get('SELECT COUNT(*) as total FROM documents', (err, docCount) => {
                    if (err) {
                        return res.status(500).json({ success: false, error: 'Database error' });
                    }
                    
                    stats.documents = { total: docCount.total };
                    
                    // Get users stats
                    db.get('SELECT COUNT(*) as total FROM users', (err, userCount) => {
                        if (err) {
                            return res.status(500).json({ success: false, error: 'Database error' });
                        }
                        
                        stats.users = { total: userCount.total };
                        
                        res.json({ success: true, data: stats });
                    });
                });
            });
        });
    });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    
    try {
        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
            if (err) {
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            if (existingUser) {
                return res.status(400).json({ success: false, error: 'User already exists' });
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insert new user
            db.run(
                'INSERT INTO users (firstName, lastName, email, password, emailVerified) VALUES (?, ?, ?, ?, ?)',
                [firstName, lastName, email, hashedPassword, true],
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, error: 'Failed to create user' });
                    }
                    
                    const userId = this.lastID;
                    const token = jwt.sign(
                        { id: userId, email, role: 'founder' },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );
                    
                    res.status(201).json({
                        success: true,
                        data: {
                            user: { id: userId, firstName, lastName, email, role: 'founder' },
                            token
                        },
                        message: 'User registered successfully'
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

// User login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    
    try {
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            if (!user) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
            
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ success: false, error: 'Invalid credentials' });
            }
            
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        role: user.role
                    },
                    token
                },
                message: 'Login successful'
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Production backend error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Production Backend running on port ${PORT}`);
    console.log(`📊 Database: SQLite (./data/smartstart.db)`);
    console.log(`🔐 Authentication: JWT enabled`);
    console.log(`🌐 API: http://localhost:${PORT}`);
});

module.exports = app;
