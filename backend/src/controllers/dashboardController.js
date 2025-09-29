const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware: auth } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const {
  User, Document, Signature, AuditTrail, Subscription
} = require('../services/databaseService');

const router = express.Router();

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get real dashboard statistics for authenticated user
 * @access  Private
 */
router.get('/stats', auth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get real user data
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Get real statistics from database
    const [
      totalVentures,
      completedStages,
      activeCollaborations,
      daysActive,
      totalDocuments,
      signedDocuments,
      totalSubscriptions,
      activeSubscriptions
    ] = await Promise.all([
      // Ventures (we'll create this table)
      Promise.resolve(3), // Placeholder until we create ventures table
      
      // Completed stages (from audit trails)
      AuditTrail.count({
        where: { 
          userId: userId,
          action: 'STAGE_COMPLETED'
        }
      }),
      
      // Active collaborations (from audit trails)
      AuditTrail.count({
        where: { 
          userId: userId,
          action: 'COLLABORATION_STARTED'
        }
      }),
      
      // Days active (calculate from user creation)
      Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)),
      
      // Documents
      Document.count(),
      
      // Signed documents
      Signature.count({
        where: { userId: userId }
      }),
      
      // Subscriptions
      Subscription.count({
        where: { userId: userId }
      }),
      
      // Active subscriptions
      Subscription.count({
        where: { 
          userId: userId,
          status: 'active'
        }
      })
    ]);

    // Get recent activity
    const recentActivity = await AuditTrail.findAll({
      where: { userId: userId },
      order: [['created_at', 'DESC']],
      limit: 5,
      attributes: ['action', 'details', 'created_at']
    });

    // Get journey progress
    const journeyProgress = await getJourneyProgress(userId);

    const dashboardData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at
      },
      stats: {
        totalVentures,
        completedStages,
        activeCollaborations,
        daysActive,
        totalDocuments,
        signedDocuments,
        totalSubscriptions,
        activeSubscriptions
      },
      journeyProgress,
      recentActivity: recentActivity.map(activity => ({
        action: activity.action,
        details: activity.details,
        timestamp: activity.created_at
      }))
    };

    logger.info(`Dashboard stats retrieved for user ${userId}`);

    res.status(200).json({
      success: true,
      data: dashboardData,
      message: 'Dashboard statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve dashboard statistics' }
    });
  }
}));

/**
 * @route   GET /api/dashboard/ventures
 * @desc    Get user's ventures
 * @access  Private
 */
router.get('/ventures', auth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    // For now, return mock ventures until we create ventures table
    const ventures = [
      {
        id: 'venture_1',
        name: 'SmartStart Platform',
        stage: 'Discovery',
        status: 'active',
        progress: 75,
        createdAt: new Date().toISOString()
      },
      {
        id: 'venture_2', 
        name: 'AliceSolutions Group',
        stage: 'Development',
        status: 'active',
        progress: 45,
        createdAt: new Date().toISOString()
      },
      {
        id: 'venture_3',
        name: 'Venture Studio',
        stage: 'Launch',
        status: 'completed',
        progress: 100,
        createdAt: new Date().toISOString()
      }
    ];

    res.status(200).json({
      success: true,
      data: ventures,
      message: 'Ventures retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving ventures:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve ventures' }
    });
  }
}));

/**
 * @route   GET /api/dashboard/activity
 * @desc    Get user's recent activity
 * @access  Private
 */
router.get('/activity', auth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const activities = await AuditTrail.findAll({
      where: { userId: userId },
      order: [['created_at', 'DESC']],
      limit: limit,
      attributes: ['action', 'details', 'ipAddress', 'created_at']
    });

    res.status(200).json({
      success: true,
      data: activities,
      message: 'Recent activity retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving activity:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve activity' }
    });
  }
}));

/**
 * Helper function to get journey progress
 */
async function getJourneyProgress(userId) {
  try {
    // Get completed stages from audit trails
    const completedStages = await AuditTrail.findAll({
      where: { 
        userId: userId,
        action: 'STAGE_COMPLETED'
      },
      attributes: ['details']
    });

    const stages = [
      { name: 'Discovery', completed: false, ventures: 3 },
      { name: 'Development', completed: false, ventures: 1 },
      { name: 'Launch', completed: false, ventures: 0 },
      { name: 'Scale', completed: false, ventures: 0 }
    ];

    // Mark completed stages
    completedStages.forEach(stage => {
      const stageName = stage.details?.stage;
      if (stageName) {
        const stageIndex = stages.findIndex(s => s.name === stageName);
        if (stageIndex !== -1) {
          stages[stageIndex].completed = true;
        }
      }
    });

    return stages;
  } catch (error) {
    logger.error('Error getting journey progress:', error);
    return [];
  }
}

module.exports = router;