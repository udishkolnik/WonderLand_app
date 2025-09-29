const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * QuickBooks Integration Service
 * Handles real subscription billing and customer management
 */

class QuickBooksService {
  constructor() {
    this.baseURL = process.env.QUICKBOOKS_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com';
    this.clientId = process.env.QUICKBOOKS_CLIENT_ID;
    this.clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
    this.accessToken = null;
    this.refreshToken = null;
    this.realmId = process.env.QUICKBOOKS_REALM_ID;
  }

  /**
   * Authenticate with QuickBooks
   */
  async authenticate() {
    try {
      const response = await axios.post('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'com.intuit.quickbooks.accounting'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      
      logger.info('QuickBooks authentication successful');
      return true;
    } catch (error) {
      logger.error('QuickBooks authentication failed:', error);
      return false;
    }
  }

  /**
   * Create customer in QuickBooks
   * @param {Object} customerData - Customer information
   * @returns {Promise<Object>} - Created customer
   */
  async createCustomer(customerData) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const customer = {
        Name: `${customerData.firstName} ${customerData.lastName}`,
        CompanyName: customerData.company || '',
        PrimaryEmailAddr: {
          Address: customerData.email
        },
        BillAddr: {
          Line1: customerData.address?.line1 || '',
          City: customerData.address?.city || '',
          CountrySubDivisionCode: customerData.address?.state || '',
          PostalCode: customerData.address?.zip || '',
          Country: customerData.address?.country || 'US'
        },
        Notes: `SmartStart Platform Customer - ${customerData.subscription?.plan || 'monthly'} plan`
      };

      const response = await axios.post(
        `${this.baseURL}/v3/company/${this.realmId}/customers`,
        customer,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Customer created in QuickBooks: ${response.data.Customer.Id}`);
      return response.data.Customer;
    } catch (error) {
      logger.error('Failed to create customer in QuickBooks:', error);
      throw error;
    }
  }

  /**
   * Create subscription invoice in QuickBooks
   * @param {Object} subscriptionData - Subscription information
   * @param {string} customerId - QuickBooks customer ID
   * @returns {Promise<Object>} - Created invoice
   */
  async createSubscriptionInvoice(subscriptionData, customerId) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const invoice = {
        CustomerRef: {
          value: customerId
        },
        Line: [{
          DetailType: 'SalesItemLineDetail',
          Amount: subscriptionData.price,
          SalesItemLineDetail: {
            ItemRef: {
              value: this.getItemId(subscriptionData.plan)
            }
          }
        }],
        TxnDate: new Date().toISOString().split('T')[0],
        DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        PrivateNote: `SmartStart Platform - ${subscriptionData.plan} subscription`
      };

      const response = await axios.post(
        `${this.baseURL}/v3/company/${this.realmId}/invoices`,
        invoice,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Invoice created in QuickBooks: ${response.data.Invoice.Id}`);
      return response.data.Invoice;
    } catch (error) {
      logger.error('Failed to create invoice in QuickBooks:', error);
      throw error;
    }
  }

  /**
   * Get or create subscription items in QuickBooks
   * @param {string} planName - Subscription plan name
   * @returns {string} - Item ID
   */
  getItemId(planName) {
    const items = {
      'monthly': process.env.QUICKBOOKS_MONTHLY_ITEM_ID || '1',
      'annual': process.env.QUICKBOOKS_ANNUAL_ITEM_ID || '2',
      'premium': process.env.QUICKBOOKS_PREMIUM_ITEM_ID || '3'
    };
    return items[planName] || items['monthly'];
  }

  /**
   * Process payment for subscription
   * @param {Object} paymentData - Payment information
   * @param {string} invoiceId - QuickBooks invoice ID
   * @returns {Promise<Object>} - Payment result
   */
  async processPayment(paymentData, invoiceId) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const payment = {
        CustomerRef: {
          value: paymentData.customerId
        },
        TotalAmt: paymentData.amount,
        PaymentMethodRef: {
          value: paymentData.paymentMethod || '1' // Cash/Check
        },
        Line: [{
          Amount: paymentData.amount,
          LinkedTxn: [{
            TxnId: invoiceId,
            TxnType: 'Invoice'
          }]
        }],
        TxnDate: new Date().toISOString().split('T')[0],
        PrivateNote: `SmartStart Platform payment - ${paymentData.subscriptionPlan}`
      };

      const response = await axios.post(
        `${this.baseURL}/v3/company/${this.realmId}/payments`,
        payment,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Payment processed in QuickBooks: ${response.data.Payment.Id}`);
      return response.data.Payment;
    } catch (error) {
      logger.error('Failed to process payment in QuickBooks:', error);
      throw error;
    }
  }

  /**
   * Get customer by email
   * @param {string} email - Customer email
   * @returns {Promise<Object>} - Customer data
   */
  async getCustomerByEmail(email) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.get(
        `${this.baseURL}/v3/company/${this.realmId}/customers?query=PrimaryEmailAddr='${email}'`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.QueryResponse.Customer?.[0] || null;
    } catch (error) {
      logger.error('Failed to get customer from QuickBooks:', error);
      throw error;
    }
  }

  /**
   * Update customer subscription
   * @param {string} customerId - QuickBooks customer ID
   * @param {Object} subscriptionData - New subscription data
   * @returns {Promise<Object>} - Updated customer
   */
  async updateCustomerSubscription(customerId, subscriptionData) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const customer = {
        Id: customerId,
        Notes: `SmartStart Platform Customer - ${subscriptionData.plan} plan - Updated: ${new Date().toISOString()}`
      };

      const response = await axios.post(
        `${this.baseURL}/v3/company/${this.realmId}/customers`,
        customer,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Customer subscription updated in QuickBooks: ${customerId}`);
      return response.data.Customer;
    } catch (error) {
      logger.error('Failed to update customer subscription in QuickBooks:', error);
      throw error;
    }
  }

  /**
   * Get subscription analytics
   * @param {string} startDate - Start date for analytics
   * @param {string} endDate - End date for analytics
   * @returns {Promise<Object>} - Analytics data
   */
  async getSubscriptionAnalytics(startDate, endDate) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.get(
        `${this.baseURL}/v3/company/${this.realmId}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get analytics from QuickBooks:', error);
      throw error;
    }
  }
}

// Create singleton instance
const quickbooksService = new QuickBooksService();

module.exports = quickbooksService;
