const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    },
    plan: {
      type: DataTypes.ENUM('monthly', 'annual'),
      allowNull: false,
      defaultValue: 'monthly'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'cancelled', 'past_due', 'trialing'),
      allowNull: false,
      defaultValue: 'active'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'CAD'
    },
    billingCycle: {
      type: DataTypes.ENUM('monthly', 'yearly'),
      allowNull: false,
      defaultValue: 'monthly',
      field: 'billing_cycle'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'end_date'
    },
    nextBillingDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'next_billing_date'
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'stripe_customer_id'
    },
    stripeSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'stripe_subscription_id'
    },
    stripePriceId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'stripe_price_id'
    },
    paymentMethod: {
      type: DataTypes.ENUM('card', 'bank', 'paypal'),
      allowNull: true,
      field: 'payment_method'
    },
    lastPaymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_payment_date'
    },
    nextPaymentAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'next_payment_amount'
    },
    cancellationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cancellation_date'
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'cancellation_reason'
    },
    trialEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'trial_end_date'
    },
    isTrialActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_trial_active'
    },
    features: {
      type: DataTypes.JSON,
      defaultValue: {
        platformAccess: true,
        ventureManagement: true,
        legalTemplates: true,
        communityAccess: true,
        analytics: false,
        prioritySupport: false,
        earlyAccess: false
      }
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'subscriptions',
    timestamps: true
  });

  // Instance methods
  Subscription.prototype.isActive = function() {
    return this.status === 'active' && (!this.endDate || this.endDate > new Date());
  };

  Subscription.prototype.isTrial = function() {
    return this.isTrialActive && this.trialEndDate && this.trialEndDate > new Date();
  };

  Subscription.prototype.daysUntilRenewal = function() {
    if (!this.nextBillingDate) return null;
    const now = new Date();
    const renewal = new Date(this.nextBillingDate);
    const diffTime = renewal - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  Subscription.prototype.cancel = async function(reason = 'User requested cancellation') {
    this.status = 'cancelled';
    this.cancellationDate = new Date();
    this.cancellationReason = reason;
    
    // Set end date based on billing cycle
    const now = new Date();
    if (this.billingCycle === 'monthly') {
      this.endDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
    } else {
      this.endDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now
    }
    
    return this.save();
  };

  Subscription.prototype.renew = async function() {
    this.status = 'active';
    this.lastPaymentDate = new Date();
    
    // Set next billing date
    const now = new Date();
    if (this.billingCycle === 'monthly') {
      this.nextBillingDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    } else {
      this.nextBillingDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
    }
    
    return this.save();
  };

  Subscription.prototype.getUsageStats = function() {
    return {
      plan: this.plan,
      status: this.status,
      isActive: this.isActive(),
      isTrial: this.isTrial(),
      daysUntilRenewal: this.daysUntilRenewal(),
      price: this.price,
      currency: this.currency,
      billingCycle: this.billingCycle,
      startDate: this.startDate,
      endDate: this.endDate,
      nextBillingDate: this.nextBillingDate,
      features: this.features
    };
  };

  // Class methods
  Subscription.findActiveByUser = function(userId) {
    return this.findOne({
      where: {
        userId,
        status: 'active'
      }
    });
  };

  Subscription.findByUser = function(userId) {
    return this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  };

  Subscription.findByStripeCustomerId = function(stripeCustomerId) {
    return this.findOne({
      where: { stripeCustomerId }
    });
  };

  Subscription.findByStripeSubscriptionId = function(stripeSubscriptionId) {
    return this.findOne({
      where: { stripeSubscriptionId }
    });
  };

  Subscription.getActiveSubscriptions = function() {
    return this.findAll({
      where: { status: 'active' },
      include: ['user']
    });
  };

  Subscription.getExpiringSubscriptions = function(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this.findAll({
      where: {
        status: 'active',
        nextBillingDate: {
          [sequelize.Sequelize.Op.lte]: futureDate
        }
      },
      include: ['user']
    });
  };

  Subscription.getSubscriptionStats = async function() {
    const total = await this.count();
    const active = await this.count({ where: { status: 'active' } });
    const cancelled = await this.count({ where: { status: 'cancelled' } });
    const pastDue = await this.count({ where: { status: 'past_due' } });
    const monthly = await this.count({ where: { plan: 'monthly', status: 'active' } });
    const annual = await this.count({ where: { plan: 'annual', status: 'active' } });
    
    return {
      total,
      active,
      cancelled,
      pastDue,
      monthly,
      annual,
      activeRate: total > 0 ? (active / total) * 100 : 0,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0
    };
  };

  return Subscription;
};
