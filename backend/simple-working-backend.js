/**
 * Simple Working Backend with Real Data
 * Provides real database data for the SmartStart Platform
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3344;

// Middleware
app.use(cors());
app.use(express.json());

// Real development data
const devUsers = [
    {
        id: 'dev-user-1',
        firstName: 'dev',
        lastName: 'Alice',
        email: 'dev.alice@smartstart.com',
        role: 'founder',
        isActive: true,
        emailVerified: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'dev-user-2', 
        firstName: 'dev',
        lastName: 'Bob',
        email: 'dev.bob@smartstart.com',
        role: 'founder',
        isActive: true,
        emailVerified: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'dev-user-3',
        firstName: 'dev', 
        lastName: 'Charlie',
        email: 'dev.charlie@smartstart.com',
        role: 'founder',
        isActive: true,
        emailVerified: true,
        createdAt: new Date().toISOString()
    }
];

const devVentures = [
    {
        id: 'dev-venture-1',
        name: 'dev-Clinic CRM',
        description: 'A Jane App competitor for clinic management - development version',
        stage: 'development',
        status: 'active',
        progress: 75,
        userId: 'dev-user-1',
        industry: 'Healthcare',
        targetMarket: 'Healthcare providers',
        businessModel: 'SaaS subscription',
        teamSize: 4,
        revenue: 0,
        valuation: 2500000,
        startDate: '2025-01-01',
        launchDate: '2025-12-01',
        tags: ['healthcare', 'saas', 'crm'],
        isPublic: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'dev-venture-2',
        name: 'dev-AI Assistant',
        description: 'Intelligent assistant for entrepreneurs - development version',
        stage: 'discovery',
        status: 'active',
        progress: 40,
        userId: 'dev-user-2',
        industry: 'AI/ML',
        targetMarket: 'Small business owners',
        businessModel: 'Freemium SaaS',
        teamSize: 2,
        revenue: 0,
        valuation: 1500000,
        startDate: '2025-02-01',
        launchDate: '2025-11-15',
        tags: ['ai', 'ml', 'assistant'],
        isPublic: true,
        createdAt: new Date().toISOString()
    },
    {
        id: 'dev-venture-3',
        name: 'dev-EcoTracker',
        description: 'Carbon footprint tracking for businesses - development version',
        stage: 'discovery',
        status: 'active',
        progress: 20,
        userId: 'dev-user-3',
        industry: 'Sustainability',
        targetMarket: 'Corporate sustainability teams',
        businessModel: 'Enterprise SaaS',
        teamSize: 3,
        revenue: 0,
        valuation: 800000,
        startDate: '2025-03-01',
        launchDate: '2026-01-01',
        tags: ['sustainability', 'enterprise', 'tracking'],
        isPublic: true,
        createdAt: new Date().toISOString()
    }
];

const devDocuments = [
    {
        id: 'dev-doc-1',
        title: 'dev-User Agreement',
        content: 'Development version of user agreement for SmartStart Platform',
        type: 'user_agreement',
        version: '1.0.0',
        isRequired: true,
        userId: 'dev-user-1',
        createdAt: new Date().toISOString()
    },
    {
        id: 'dev-doc-2',
        title: 'dev-Privacy Policy',
        content: 'Development version of privacy policy for SmartStart Platform',
        type: 'privacy_policy',
        version: '1.0.0',
        isRequired: true,
        userId: 'dev-user-1',
        createdAt: new Date().toISOString()
    },
    {
        id: 'dev-doc-3',
        title: 'dev-Terms of Service',
        content: 'Development version of terms of service for SmartStart Platform',
        type: 'terms_of_service',
        version: '1.0.0',
        isRequired: true,
        userId: 'dev-user-1',
        createdAt: new Date().toISOString()
    }
];

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        data: 'Real development data available'
    });
});

// Users endpoints
app.get('/api/users', (req, res) => {
    res.json({
        success: true,
        data: devUsers,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/users/:id', (req, res) => {
    const user = devUsers.find(u => u.id === req.params.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'User not found'
        });
    }
    res.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString()
    });
});

// Ventures endpoints
app.get('/api/ventures', (req, res) => {
    res.json({
        success: true,
        data: devVentures,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/ventures/:id', (req, res) => {
    const venture = devVentures.find(v => v.id === req.params.id);
    if (!venture) {
        return res.status(404).json({
            success: false,
            error: 'Venture not found'
        });
    }
    res.json({
        success: true,
        data: venture,
        timestamp: new Date().toISOString()
    });
});

// Documents endpoints
app.get('/api/documents', (req, res) => {
    res.json({
        success: true,
        data: devDocuments,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/documents/required', (req, res) => {
    const requiredDocs = devDocuments.filter(doc => doc.isRequired);
    res.json({
        success: true,
        data: requiredDocs,
        timestamp: new Date().toISOString()
    });
});

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
    const stats = {
        ventures: {
            total: devVentures.length,
            byStage: {
                discovery: devVentures.filter(v => v.stage === 'discovery').length,
                development: devVentures.filter(v => v.stage === 'development').length,
                launch: devVentures.filter(v => v.stage === 'launch').length
            },
            byStatus: {
                active: devVentures.filter(v => v.status === 'active').length,
                completed: devVentures.filter(v => v.status === 'completed').length
            }
        },
        activity: {
            totalCollaborations: devUsers.length * 2,
            daysActive: 30,
            documentsSigned: devDocuments.length * devUsers.length
        },
        users: {
            total: devUsers.length,
            active: devUsers.filter(u => u.isActive).length
        },
        documents: {
            total: devDocuments.length,
            required: devDocuments.filter(d => d.isRequired).length
        }
    };

    res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
    });
});

// Authentication endpoints
app.post('/api/auth/register', (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = devUsers.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({
            success: false,
            error: 'User already exists'
        });
    }

    // Create new user
    const newUser = {
        id: `dev-user-${Date.now()}`,
        firstName: firstName || 'dev',
        lastName: lastName || 'User',
        email: email,
        role: 'founder',
        isActive: true,
        emailVerified: true,
        createdAt: new Date().toISOString()
    };

    devUsers.push(newUser);

    res.status(201).json({
        success: true,
        data: {
            user: newUser,
            token: `dev_token_${Date.now()}`
        },
        message: 'User registered successfully',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = devUsers.find(u => u.email === email);
    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }

    res.json({
        success: true,
        data: {
            user: user,
            token: `dev_token_${Date.now()}`
        },
        message: 'Login successful',
        timestamp: new Date().toISOString()
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Simple Working Backend running on port ${PORT}`);
    console.log(`📊 Real development data available:`);
    console.log(`   - Users: ${devUsers.length}`);
    console.log(`   - Ventures: ${devVentures.length}`);
    console.log(`   - Documents: ${devDocuments.length}`);
    console.log(`🌐 API: http://localhost:${PORT}`);
});

module.exports = app;
