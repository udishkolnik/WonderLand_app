const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware: auth } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { Document, Signature, AuditTrail, User } = require('../services/databaseService');

const router = express.Router();

/**
 * @route   GET /api/legal/documents
 * @desc    Get all legal documents
 * @access  Private
 */
router.get('/documents', auth, asyncHandler(async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { type: 'legal' },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: documents,
      message: 'Legal documents retrieved successfully'
    });
  } catch (error) {
    logger.error('Get legal documents failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/legal/required
 * @desc    Get required legal documents for user
 * @access  Private
 */
router.get('/required', auth, asyncHandler(async (req, res) => {
  try {
    // Get all legal documents
    const documents = await Document.findAll({
      where: {
        type: 'legal',
        status: 'active'
      },
      order: [['createdAt', 'ASC']]
    });

    // Get user's signatures
    const userSignatures = await Signature.findAll({
      where: { userId: req.user.id },
      attributes: ['documentId', 'signedAt']
    });

    const signedDocumentIds = userSignatures.map(sig => sig.documentId);

    // Mark which documents are signed
    const documentsWithStatus = documents.map(doc => ({
      ...doc.toJSON(),
      isSigned: signedDocumentIds.includes(doc.id),
      signedAt: signedDocumentIds.includes(doc.id) 
        ? userSignatures.find(sig => sig.documentId === doc.id)?.signedAt 
        : null
    }));

    res.json({
      success: true,
      data: documentsWithStatus,
      message: 'Required legal documents retrieved successfully'
    });
  } catch (error) {
    logger.error('Get required legal documents failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/legal/sign
 * @desc    Sign legal document
 * @access  Private
 */
router.post('/sign', auth, asyncHandler(async (req, res) => {
  try {
    const { documentId, signatureData } = req.body;
    
    // Get the document
    const document = await Document.findByPk(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document not found' }
      });
    }

    // Check if user has already signed this document
    const existingSignature = await Signature.findOne({
      where: {
        documentId,
        userId: req.user.id
      }
    });

    if (existingSignature) {
      return res.status(400).json({
        success: false,
        error: { message: 'Document already signed by this user' }
      });
    }

    // Create signature
    const signature = await Signature.create({
      documentId,
      userId: req.user.id,
      signatureData: JSON.stringify(signatureData),
      signedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Log signature event
    await AuditTrail.create({
      userId: req.user.id,
      action: 'document_signed',
      details: `Document ${document.title} signed`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: signature,
      message: 'Document signed successfully'
    });
  } catch (error) {
    logger.error('Sign document failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/legal/status
 * @desc    Get user's legal document status
 * @access  Private
 */
router.get('/status', auth, asyncHandler(async (req, res) => {
  try {
    // Get all legal documents
    const totalDocuments = await Document.count({
      where: {
        type: 'legal',
        status: 'active'
      }
    });

    // Get user's signed documents
    const signedDocuments = await Signature.count({
      where: { userId: req.user.id },
      include: [
        {
          model: Document,
          as: 'document',
          where: { type: 'legal', status: 'active' }
        }
      ]
    });

    const completionPercentage = totalDocuments > 0 
      ? Math.round((signedDocuments / totalDocuments) * 100) 
      : 100;

    const isComplete = signedDocuments >= totalDocuments;

    res.json({
      success: true,
      data: {
        totalDocuments,
        signedDocuments,
        completionPercentage,
        isComplete,
        lastUpdated: new Date()
      },
      message: 'Legal document status retrieved successfully'
    });
  } catch (error) {
    logger.error('Get legal document status failed:', error);
    throw error;
  }
}));

module.exports = router;