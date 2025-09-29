const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { signatureRateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../utils/logger');
const { signatureServiceInstance } = require('../services/signatureService');
const {
  Document, Signature, Timestamp, AuditTrail
} = require('../services/databaseService');

const router = express.Router();

/**
 * @route   GET /api/v1/signatures
 * @desc    Get all signatures for user
 * @access  Private
 */
router.get('/', asyncHandler(async (req, res) => {
  try {
    const {
      page = 1, limit = 10, documentId, verified, revoked
    } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId: req.user.id };

    if (documentId) {
      whereClause.documentId = documentId;
    }

    if (verified !== undefined) {
      whereClause.isVerified = verified === 'true';
    }

    if (revoked !== undefined) {
      whereClause.isRevoked = revoked === 'true';
    }

    const signatures = await Signature.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['signedAt', 'DESC']],
      include: [
        {
          model: Document,
          as: 'document',
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: {
        signatures: signatures.rows,
        pagination: {
          total: signatures.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(signatures.count / limit)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get signatures failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/v1/signatures/:id
 * @desc    Get single signature
 * @access  Private
 */
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const signature = await Signature.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: Document,
          as: 'document',
          required: false
        }
      ]
    });

    if (!signature) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Signature not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: { signature },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get signature failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/signatures
 * @desc    Create new signature
 * @access  Private
 */
router.post('/', signatureRateLimiter, asyncHandler(async (req, res) => {
  try {
    const {
      documentId,
      signatureType = 'digital',
      signatureData,
      comments,
      metadata
    } = req.body;

    // Validate required fields
    if (!documentId || !signatureData) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Document ID and signature data are required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find document
    const document = await Document.findOne({
      where: {
        id: documentId,
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

    // Create digital signature
    const signatureResult = await signatureServiceInstance.createDocumentSignature(
      documentId,
      req.user.id,
      document.content,
      {
        signatureType,
        comments,
        metadata,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    // Create signature record
    const signature = await Signature.create({
      documentId,
      userId: req.user.id,
      signatureType,
      signatureData: signatureResult.signature,
      signatureHash: signatureResult.signatureHash,
      publicKey: signatureResult.publicKey,
      algorithm: signatureResult.algorithm,
      signedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      isVerified: true,
      comments,
      isTimestamped: true,
      timestampHash: signatureResult.timestampHash,
      timestampedAt: new Date(),
      metadata: metadata || {}
    });

    // Mark document as signed
    await document.markAsSigned(req.user.id, signatureResult.signatureHash);

    // Create timestamp
    const timestamp = await Timestamp.create({
      documentId: document.id,
      timestamp: new Date(),
      dataHash: document.contentHash,
      timestampHash: signatureResult.timestampHash,
      combinedHash: signatureResult.timestampHash,
      algorithm: 'SHA256',
      source: 'internal',
      isVerified: true,
      action: 'sign',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Log signature creation
    await AuditTrail.logSignatureAction(document.id, req.user.id, 'create', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      signatureType,
      signatureHash: signatureResult.signatureHash
    });

    res.status(201).json({
      success: true,
      data: {
        signature,
        timestamp
      },
      message: 'Signature created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Create signature failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/signatures/:id/verify
 * @desc    Verify signature
 * @access  Private
 */
router.post('/:id/verify', asyncHandler(async (req, res) => {
  try {
    const signature = await Signature.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: Document,
          as: 'document',
          required: false
        }
      ]
    });

    if (!signature) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Signature not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!signature.document) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Associated document not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify signature
    const verification = await signatureServiceInstance.verifyDocumentSignature(
      signature.document.id,
      signature.userId,
      signature.document.content,
      {
        signature: signature.signatureData,
        signatureHash: signature.signatureHash,
        publicKey: signature.publicKey,
        algorithm: signature.algorithm,
        timestamp: signature.signedAt,
        timestampHash: signature.timestampHash
      }
    );

    // Update signature verification status
    await signature.update({
      isVerified: verification.valid,
      verifiedAt: new Date(),
      verificationMethod: 'hash_verification',
      verificationResult: verification
    });

    // Log signature verification
    await AuditTrail.logSignatureAction(signature.document.id, req.user.id, 'verify', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      signatureId: signature.id,
      verificationResult: verification.valid
    });

    res.json({
      success: true,
      data: {
        signature,
        verification
      },
      message: 'Signature verification completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Verify signature failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/signatures/:id/revoke
 * @desc    Revoke signature
 * @access  Private
 */
router.post('/:id/revoke', asyncHandler(async (req, res) => {
  try {
    const { reason } = req.body;

    const signature = await Signature.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: [
        {
          model: Document,
          as: 'document',
          required: false
        }
      ]
    });

    if (!signature) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Signature not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (signature.isRevoked) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Signature is already revoked',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Revoke signature
    await signature.revoke(reason || 'User requested revocation');

    // Log signature revocation
    await AuditTrail.logSignatureAction(signature.document?.id, req.user.id, 'revoke', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      signatureId: signature.id,
      reason
    });

    res.json({
      success: true,
      data: { signature },
      message: 'Signature revoked successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Revoke signature failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/v1/signatures/:id/chain
 * @desc    Get signature chain
 * @access  Private
 */
router.get('/:id/chain', asyncHandler(async (req, res) => {
  try {
    const signature = await Signature.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!signature) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Signature not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get signature chain
    const signatureChain = await signature.getSignatureChain();

    res.json({
      success: true,
      data: {
        signatureChain,
        chainLength: signatureChain.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get signature chain failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/signatures/chain/verify
 * @desc    Verify signature chain
 * @access  Private
 */
router.post('/chain/verify', asyncHandler(async (req, res) => {
  try {
    const { documentId, signatureChain } = req.body;

    if (!documentId || !signatureChain || !Array.isArray(signatureChain)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Document ID and signature chain are required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find document
    const document = await Document.findOne({
      where: {
        id: documentId,
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

    // Verify signature chain
    const verification = await signatureServiceInstance.verifySignatureChain(
      documentId,
      document.content,
      signatureChain
    );

    // Log signature chain verification
    await AuditTrail.logSignatureAction(document.id, req.user.id, 'verify_chain', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      chainLength: signatureChain.length,
      verificationResult: verification.valid
    });

    res.json({
      success: true,
      data: {
        verification
      },
      message: 'Signature chain verification completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Verify signature chain failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/v1/signatures/statistics
 * @desc    Get signature statistics
 * @access  Private
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  try {
    const stats = await Signature.getSignatureStatistics();

    res.json({
      success: true,
      data: {
        statistics: stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get signature statistics failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/signatures/notarize
 * @desc    Notarize document
 * @access  Private
 */
router.post('/notarize', asyncHandler(async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Document ID is required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find document
    const document = await Document.findOne({
      where: {
        id: documentId,
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

    // Create notarization
    const notarization = await signatureServiceInstance.createNotarization(
      documentId,
      req.user.id,
      document.content
    );

    // Mark document as timestamped
    await document.markAsTimestamped(notarization.notarizationHash);

    // Create timestamp
    const timestamp = await Timestamp.create({
      documentId: document.id,
      timestamp: new Date(),
      dataHash: document.contentHash,
      timestampHash: notarization.notarizationHash,
      combinedHash: notarization.notarizationHash,
      algorithm: 'SHA256',
      source: 'internal',
      isVerified: true,
      action: 'notarize',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Log notarization
    await AuditTrail.logSignatureAction(document.id, req.user.id, 'notarize', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      notarizationHash: notarization.notarizationHash
    });

    res.json({
      success: true,
      data: {
        notarization,
        timestamp
      },
      message: 'Document notarized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Notarize document failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/signatures/verify-notarization
 * @desc    Verify document notarization
 * @access  Private
 */
router.post('/verify-notarization', asyncHandler(async (req, res) => {
  try {
    const { documentId, notarizationData } = req.body;

    if (!documentId || !notarizationData) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Document ID and notarization data are required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find document
    const document = await Document.findOne({
      where: {
        id: documentId,
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

    // Verify notarization
    const verification = await signatureServiceInstance.verifyNotarization(
      documentId,
      document.content,
      notarizationData
    );

    // Log notarization verification
    await AuditTrail.logSignatureAction(document.id, req.user.id, 'verify_notarization', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      verificationResult: verification.valid
    });

    res.json({
      success: true,
      data: {
        verification
      },
      message: 'Notarization verification completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Verify notarization failed:', error);
    throw error;
  }
}));

module.exports = router;
