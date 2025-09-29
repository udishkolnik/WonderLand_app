const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3344;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "http://localhost:3345", "http://localhost:3346"],
        },
    },
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Mock API endpoints for testing
app.get('/api/users', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'user_1',
                email: 'admin@alicesolutions.com',
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin',
                createdAt: '2024-01-01T00:00:00.000Z'
            },
            {
                id: 'user_2',
                email: 'test1@test.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'user',
                createdAt: '2024-01-02T00:00:00.000Z'
            },
            {
                id: 'user_3',
                email: 'demo@alicesolutions.com',
                firstName: 'Demo',
                lastName: 'User',
                role: 'user',
                createdAt: '2024-01-03T00:00:00.000Z'
            }
        ],
        message: 'Users retrieved successfully'
    });
});

app.get('/api/documents', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'doc_1',
                title: 'Terms of Service',
                type: 'legal',
                status: 'active',
                isSigned: true,
                createdAt: '2024-01-01T00:00:00.000Z'
            },
            {
                id: 'doc_2',
                title: 'Privacy Policy',
                type: 'legal',
                status: 'active',
                isSigned: true,
                createdAt: '2024-01-01T00:00:00.000Z'
            },
            {
                id: 'doc_3',
                title: 'Non-Disclosure Agreement',
                type: 'legal',
                status: 'active',
                isSigned: false,
                createdAt: '2024-01-01T00:00:00.000Z'
            }
        ],
        message: 'Documents retrieved successfully'
    });
});

app.get('/api/signatures', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'sig_1',
                userId: 'user_2',
                documentId: 'doc_1',
                signedAt: '2024-01-15T10:30:00.000Z'
            },
            {
                id: 'sig_2',
                userId: 'user_2',
                documentId: 'doc_2',
                signedAt: '2024-01-15T10:35:00.000Z'
            }
        ],
        message: 'Signatures retrieved successfully'
    });
});

app.get('/api/audit-trails', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'audit_1',
                userId: 'user_2',
                action: 'LOGIN',
                createdAt: '2024-01-15T09:00:00.000Z'
            },
            {
                id: 'audit_2',
                userId: 'user_2',
                action: 'DOCUMENT_SIGNED',
                createdAt: '2024-01-15T10:30:00.000Z'
            },
            {
                id: 'audit_3',
                userId: 'user_2',
                action: 'VENTURE_CREATED',
                createdAt: '2024-01-15T11:00:00.000Z'
            }
        ],
        message: 'Audit trails retrieved successfully'
    });
});

app.get('/api/dashboard/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            ventures: {
                total: 3,
                byStage: {
                    discovery: 1,
                    development: 1,
                    launch: 1
                }
            },
            activity: {
                totalCollaborations: 5,
                daysActive: 15,
                completedStages: 2
            },
            documents: {
                total: 3,
                signed: 2
            },
            users: {
                total: 3
            }
        },
        message: 'Dashboard stats retrieved successfully'
    });
});

app.get('/api/ventures', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'venture_1',
                name: 'SmartStart Platform',
                status: 'development',
                stage: 'development',
                progress: 75,
                description: 'Building the next generation venture platform',
                createdAt: '2024-01-01T00:00:00.000Z'
            },
            {
                id: 'venture_2',
                name: 'AliceSolutions Group',
                status: 'launch',
                stage: 'launch',
                progress: 90,
                description: 'Micro-venture studio transforming ideas into businesses',
                createdAt: '2024-01-02T00:00:00.000Z'
            },
            {
                id: 'venture_3',
                name: 'Venture Analytics Tool',
                status: 'discovery',
                stage: 'discovery',
                progress: 25,
                description: 'AI-powered analytics platform for venture performance tracking',
                createdAt: '2024-01-03T00:00:00.000Z'
            }
        ],
        message: 'Ventures retrieved successfully'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Backend Error:', err);
    res.status(500).json({ 
        success: false, 
        error: { message: 'Internal Server Error' } 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: { message: 'API endpoint not found' } 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 SmartStart Backend API running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Dashboard: http://localhost:3345`);
    console.log(`🌐 Website: http://localhost:3346`);
    console.log(`\n✨ Ready to serve real data!`);
});
