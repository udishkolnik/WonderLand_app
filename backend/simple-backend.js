const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3344;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mock data endpoints
app.get('/api/users', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'user_1', email: 'admin@alicesolutions.com', firstName: 'Admin', lastName: 'User', role: 'admin' },
            { id: 'user_2', email: 'test1@test.com', firstName: 'Test', lastName: 'User', role: 'user' },
            { id: 'user_3', email: 'demo@alicesolutions.com', firstName: 'Demo', lastName: 'User', role: 'user' }
        ]
    });
});

app.get('/api/documents', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'doc_1', title: 'Terms of Service', type: 'legal', isSigned: true },
            { id: 'doc_2', title: 'Privacy Policy', type: 'legal', isSigned: true },
            { id: 'doc_3', title: 'NDA', type: 'legal', isSigned: false }
        ]
    });
});

app.get('/api/signatures', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'sig_1', userId: 'user_2', documentId: 'doc_1', signedAt: '2024-01-15T10:30:00.000Z' },
            { id: 'sig_2', userId: 'user_2', documentId: 'doc_2', signedAt: '2024-01-15T10:35:00.000Z' }
        ]
    });
});

app.get('/api/audit-trails', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'audit_1', userId: 'user_2', action: 'LOGIN', createdAt: '2024-01-15T09:00:00.000Z' },
            { id: 'audit_2', userId: 'user_2', action: 'DOCUMENT_SIGNED', createdAt: '2024-01-15T10:30:00.000Z' },
            { id: 'audit_3', userId: 'user_2', action: 'VENTURE_CREATED', createdAt: '2024-01-15T11:00:00.000Z' }
        ]
    });
});

app.get('/api/dashboard/stats', (req, res) => {
    res.json({
        success: true,
        data: {
            ventures: { total: 3, byStage: { discovery: 1, development: 1, launch: 1 } },
            activity: { totalCollaborations: 5, daysActive: 15, completedStages: 2 },
            documents: { total: 3, signed: 2 },
            users: { total: 3 }
        }
    });
});

app.get('/api/ventures', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'venture_1', name: 'SmartStart Platform', status: 'development', stage: 'development', progress: 75 },
            { id: 'venture_2', name: 'AliceSolutions Group', status: 'launch', stage: 'launch', progress: 90 },
            { id: 'venture_3', name: 'Venture Analytics Tool', status: 'discovery', stage: 'discovery', progress: 25 }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend API running on port ${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
});
