const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.APP_PORT || 3345;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://sql.js.org"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://sql.js.org", "http://localhost:3344", "http://localhost:3345"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'", "blob:"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? false : true,
    credentials: true
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static(path.join(__dirname, 'app'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
        }
    }
}));

// API routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/stats', (req, res) => {
    res.json({
        totalUsers: 0, // TODO: Implement database stats
        totalVentures: 0,
        activeJourneys: 0,
        lastUpdated: new Date().toISOString()
    });
});

// Database API endpoints
app.get('/api/database/export', (req, res) => {
    // TODO: Implement database export
    res.json({ message: 'Database export endpoint - to be implemented' });
});

app.post('/api/database/import', (req, res) => {
    // TODO: Implement database import
    res.json({ message: 'Database import endpoint - to be implemented' });
});

// User API endpoints
app.get('/api/users/:id', (req, res) => {
    // TODO: Implement user retrieval
    res.json({ message: 'User endpoint - to be implemented' });
});

app.post('/api/users', (req, res) => {
    // TODO: Implement user creation
    res.json({ message: 'User creation endpoint - to be implemented' });
});

// Venture API endpoints
app.get('/api/ventures', (req, res) => {
    // TODO: Implement ventures retrieval
    res.json({ message: 'Ventures endpoint - to be implemented' });
});

app.post('/api/ventures', (req, res) => {
    // TODO: Implement venture creation
    res.json({ message: 'Venture creation endpoint - to be implemented' });
});

// Journey API endpoints
app.get('/api/journeys/:userId', (req, res) => {
    // TODO: Implement journey retrieval
    res.json({ message: 'Journey endpoint - to be implemented' });
});

app.post('/api/journeys', (req, res) => {
    // TODO: Implement journey creation
    res.json({ message: 'Journey creation endpoint - to be implemented' });
});

// Catch-all handler for SPA routing
app.get('*', (req, res) => {
    // Check if the request is for an API endpoint
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Serve the main HTML file for all other routes
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`📱 SmartStart App Server running on port ${PORT}`);
    console.log(`🔐 Private App: http://localhost:${PORT}`);
    console.log(`🌐 Public Website: http://localhost:3346`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📈 Stats: http://localhost:${PORT}/api/stats`);
    console.log(`\n🎯 AliceSolutionsGroup - SmartStart Platform`);
    console.log(`👨‍💻 Founder: Udi Shkolnik`);
    console.log(`📧 Contact: info@alicesolutionsgroup.com`);
    console.log(`\n✨ Ready to transform ideas into profitable SaaS businesses!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
