const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware: auth, authorize } = require('../middleware/auth');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../utils/logger');
const {
  User, Venture, Document, Signature, AuditTrail
} = require('../services/databaseService');

const router = express.Router();

/**
 * @route   GET /api/v1/ventures
 * @desc    Get all ventures (public or user's own)
 * @access  Private
 */
router.get('/', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, status, stage, search, public_only } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const offset = (page - 1) * limit;
    let where = {};
    
    // Build where clause based on user role and filters
    if (public_only === 'true') {
      where.is_public = true;
    } else if (userRole === 'admin') {
      // Admin can see all ventures
    } else {
      // Regular users can only see their own ventures and public ones
      where = {
        [require('sequelize').Op.or]: [
          { founder_id: userId },
          { is_public: true }
        ]
      };
    }
    
    if (status) where.status = status;
    if (stage) where.stage = stage;
    
    let ventures;
    if (search) {
      ventures = await Venture.search(search, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status,
        stage,
        isPublic: public_only === 'true'
      });
    } else {
      ventures = await Venture.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [{
          model: User,
          as: 'founder',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }]
      });
    }

    // Log venture list access
    await AuditTrail.logSecurityEvent(userId, 'ventures_list_viewed', 'low', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      filters: { status, stage, search, public_only }
    });

    res.json({
      success: true,
      data: {
        ventures: ventures.rows || ventures,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: ventures.count || ventures.length,
          pages: Math.ceil((ventures.count || ventures.length) / limit)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get ventures failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/v1/ventures/:id
 * @desc    Get venture by ID
 * @access  Private
 */
router.get('/:id', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const venture = await Venture.findByPk(id, {
      include: [{
        model: User,
        as: 'founder',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });
    
    if (!venture) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Venture not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Check access permissions
    const canView = venture.is_public || 
                   venture.founder_id === userId || 
                   venture.isTeamMember(userId) || 
                   userRole === 'admin';
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Log venture view
    await AuditTrail.logSecurityEvent(userId, 'venture_viewed', 'low', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ventureId: id
    });

    res.json({
      success: true,
      data: venture,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get venture failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/ventures
 * @desc    Create new venture
 * @access  Private
 */
router.post('/', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      problem_statement,
      target_market,
      solution,
      business_model,
      revenue_model,
      target_launch_date,
      tags = []
    } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Venture name is required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Create venture
    const venture = await Venture.create({
      name,
      description,
      problem_statement,
      target_market,
      solution,
      business_model,
      revenue_model,
      target_launch_date,
      tags,
      founder_id: userId,
      status: 'idea',
      stage: 'discovery',
      progress_percentage: 0
    });

    // Log venture creation
    await AuditTrail.logSecurityEvent(userId, 'venture_created', 'medium', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ventureId: venture.id,
      ventureName: name
    });

    res.status(201).json({
      success: true,
      data: venture,
      message: 'Venture created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Create venture failed:', error);
    throw error;
  }
}));

/**
 * @route   PUT /api/v1/ventures/:id
 * @desc    Update venture
 * @access  Private
 */
router.put('/:id', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const venture = await Venture.findByPk(id);
    
    if (!venture) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Venture not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Check edit permissions
    const canEdit = venture.canEdit(userId) || userRole === 'admin';
    
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Update venture
    const updatedVenture = await venture.update(req.body);

    // Log venture update
    await AuditTrail.logSecurityEvent(userId, 'venture_updated', 'medium', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ventureId: id,
      changes: Object.keys(req.body)
    });

    res.json({
      success: true,
      data: updatedVenture,
      message: 'Venture updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Update venture failed:', error);
    throw error;
  }
}));

/**
 * @route   DELETE /api/v1/ventures/:id
 * @desc    Delete venture
 * @access  Private
 */
router.delete('/:id', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const venture = await Venture.findByPk(id);
    
    if (!venture) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Venture not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Check delete permissions (only founder or admin)
    const canDelete = venture.isFounder(userId) || userRole === 'admin';
    
    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Delete venture
    await venture.destroy();

    // Log venture deletion
    await AuditTrail.logSecurityEvent(userId, 'venture_deleted', 'high', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ventureId: id,
      ventureName: venture.name
    });

    res.json({
      success: true,
      message: 'Venture deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Delete venture failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/ventures/:id/team
 * @desc    Add team member to venture
 * @access  Private
 */
router.post('/:id/team', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { memberId, role = 'member' } = req.body;
    
    const venture = await Venture.findByPk(id);
    
    if (!venture) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Venture not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Check permissions (only founder can add team members)
    if (!venture.isFounder(userId)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Verify member exists
    const member = await User.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Add team member
    await venture.addTeamMember(memberId, role);

    // Log team member addition
    await AuditTrail.logSecurityEvent(userId, 'team_member_added', 'medium', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ventureId: id,
      memberId,
      role
    });

    res.json({
      success: true,
      message: 'Team member added successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Add team member failed:', error);
    throw error;
  }
}));

/**
 * @route   DELETE /api/v1/ventures/:id/team/:memberId
 * @desc    Remove team member from venture
 * @access  Private
 */
router.delete('/:id/team/:memberId', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user.id;
    
    const venture = await Venture.findByPk(id);
    
    if (!venture) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Venture not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Check permissions (founder or the member themselves)
    if (!venture.isFounder(userId) && userId !== memberId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Remove team member
    await venture.removeTeamMember(memberId);

    // Log team member removal
    await AuditTrail.logSecurityEvent(userId, 'team_member_removed', 'medium', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ventureId: id,
      memberId
    });

    res.json({
      success: true,
      message: 'Team member removed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Remove team member failed:', error);
    throw error;
  }
}));

/**
 * @route   PUT /api/v1/ventures/:id/progress
 * @desc    Update venture progress
 * @access  Private
 */
router.put('/:id/progress', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { stage, percentage } = req.body;
    
    const venture = await Venture.findByPk(id);
    
    if (!venture) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Venture not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Check edit permissions
    if (!venture.canEdit(userId)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Update progress
    await venture.updateProgress(stage, percentage);

    // Log progress update
    await AuditTrail.logSecurityEvent(userId, 'venture_progress_updated', 'medium', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      ventureId: id,
      stage,
      percentage
    });

    res.json({
      success: true,
      message: 'Venture progress updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Update venture progress failed:', error);
    throw error;
  }
}));

module.exports = router;
