const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3344;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API endpoints
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      users: 0,
      documents: 0,
      ventures: 0,
      signatures: 0
    },
    message: 'Stats retrieved successfully',
    timestamp: new Date().toISOString()
  });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SmartStart Backend running on port ${PORT}`);
  console.log(`📱 Health: http://localhost:${PORT}/api/health`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`🎯 AliceSolutionsGroup - SmartStart Platform`);
  console.log(`✨ Ready to serve the frontend!`);
});

module.exports = app;
