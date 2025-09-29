const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3344;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'development'
  });
});

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName, company } = req.body;
  
  // Simple validation
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: { message: 'All required fields must be provided' }
    });
  }

  // Mock user creation
  const user = {
    id: 'user_' + Date.now(),
    email,
    firstName,
    lastName,
    company,
    role: 'user',
    createdAt: new Date().toISOString()
  };

  const token = 'token_' + Date.now();

  res.status(201).json({
    success: true,
    data: {
      user,
      token
    },
    message: 'User registered successfully'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { message: 'Email and password are required' }
    });
  }

  // Mock login
  const user = {
    id: 'user_' + Date.now(),
    email,
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    createdAt: new Date().toISOString()
  };

  const token = 'token_' + Date.now();

  res.json({
    success: true,
    data: {
      user,
      token
    },
    message: 'Login successful'
  });
});

// Legal routes
app.get('/api/legal/required', (req, res) => {
  const documents = [
    {
      id: 'terms',
      title: 'Terms of Service',
      content: '# Terms of Service\n\nBy using this service...',
      type: 'legal',
      status: 'active',
      isSigned: false,
      signedAt: null
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      content: '# Privacy Policy\n\nWe collect...',
      type: 'legal',
      status: 'active',
      isSigned: false,
      signedAt: null
    },
    {
      id: 'nda',
      title: 'Non-Disclosure Agreement',
      content: '# NDA\n\nConfidential information...',
      type: 'legal',
      status: 'active',
      isSigned: false,
      signedAt: null
    },
    {
      id: 'contributor',
      title: 'Contributor Agreement',
      content: '# Contributor Agreement\n\nBy contributing...',
      type: 'legal',
      status: 'active',
      isSigned: false,
      signedAt: null
    }
  ];

  res.json({
    success: true,
    data: documents,
    message: 'Required legal documents retrieved successfully'
  });
});

app.post('/api/legal/sign', (req, res) => {
  const { documentId, signatureData } = req.body;
  
  if (!documentId) {
    return res.status(400).json({
      success: false,
      error: { message: 'Document ID is required' }
    });
  }

  const signature = {
    id: 'signature_' + Date.now(),
    documentId,
    signatureData,
    signedAt: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    data: signature,
    message: 'Document signed successfully'
  });
});

// User routes
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  const user = {
    id,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    createdAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: user,
    message: 'User retrieved successfully'
  });
});

// Start server
app.listen(port, () => {
  console.log(`SmartStart Backend API running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});
