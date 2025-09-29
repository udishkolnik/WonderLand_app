# SmartStart Backend - Document Management System

## 🚀 Overview

SmartStart Backend is a comprehensive document management system with digital signatures, timestamps, and encryption capabilities. Built for AliceSolutionsGroup's SmartStart platform, it provides secure document handling, user authentication, and audit trails.

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Role-based access control (User, Admin, Moderator)
- Password hashing with bcrypt
- Rate limiting for security
- Account lockout protection

### 📄 Document Management
- Upload and store documents
- Document encryption/decryption
- Version control and history
- Document metadata and tags
- File type validation
- Document sharing and permissions

### ✍️ Digital Signatures
- Digital signature creation and verification
- Signature chains and verification
- Timestamp integration
- Signature revocation
- Notarization support
- Multiple signature types

### ⏰ Timestamping
- Internal timestamp generation
- Timestamp verification
- Timestamp chains
- Audit trail integration
- Notarization timestamps

### 🔒 Encryption
- AES-256-GCM encryption
- Document-specific encryption keys
- Metadata encryption
- Key rotation support
- Secure random string generation

### 📊 Audit & Compliance
- Comprehensive audit trails
- Security event logging
- User activity tracking
- Document access logging
- Compliance reporting

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: SQLite (development), PostgreSQL (production)
- **ORM**: Sequelize
- **Authentication**: JWT
- **Encryption**: Node.js crypto module
- **File Upload**: Multer
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

### Project Structure
```
backend/
├── src/
│   ├── controllers/          # API route handlers
│   │   ├── authController.js
│   │   ├── documentController.js
│   │   ├── signatureController.js
│   │   └── userController.js
│   ├── middleware/           # Express middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── models/              # Database models
│   │   ├── User.js
│   │   ├── Document.js
│   │   ├── Signature.js
│   │   ├── Timestamp.js
│   │   └── AuditTrail.js
│   ├── services/            # Business logic services
│   │   ├── databaseService.js
│   │   ├── encryptionService.js
│   │   └── signatureService.js
│   ├── utils/               # Utility functions
│   │   ├── encryption.js
│   │   ├── logger.js
│   │   └── timestamp.js
│   └── server.js            # Main server file
├── data/                    # Data storage
│   ├── documents/           # Document files
│   ├── uploads/             # Uploaded files
│   ├── encryption/          # Encryption keys
│   └── signatures/          # Signature data
├── logs/                    # Log files
├── tests/                   # Test files
├── docs/                    # Documentation
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16.0.0 or higher
- npm 8.0.0 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SmartStart/webapp/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp config.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=3345
   JWT_SECRET=your_super_secret_jwt_key_here
   ENCRYPTION_KEY=your_32_character_encryption_key_here
   # ... other configuration
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### Default Admin User
- **Email**: admin@alicesolutionsgroup.com
- **Password**: admin123
- **Role**: Admin

## 📚 API Documentation

### Base URL
```
http://localhost:3345/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "company": "Example Corp"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <jwt_token>
```

### Document Endpoints

#### Get All Documents
```http
GET /documents?page=1&limit=10&status=draft&type=agreement
Authorization: Bearer <jwt_token>
```

#### Create Document
```http
POST /documents
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "title": "Sample Document",
  "description": "Document description",
  "type": "agreement",
  "isEncrypted": "true",
  "file": <file_upload>
}
```

#### Sign Document
```http
POST /documents/:id/sign
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "comments": "I agree to the terms",
  "signatureType": "digital"
}
```

#### Verify Document
```http
GET /documents/:id/verify
Authorization: Bearer <jwt_token>
```

### Signature Endpoints

#### Get All Signatures
```http
GET /signatures?page=1&limit=10&verified=true
Authorization: Bearer <jwt_token>
```

#### Create Signature
```http
POST /signatures
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "documentId": "uuid",
  "signatureType": "digital",
  "comments": "Signature comments"
}
```

#### Verify Signature
```http
POST /signatures/:id/verify
Authorization: Bearer <jwt_token>
```

#### Notarize Document
```http
POST /signatures/notarize
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "documentId": "uuid"
}
```

### User Endpoints

#### Get All Users (Admin)
```http
GET /users?page=1&limit=10&role=user
Authorization: Bearer <jwt_token>
```

#### Get User Profile
```http
GET /users/:id
Authorization: Bearer <jwt_token>
```

#### Update User Profile
```http
PUT /users/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "firstName": "Updated Name",
  "profile": {
    "company": "New Company"
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3345` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration | `24h` |
| `ENCRYPTION_KEY` | Encryption key | Required |
| `DB_TYPE` | Database type | `sqlite` |
| `DB_PATH` | Database path | `./data/smartstart.db` |
| `UPLOAD_MAX_SIZE` | Max upload size | `50MB` |
| `RATE_LIMIT_MAX` | Rate limit requests | `100` |
| `LOG_LEVEL` | Logging level | `info` |

### Security Configuration

#### Rate Limiting
- **General**: 100 requests per 15 minutes
- **Auth**: 5 requests per 15 minutes
- **Upload**: 10 requests per hour
- **Signature**: 20 requests per hour

#### Encryption
- **Algorithm**: AES-256-GCM
- **Key Length**: 256 bits
- **IV Length**: 16 bytes
- **Hash Algorithm**: SHA-256

#### JWT Configuration
- **Algorithm**: HS256
- **Expiration**: 24 hours
- **Refresh Token**: 7 days

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testNamePattern="Document"
```

### Test Coverage
```bash
npm run test:coverage
```

## 📊 Monitoring & Logging

### Health Check
```http
GET /health
```

### Logs
- **Location**: `./logs/`
- **Files**: `smartstart.log`, `error.log`
- **Levels**: error, warn, info, debug

### Metrics
- Request/response times
- Error rates
- User activity
- Document operations
- Signature verifications

## 🔒 Security Features

### Data Protection
- End-to-end encryption
- Secure key management
- Data anonymization
- Access controls

### Authentication Security
- Password hashing (bcrypt)
- JWT token validation
- Account lockout protection
- Rate limiting

### Audit & Compliance
- Comprehensive audit trails
- Security event logging
- User activity tracking
- Compliance reporting

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   PORT=3345
   DB_TYPE=postgresql
   DB_HOST=your-db-host
   DB_NAME=smartstart_prod
   # ... other production configs
   ```

2. **Database Setup**
   ```bash
   # Create production database
   createdb smartstart_prod
   
   # Run migrations
   npm run migrate
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3345
CMD ["npm", "start"]
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3345
JWT_SECRET=your_production_jwt_secret
ENCRYPTION_KEY=your_production_encryption_key
DB_TYPE=postgresql
DB_HOST=your-db-host
DB_NAME=smartstart_prod
DB_USER=smartstart_user
DB_PASSWORD=your_db_password
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```
3. **Make changes and test**
   ```bash
   npm test
   npm run lint
   ```
4. **Commit changes**
   ```bash
   git commit -m "Add new feature"
   ```
5. **Push to branch**
   ```bash
   git push origin feature/new-feature
   ```
6. **Create Pull Request**

### Code Style
- ESLint configuration
- Prettier formatting
- JSDoc documentation
- Test coverage requirements

## 📞 Support

### Contact Information
- **Company**: AliceSolutionsGroup
- **Founder**: Udi Shkolnik
- **Email**: info@alicesolutionsgroup.com
- **Support**: support@alicesolutionsgroup.com

### Documentation
- **API Docs**: `/api/v1/docs`
- **Health Check**: `/health`
- **Logs**: `./logs/`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔄 Version History

### v1.0.0 (Current)
- Initial release
- Document management system
- Digital signatures
- Timestamping
- Encryption
- User authentication
- Audit trails

---

**SmartStart Backend - Secure Document Management with Digital Signatures**

*Built with ❤️ by AliceSolutionsGroup*
