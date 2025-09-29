const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const { authMiddleware: auth } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const {
  Subscription, User, AuditTrail
} = require('../services/databaseService');
const quickbooksService = require('../services/quickbooksService');

const router = express.Router();

/**
 * @route   GET /api/v1/subscriptions
 * @desc    Get user's subscription
 * @access  Private
 */
router.get('/', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const subscription = await Subscription.findActiveByUser(req.user.id);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    res.json({
      success: true,
      data: subscription.getUsageStats(),
      message: 'Subscription retrieved successfully'
    });
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscription'
    });
  }
}));

/**
 * @route   POST /api/v1/subscriptions
 * @desc    Create new subscription
 * @access  Private
 */
router.post('/', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const {
      plan,
      price,
      currency = 'CAD',
      billingCycle,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      paymentMethod,
      trialDays = 0
    } = req.body;

    // Validate required fields
    if (!plan || !price) {
      return res.status(400).json({
        success: false,
        message: 'Plan and price are required'
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findActiveByUser(req.user.id);
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active subscription'
      });
    }

    // Create subscription
    const subscriptionData = {
      userId: req.user.id,
      plan,
      price: parseFloat(price),
      currency,
      billingCycle: billingCycle || plan,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      paymentMethod,
      status: trialDays > 0 ? 'trialing' : 'active'
    };

    // Set trial period if applicable
    if (trialDays > 0) {
      subscriptionData.isTrialActive = true;
      subscriptionData.trialEndDate = new Date();
      subscriptionData.trialEndDate.setDate(subscriptionData.trialEndDate.getDate() + trialDays);
    }

    // Set billing dates
    const now = new Date();
    subscriptionData.startDate = now;
    subscriptionData.nextBillingDate = new Date(now.getTime() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

    // Set plan features
    subscriptionData.features = getPlanFeatures(plan);

    const subscription = await Subscription.create(subscriptionData);

    // Log audit trail
    await AuditTrail.create({
      userId: req.user.id,
      action: 'subscription_created',
      resource: 'subscription',
      resourceId: subscription.id,
      metadata: {
        plan,
        price,
        currency,
        billingCycle
      }
    });

    logger.info(`Subscription created for user ${req.user.id}:`, {
      subscriptionId: subscription.id,
      plan,
      price,
      currency
    });

    res.status(201).json({
      success: true,
      data: subscription.getUsageStats(),
      message: 'Subscription created successfully'
    });
  } catch (error) {
    logger.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription'
    });
  }
}));

/**
 * @route   PUT /api/v1/subscriptions/:id
 * @desc    Update subscription
 * @access  Private
 */
router.put('/:id', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const subscription = await Subscription.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Update subscription
    await subscription.update(updateData);

    // Log audit trail
    await AuditTrail.create({
      userId: req.user.id,
      action: 'subscription_updated',
      resource: 'subscription',
      resourceId: subscription.id,
      metadata: updateData
    });

    logger.info(`Subscription updated for user ${req.user.id}:`, {
      subscriptionId: subscription.id,
      updates: updateData
    });

    res.json({
      success: true,
      data: subscription.getUsageStats(),
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    logger.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    });
  }
}));

/**
 * @route   POST /api/v1/subscriptions/:id/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.post('/:id/cancel', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const subscription = await Subscription.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (!subscription.isActive()) {
      return res.status(400).json({
        success: false,
        message: 'Subscription is not active'
      });
    }

    // Cancel subscription
    await subscription.cancel(reason);

    // Log audit trail
    await AuditTrail.create({
      userId: req.user.id,
      action: 'subscription_cancelled',
      resource: 'subscription',
      resourceId: subscription.id,
      metadata: { reason }
    });

    logger.info(`Subscription cancelled for user ${req.user.id}:`, {
      subscriptionId: subscription.id,
      reason
    });

    res.json({
      success: true,
      data: subscription.getUsageStats(),
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
}));

/**
 * @route   POST /api/v1/subscriptions/:id/renew
 * @desc    Renew subscription
 * @access  Private
 */
router.post('/:id/renew', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Renew subscription
    await subscription.renew();

    // Log audit trail
    await AuditTrail.create({
      userId: req.user.id,
      action: 'subscription_renewed',
      resource: 'subscription',
      resourceId: subscription.id
    });

    logger.info(`Subscription renewed for user ${req.user.id}:`, {
      subscriptionId: subscription.id
    });

    res.json({
      success: true,
      data: subscription.getUsageStats(),
      message: 'Subscription renewed successfully'
    });
  } catch (error) {
    logger.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to renew subscription'
    });
  }
}));

/**
 * @route   GET /api/v1/subscriptions/history
 * @desc    Get subscription history
 * @access  Private
 */
router.get('/history', auth, apiRateLimiter, asyncHandler(async (req, res) => {
  try {
    const subscriptions = await Subscription.findByUser(req.user.id);

    const history = subscriptions.map(sub => sub.getUsageStats());

    res.json({
      success: true,
      data: history,
      message: 'Subscription history retrieved successfully'
    });
  } catch (error) {
    logger.error('Get subscription history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscription history'
    });
  }
}));

/**
 * @route   GET /api/v1/subscriptions/plans
 * @desc    Get available subscription plans
 * @access  Public
 */
router.get('/plans', asyncHandler(async (req, res) => {
  try {
    const plans = [
      {
        id: 'monthly',
        name: 'Monthly Membership',
        price: 100,
        currency: 'CAD',
        billingCycle: 'monthly',
        features: {
          platformAccess: true,
          ventureManagement: true,
          legalTemplates: true,
          communityAccess: true,
          analytics: false,
          prioritySupport: false,
          earlyAccess: false
        },
        description: 'Full SmartStart platform access with monthly billing'
      },
      {
        id: 'annual',
        name: 'Annual Membership',
        price: 1000,
        currency: 'CAD',
        billingCycle: 'yearly',
        features: {
          platformAccess: true,
          ventureManagement: true,
          legalTemplates: true,
          communityAccess: true,
          analytics: true,
          prioritySupport: true,
          earlyAccess: true
        },
        description: 'Everything in Monthly plan plus premium features and 2 months free',
        savings: 200
      }
    ];

    res.json({
      success: true,
      data: plans,
      message: 'Subscription plans retrieved successfully'
    });
  } catch (error) {
    logger.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscription plans'
    });
  }
}));

/**
 * Helper function to get plan features
 */
function getPlanFeatures(plan) {
  const features = {
    monthly: {
      platformAccess: true,
      ventureManagement: true,
      legalTemplates: true,
      communityAccess: true,
      analytics: false,
      prioritySupport: false,
      earlyAccess: false
    },
    annual: {
      platformAccess: true,
      ventureManagement: true,
      legalTemplates: true,
      communityAccess: true,
      analytics: true,
      prioritySupport: true,
      earlyAccess: true
    }
  };

  return features[plan] || features.monthly;
}

module.exports = router;
