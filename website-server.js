const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.WEBSITE_PORT || 3346;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://js.zohostatic.com", "https://*.zohostatic.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://js.zohostatic.com", "https://billing.zohocloud.ca", "https://*.zohostatic.com", "https://*.zohocloud.ca"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:3344", "http://localhost:3345", "https://billing.zohocloud.ca", "https://*.zohocloud.ca", "https://*.zohostatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https://billing.zohocloud.ca", "https://js.zohostatic.com", "https://*.zohostatic.com"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'", "blob:"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3345', 'http://localhost:3346', 'http://localhost:3344'],
    credentials: true
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for public website
app.use(express.static(path.join(__dirname, 'website'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
        }
        // Fix favicon SSL issues
        if (path.endsWith('.ico')) {
            res.setHeader('Content-Type', 'image/x-icon');
        }
    }
}));

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
    res.setHeader('Content-Type', 'image/x-icon');
    res.sendFile(path.join(__dirname, 'website', 'favicon.ico'));
});

// API proxy to backend
app.use('/api', (req, res, next) => {
    // Proxy API requests to backend server
    const backendUrl = `http://localhost:3344${req.originalUrl}`;
    console.log(`Proxying API request: ${req.method} ${req.originalUrl} -> ${backendUrl}`);
    next();
});

// Serve website pages
app.get('*', (req, res) => {
    // Check if it's an API request
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found on website server' });
    }
    
    // Try to serve the specific file first
    const filePath = path.join(__dirname, 'website', req.path);
    const indexPath = path.join(__dirname, 'website', 'index.html');
    
    // Check if the requested file exists
    if (require('fs').existsSync(filePath) && require('fs').statSync(filePath).isFile()) {
        res.sendFile(filePath);
    } else {
        // Fallback to index.html for SPA routing
        res.sendFile(indexPath);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Website server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌐 Public Website Server running on port ${PORT}`);
    console.log(`📱 Website: http://localhost:${PORT}`);
    console.log(`🔗 API Backend: http://localhost:3344`);
    console.log(`📊 App Server: http://localhost:3345`);
});

module.exports = app;
