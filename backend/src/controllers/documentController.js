const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware: auth } = require('../middleware/auth');
const { uploadRateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../utils/logger');
const { encryptionServiceInstance } = require('../services/encryptionService');
const { signatureServiceInstance } = require('../services/signatureService');
const { timestampService } = require('../utils/timestamp');
const {
  Document, Signature, Timestamp, AuditTrail
} = require('../services/databaseService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../data/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_DOCUMENT_TYPES || 'pdf,doc,docx,txt,md').split(',');
    const fileExt = path.extname(file.originalname).toLowerCase().substring(1);

    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${fileExt} not allowed`), false);
    }
  }
});

/**
 * @route   GET /api/v1/documents
 * @desc    Get all documents for user
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  try {
    const {
      page = 1, limit = 10, status, type, search
    } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.user.id };

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const documents = await Document.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Signature,
          as: 'signatures',
          required: false
        },
        {
          model: Timestamp,
          as: 'timestamps',
          required: false
        }
      ]
    });

    // Log document access
    await AuditTrail.logDocumentAction(null, req.user.id, 'read', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      query: req.query
    });

    res.json({
      success: true,
      data: {
        documents: documents.rows,
        pagination: {
          total: documents.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(documents.count / limit)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get documents failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/v1/documents/:id
 * @desc    Get single document
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: Signature,
          as: 'signatures',
          required: false
        },
        {
          model: Timestamp,
          as: 'timestamps',
          required: false
        }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Log document access
    await AuditTrail.logDocumentAction(document.id, req.user.id, 'read', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: { document },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get document failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/documents
 * @desc    Create new document
 * @access  Private
 */
router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      content,
      isEncrypted,
      isPublic,
      expiresAt,
      tags,
      metadata
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Title is required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    const documentData = {
      title,
      description,
      type: type || 'other',
      userId: req.user.id,
      status: 'draft',
      version: '1.0',
      isEncrypted: isEncrypted === 'true',
      isPublic: isPublic === 'true',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      tags: tags ? JSON.parse(tags) : [],
      metadata: metadata ? JSON.parse(metadata) : {}
    };

    // Handle file upload
    if (req.file) {
      documentData.filePath = req.file.path;
      documentData.fileName = req.file.originalname;
      documentData.fileSize = req.file.size;
      documentData.mimeType = req.file.mimetype;

      // Read file content
      const fileContent = fs.readFileSync(req.file.path);
      documentData.content = fileContent.toString('base64');
    } else if (content) {
      documentData.content = content;
    }

    // Encrypt content if requested
    if (documentData.isEncrypted && documentData.content) {
      const encryptedData = await encryptionServiceInstance.encryptDocument(
        documentData.content,
        uuidv4(),
        req.user.id
      );

      documentData.content = encryptedData.encryptedContent;
      documentData.encryptionKey = encryptedData.documentKey;
    }

    // Create document
    const document = await Document.create(documentData);

    // Update content hash
    await document.updateContentHash();

    // Create timestamp
    const timestamp = await Timestamp.create({
      documentId: document.id,
      timestamp: new Date(),
      dataHash: document.contentHash,
      timestampHash: timestampService.createTimestamp(document.content, req.user.id).timestampHash,
      combinedHash: timestampService.createTimestamp(document.content, req.user.id).combinedHash,
      algorithm: 'SHA256',
      source: 'internal',
      isVerified: true,
      action: 'create',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Log document creation
    await AuditTrail.logDocumentAction(document.id, req.user.id, 'create', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      fileUploaded: !!req.file,
      encrypted: documentData.isEncrypted
    });

    res.status(201).json({
      success: true,
      data: { document },
      message: 'Document created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Create document failed:', error);
    throw error;
  }
}));

/**
 * @route   PUT /api/v1/documents/:id
 * @desc    Update document
 * @access  Private
 */
router.put('/:id', asyncHandler(async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if document can be modified
    if (!document.canBeModified()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Document cannot be modified',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    const {
      title,
      description,
      type,
      content,
      status,
      tags,
      metadata
    } = req.body;

    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (type) updateData.type = type;
    if (content) updateData.content = content;
    if (status) updateData.status = status;
    if (tags) updateData.tags = JSON.parse(tags);
    if (metadata) updateData.metadata = JSON.parse(metadata);

    // Update document
    await document.update(updateData);

    // Update content hash
    await document.updateContentHash();

    // Create timestamp
    const timestamp = await Timestamp.create({
      documentId: document.id,
      timestamp: new Date(),
      dataHash: document.contentHash,
      timestampHash: timestampService.createTimestamp(document.content, req.user.id).timestampHash,
      combinedHash: timestampService.createTimestamp(document.content, req.user.id).combinedHash,
      algorithm: 'SHA256',
      source: 'internal',
      isVerified: true,
      action: 'update',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Log document update
    await AuditTrail.logDocumentAction(document.id, req.user.id, 'update', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      changes: updateData
    });

    res.json({
      success: true,
      data: { document },
      message: 'Document updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Update document failed:', error);
    throw error;
  }
}));

/**
 * @route   DELETE /api/v1/documents/:id
 * @desc    Delete document
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Delete associated file if exists
    if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete document
    await document.destroy();

    // Log document deletion
    await AuditTrail.logDocumentAction(document.id, req.user.id, 'delete', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Document deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Delete document failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/documents/:id/sign
 * @desc    Sign document
 * @access  Private
 */
router.post('/:id/sign', asyncHandler(async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if document can be signed
    if (!document.canBeSigned()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Document cannot be signed',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    const { comments, signatureType = 'digital' } = req.body;

    // Create digital signature
    const signatureData = await signatureServiceInstance.createDocumentSignature(
      document.id,
      req.user.id,
      document.content,
      {
        comments,
        signatureType,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    // Create signature record
    const signature = await Signature.create({
      documentId: document.id,
      userId: req.user.id,
      signatureType,
      signatureData: signatureData.signature,
      signatureHash: signatureData.signatureHash,
      publicKey: signatureData.publicKey,
      algorithm: signatureData.algorithm,
      signedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      isVerified: true,
      comments,
      isTimestamped: true,
      timestampHash: signatureData.timestampHash,
      timestampedAt: new Date()
    });

    // Mark document as signed
    await document.markAsSigned(req.user.id, signatureData.signatureHash);

    // Create timestamp
    const timestamp = await Timestamp.create({
      documentId: document.id,
      timestamp: new Date(),
      dataHash: document.contentHash,
      timestampHash: signatureData.timestampHash,
      combinedHash: signatureData.timestampHash,
      algorithm: 'SHA256',
      source: 'internal',
      isVerified: true,
      action: 'sign',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Log document signing
    await AuditTrail.logDocumentAction(document.id, req.user.id, 'sign', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      signatureType,
      signatureHash: signatureData.signatureHash
    });

    res.json({
      success: true,
      data: {
        document,
        signature,
        timestamp
      },
      message: 'Document signed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Sign document failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/v1/documents/:id/verify
 * @desc    Verify document signature
 * @access  Private
 */
router.get('/:id/verify', asyncHandler(async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: Signature,
          as: 'signatures',
          required: false
        }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!document.isSigned) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Document is not signed',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify all signatures
    const verificationResults = [];

    for (const signature of document.signatures) {
      const verification = await signatureServiceInstance.verifyDocumentSignature(
        document.id,
        signature.userId,
        document.content,
        {
          signature: signature.signatureData,
          signatureHash: signature.signatureHash,
          publicKey: signature.publicKey,
          algorithm: signature.algorithm,
          timestamp: signature.signedAt,
          timestampHash: signature.timestampHash
        }
      );

      verificationResults.push({
        signatureId: signature.id,
        signerId: signature.userId,
        verification
      });
    }

    // Log document verification
    await AuditTrail.logDocumentAction(document.id, req.user.id, 'verify', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      signatureCount: document.signatures.length
    });

    res.json({
      success: true,
      data: {
        document,
        verificationResults,
        overallValid: verificationResults.every((r) => r.verification.valid)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Verify document failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/v1/documents/:id/download
 * @desc    Download document
 * @access  Private
 */
router.get('/:id/download', asyncHandler(async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Document not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    let { content } = document;

    // Decrypt content if encrypted
    if (document.isEncrypted && document.encryptionKey) {
      const decryptedContent = await encryptionServiceInstance.decryptDocument(
        {
          encrypted: content,
          iv: document.metadata?.iv,
          authTag: document.metadata?.authTag,
          algorithm: document.metadata?.algorithm
        },
        document.encryptionKey,
        req.user.id
      );
      content = decryptedContent;
    }

    // Set appropriate headers
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName || document.title}"`);

    // Send content
    if (document.filePath && fs.existsSync(document.filePath)) {
      res.sendFile(path.resolve(document.filePath));
    } else {
      res.send(Buffer.from(content, 'base64'));
    }

    // Log document download
    await AuditTrail.logDocumentAction(document.id, req.user.id, 'download', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    logger.error('Download document failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/documents/upload
 * @desc    Upload file
 * @access  Private
 */
// Temporarily commented out for debugging
/*
router.post('/upload', auth, uploadRateLimiter, upload.single('file'), asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No file uploaded',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate file hash
    const crypto = require('crypto');
    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

    // Create document record
    const document = await Document.create({
      title: req.file.originalname,
      content: req.file.buffer.toString('base64'),
      type: 'file',
      userId: req.user.id,
      status: 'active',
      version: '1.0',
      isEncrypted: false,
      metadata: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        hash: fileHash
      }
    });

    // Log file upload
    await AuditTrail.logDocumentAction(document.id, req.user.id, 'upload', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    res.json({
      success: true,
      data: {
        file: {
          id: document.id,
          name: req.file.originalname,
          size: req.file.size,
          hash: fileHash,
          uploadedAt: document.createdAt
        }
      },
      message: 'File uploaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('File upload failed:', error);
    throw error;
  }
}));
*/

module.exports = router;
