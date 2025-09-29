const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware: auth } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { User, Subscription, AuditTrail } = require('../services/databaseService');
const quickbooksService = require('../services/quickbooksService');

const router = express.Router();

/**
 * @route   POST /api/billing/create-customer
 * @desc    Create customer in QuickBooks and link to SmartStart account
 * @access  Private
 */
router.post('/create-customer', auth, asyncHandler(async (req, res) => {
  try {
    const { address, paymentMethod } = req.body;
    const userId = req.user.id;

    // Get user data
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'User not found' } 
      });
    }

    // Create customer in QuickBooks
    const customerData = {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      company: user.company || '',
      address: address,
      subscription: {
        plan: 'monthly' // Default plan
      }
    };

    const quickbooksCustomer = await quickbooksService.createCustomer(customerData);
    
    // Update user with QuickBooks customer ID
    await user.update({
      quickbooks_customer_id: quickbooksCustomer.Id,
      address: JSON.stringify(address)
    });

    // Log audit trail
    await AuditTrail.create({
      userId: userId,
      action: 'CUSTOMER_CREATED',
      details: {
        quickbooksCustomerId: quickbooksCustomer.Id,
        customerName: `${user.first_name} ${user.last_name}`,
        email: user.email
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Customer created in QuickBooks for user ${userId}: ${quickbooksCustomer.Id}`);

    res.status(201).json({
      success: true,
      data: {
        customer: quickbooksCustomer,
        user: {
          id: user.id,
          email: user.email,
          quickbooksCustomerId: quickbooksCustomer.Id
        }
      },
      message: 'Customer created successfully in QuickBooks'
    });

  } catch (error) {
    logger.error('Error creating customer in QuickBooks:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create customer in QuickBooks' }
    });
  }
}));

/**
 * @route   POST /api/billing/create-subscription
 * @desc    Create subscription and invoice in QuickBooks
 * @access  Private
 */
router.post('/create-subscription', auth, asyncHandler(async (req, res) => {
  try {
    const { plan, price, billingCycle } = req.body;
    const userId = req.user.id;

    // Get user data
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'User not found' } 
      });
    }

    if (!user.quickbooks_customer_id) {
      return res.status(400).json({
        success: false,
        error: { message: 'User must be created in QuickBooks first' }
      });
    }

    // Create subscription in database
    const subscription = await Subscription.create({
      userId: userId,
      plan: plan,
      price: price,
      billingCycle: billingCycle || 'monthly',
      status: 'active',
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      quickbooksCustomerId: user.quickbooks_customer_id
    });

    // Create invoice in QuickBooks
    const subscriptionData = {
      plan: plan,
      price: price,
      billingCycle: billingCycle
    };

    const invoice = await quickbooksService.createSubscriptionInvoice(
      subscriptionData, 
      user.quickbooks_customer_id
    );

    // Update subscription with invoice ID
    await subscription.update({
      quickbooksInvoiceId: invoice.Id,
      invoiceNumber: invoice.DocNumber
    });

    // Log audit trail
    await AuditTrail.create({
      userId: userId,
      action: 'SUBSCRIPTION_CREATED',
      details: {
        subscriptionId: subscription.id,
        plan: plan,
        price: price,
        quickbooksInvoiceId: invoice.Id,
        invoiceNumber: invoice.DocNumber
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Subscription created for user ${userId}: ${subscription.id}`);

    res.status(201).json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          price: subscription.price,
          status: subscription.status,
          startDate: subscription.startDate,
          nextBillingDate: subscription.nextBillingDate
        },
        invoice: {
          id: invoice.Id,
          number: invoice.DocNumber,
          amount: invoice.TotalAmt,
          dueDate: invoice.DueDate
        }
      },
      message: 'Subscription created successfully'
    });

  } catch (error) {
    logger.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create subscription' }
    });
  }
}));

/**
 * @route   POST /api/billing/process-payment
 * @desc    Process payment for subscription
 * @access  Private
 */
router.post('/process-payment', auth, asyncHandler(async (req, res) => {
  try {
    const { subscriptionId, paymentMethod, amount } = req.body;
    const userId = req.user.id;

    // Get subscription
    const subscription = await Subscription.findOne({
      where: { id: subscriptionId, userId: userId }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { message: 'Subscription not found' }
      });
    }

    if (!subscription.quickbooksInvoiceId) {
      return res.status(400).json({
        success: false,
        error: { message: 'No invoice found for this subscription' }
      });
    }

    // Get user data
    const user = await User.findByPk(userId);

    // Process payment in QuickBooks
    const paymentData = {
      customerId: user.quickbooks_customer_id,
      amount: amount || subscription.price,
      paymentMethod: paymentMethod,
      subscriptionPlan: subscription.plan
    };

    const payment = await quickbooksService.processPayment(
      paymentData, 
      subscription.quickbooksInvoiceId
    );

    // Update subscription
    await subscription.update({
      lastPaymentDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active'
    });

    // Log audit trail
    await AuditTrail.create({
      userId: userId,
      action: 'PAYMENT_PROCESSED',
      details: {
        subscriptionId: subscription.id,
        amount: paymentData.amount,
        paymentId: payment.Id,
        quickbooksPaymentId: payment.Id
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Payment processed for subscription ${subscriptionId}: ${payment.Id}`);

    res.status(200).json({
      success: true,
      data: {
        payment: {
          id: payment.Id,
          amount: payment.TotalAmt,
          date: payment.TxnDate,
          method: payment.PaymentMethodRef.name
        },
        subscription: {
          id: subscription.id,
          status: subscription.status,
          nextBillingDate: subscription.nextBillingDate
        }
      },
      message: 'Payment processed successfully'
    });

  } catch (error) {
    logger.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to process payment' }
    });
  }
}));

/**
 * @route   GET /api/billing/subscriptions
 * @desc    Get user's subscriptions
 * @access  Private
 */
router.get('/subscriptions', auth, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await Subscription.findAll({
      where: { userId: userId },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: subscriptions,
      message: 'Subscriptions retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving subscriptions:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve subscriptions' }
    });
  }
}));

/**
 * @route   GET /api/billing/analytics
 * @desc    Get billing analytics (admin only)
 * @access  Private (Admin)
 */
router.get('/analytics', auth, asyncHandler(async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Get analytics from QuickBooks
    const analytics = await quickbooksService.getSubscriptionAnalytics(start, end);

    // Get local subscription stats
    const totalSubscriptions = await Subscription.count();
    const activeSubscriptions = await Subscription.count({
      where: { status: 'active' }
    });
    const totalRevenue = await Subscription.sum('price', {
      where: { status: 'active' }
    });

    res.status(200).json({
      success: true,
      data: {
        quickbooks: analytics,
        local: {
          totalSubscriptions,
          activeSubscriptions,
          totalRevenue: totalRevenue || 0
        },
        period: { startDate: start, endDate: end }
      },
      message: 'Analytics retrieved successfully'
    });

  } catch (error) {
    logger.error('Error retrieving analytics:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve analytics' }
    });
  }
}));

/**
 * @route   PUT /api/billing/subscription/:id/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.put('/subscription/:id/cancel', auth, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      where: { id: id, userId: userId }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: { message: 'Subscription not found' }
      });
    }

    // Cancel subscription
    await subscription.update({
      status: 'cancelled',
      cancelledAt: new Date()
    });

    // Log audit trail
    await AuditTrail.create({
      userId: userId,
      action: 'SUBSCRIPTION_CANCELLED',
      details: {
        subscriptionId: subscription.id,
        plan: subscription.plan,
        cancelledAt: new Date()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Subscription cancelled: ${id}`);

    res.status(200).json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelledAt: subscription.cancelledAt
        }
      },
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to cancel subscription' }
    });
  }
}));

module.exports = router;
