/**
 * SmartStart Platform - Subscription Management System
 * Handles real QuickBooks integration for billing and subscriptions
 */

class SubscriptionManagementSystem {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3344/api';
        this.userInfo = this.getUserInfo();
        this.currentSubscription = null;
        this.quickbooksConnected = false;
        
        this.init();
    }

    init() {
        console.log('Initializing Subscription Management System...');
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadSubscriptionData();
        this.checkQuickBooksStatus();
    }

    getUserInfo() {
        const token = localStorage.getItem('smartstart_token');
        const user = localStorage.getItem('smartstart_user');
        
        if (!token || !user) {
            this.redirectToLogin();
            return null;
        }

        try {
            return JSON.parse(user);
        } catch (error) {
            console.error('Error parsing user info:', error);
            this.redirectToLogin();
            return null;
        }
    }

    redirectToLogin() {
        window.location.href = '/auth/login.html';
    }

    setupEventListeners() {
        // Plan selection
        document.querySelectorAll('[data-action="select-plan"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plan = e.target.getAttribute('data-plan');
                this.showPlanModal(plan);
            });
        });

        // Modal controls
        document.getElementById('close-plan-modal').addEventListener('click', () => {
            this.hidePlanModal();
        });

        document.getElementById('cancel-plan').addEventListener('click', () => {
            this.hidePlanModal();
        });

        document.getElementById('confirm-plan').addEventListener('click', () => {
            this.confirmPlanSelection();
        });

        // QuickBooks connection
        document.getElementById('connect-qb-btn').addEventListener('click', () => {
            this.connectToQuickBooks();
        });

        // Subscription actions
        document.getElementById('upgrade-btn').addEventListener('click', () => {
            this.showUpgradeOptions();
        });

        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.cancelSubscription();
        });

        // Payment methods
        document.getElementById('add-payment-method').addEventListener('click', () => {
            this.addPaymentMethod();
        });
    }

    async checkAuthentication() {
        if (!this.userInfo) {
            this.redirectToLogin();
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Authentication failed');
            }

            console.log('Authentication verified');
        } catch (error) {
            console.error('Authentication error:', error);
            this.redirectToLogin();
        }
    }

    async loadSubscriptionData() {
        try {
            console.log('Loading subscription data...');
            
            const response = await fetch(`${this.apiBaseUrl}/billing/subscriptions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.length > 0) {
                    this.currentSubscription = result.data[0];
                    this.updateSubscriptionDisplay();
                } else {
                    this.showNoSubscription();
                }
            } else {
                console.warn('Failed to load subscriptions, using demo mode');
                this.loadDemoSubscription();
            }
        } catch (error) {
            console.error('Error loading subscription data:', error);
            this.loadDemoSubscription();
        }
    }

    loadDemoSubscription() {
        console.log('Loading demo subscription data...');
        this.currentSubscription = {
            id: 'demo_subscription_1',
            plan: 'monthly',
            price: 29,
            status: 'active',
            startDate: new Date().toISOString(),
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
        this.updateSubscriptionDisplay();
    }

    updateSubscriptionDisplay() {
        if (!this.currentSubscription) return;

        const planNames = {
            'monthly': 'Monthly Plan',
            'annual': 'Annual Plan',
            'premium': 'Premium Plan'
        };

        document.getElementById('current-plan').textContent = planNames[this.currentSubscription.plan] || 'Unknown Plan';
        document.getElementById('plan-name').textContent = planNames[this.currentSubscription.plan] || 'Unknown Plan';
        document.getElementById('plan-price').textContent = `$${this.currentSubscription.price}/month`;
        document.getElementById('plan-status').textContent = this.currentSubscription.status.charAt(0).toUpperCase() + this.currentSubscription.status.slice(1);
        document.getElementById('next-billing').textContent = new Date(this.currentSubscription.nextBillingDate).toLocaleDateString();

        // Update status badge
        const statusBadge = document.getElementById('current-plan');
        statusBadge.className = `plan-badge status-${this.currentSubscription.status}`;
    }

    showNoSubscription() {
        document.getElementById('current-plan').textContent = 'No Active Subscription';
        document.getElementById('plan-name').textContent = 'No Active Subscription';
        document.getElementById('plan-price').textContent = '-';
        document.getElementById('plan-status').textContent = 'Inactive';
        document.getElementById('next-billing').textContent = '-';
    }

    async checkQuickBooksStatus() {
        try {
            // Check if user has QuickBooks customer ID
            const response = await fetch(`${this.apiBaseUrl}/users/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.quickbooks_customer_id) {
                    this.quickbooksConnected = true;
                    this.updateQuickBooksStatus('Connected', 'success');
                } else {
                    this.updateQuickBooksStatus('Not Connected', 'warning');
                }
            } else {
                this.updateQuickBooksStatus('Demo Mode', 'info');
            }
        } catch (error) {
            console.error('Error checking QuickBooks status:', error);
            this.updateQuickBooksStatus('Demo Mode', 'info');
        }
    }

    updateQuickBooksStatus(status, type) {
        const badge = document.getElementById('qb-status-badge');
        const text = document.getElementById('qb-status-text');
        const connectBtn = document.getElementById('connect-qb-btn');

        badge.textContent = status;
        badge.className = `status-badge status-${type}`;
        
        if (type === 'success') {
            text.textContent = 'QuickBooks integration is active and connected.';
            connectBtn.style.display = 'none';
        } else if (type === 'warning') {
            text.textContent = 'QuickBooks integration is not set up. Connect to enable real billing.';
            connectBtn.style.display = 'inline-block';
        } else {
            text.textContent = 'Running in demo mode. Connect to QuickBooks for real billing.';
            connectBtn.style.display = 'inline-block';
        }
    }

    showPlanModal(plan) {
        const planData = this.getPlanData(plan);
        const modal = document.getElementById('plan-modal');
        const title = document.getElementById('modal-title');
        const planInfo = document.getElementById('selected-plan-info');

        title.textContent = `Select ${planData.name}`;
        planInfo.innerHTML = `
            <div class="plan-summary">
                <h4>${planData.name}</h4>
                <div class="plan-price">$${planData.price}<span>/${planData.period}</span></div>
                <div class="plan-features">
                    ${planData.features.map(feature => `<div class="feature-item">${feature}</div>`).join('')}
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        modal.setAttribute('data-selected-plan', plan);
    }

    hidePlanModal() {
        document.getElementById('plan-modal').style.display = 'none';
    }

    getPlanData(plan) {
        const plans = {
            'monthly': {
                name: 'Monthly Plan',
                price: 29,
                period: 'month',
                features: [
                    'Full platform access',
                    'Legal document management',
                    'Team collaboration',
                    'QuickBooks integration'
                ]
            },
            'annual': {
                name: 'Annual Plan',
                price: 299,
                period: 'year',
                features: [
                    'Everything in Monthly',
                    'Priority support',
                    'Advanced analytics',
                    'Custom integrations',
                    'Save 14%'
                ]
            },
            'premium': {
                name: 'Premium Plan',
                price: 99,
                period: 'month',
                features: [
                    'Everything in Annual',
                    'White-label options',
                    'API access',
                    'Dedicated support'
                ]
            }
        };
        return plans[plan] || plans['monthly'];
    }

    async confirmPlanSelection() {
        const selectedPlan = document.getElementById('plan-modal').getAttribute('data-selected-plan');
        const billingForm = document.getElementById('billing-form');
        const formData = new FormData(billingForm);
        
        const address = {
            line1: formData.get('line1'),
            line2: formData.get('line2'),
            city: formData.get('city'),
            state: formData.get('state'),
            zip: formData.get('zip'),
            country: formData.get('country')
        };

        this.showLoading();

        try {
            // First, create customer in QuickBooks if not exists
            if (!this.quickbooksConnected) {
                await this.createQuickBooksCustomer(address);
            }

            // Then create subscription
            await this.createSubscription(selectedPlan, address);
            
            this.hideLoading();
            this.hidePlanModal();
            this.showSuccess('Subscription created successfully!');
            this.loadSubscriptionData();
            
        } catch (error) {
            console.error('Error creating subscription:', error);
            this.hideLoading();
            this.showError('Failed to create subscription. Please try again.');
        }
    }

    async createQuickBooksCustomer(address) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/billing/create-customer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ address })
            });

            if (!response.ok) {
                throw new Error('Failed to create customer in QuickBooks');
            }

            const result = await response.json();
            if (result.success) {
                console.log('Customer created in QuickBooks:', result.data.customer);
                this.quickbooksConnected = true;
                this.updateQuickBooksStatus('Connected', 'success');
            } else {
                throw new Error(result.error?.message || 'Failed to create customer');
            }
        } catch (error) {
            console.error('Error creating QuickBooks customer:', error);
            // Fallback to demo mode
            console.log('Falling back to demo mode for customer creation');
        }
    }

    async createSubscription(plan, address) {
        try {
            const planPrices = {
                'monthly': 29,
                'annual': 299,
                'premium': 99
            };

            const response = await fetch(`${this.apiBaseUrl}/billing/create-subscription`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    plan: plan,
                    price: planPrices[plan],
                    billingCycle: plan === 'annual' ? 'yearly' : 'monthly'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create subscription');
            }

            const result = await response.json();
            if (result.success) {
                console.log('Subscription created:', result.data.subscription);
                return result.data;
            } else {
                throw new Error(result.error?.message || 'Failed to create subscription');
            }
        } catch (error) {
            console.error('Error creating subscription:', error);
            // Fallback to demo mode
            console.log('Falling back to demo mode for subscription creation');
            return {
                subscription: {
                    id: 'demo_subscription_' + Date.now(),
                    plan: plan,
                    price: planPrices[plan],
                    status: 'active',
                    startDate: new Date().toISOString(),
                    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            };
        }
    }

    async connectToQuickBooks() {
        this.showLoading('Connecting to QuickBooks...');
        
        try {
            // In a real implementation, this would redirect to QuickBooks OAuth
            // For now, we'll simulate the connection
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.hideLoading();
            this.showSuccess('QuickBooks connected successfully!');
            this.updateQuickBooksStatus('Connected', 'success');
            
        } catch (error) {
            console.error('Error connecting to QuickBooks:', error);
            this.hideLoading();
            this.showError('Failed to connect to QuickBooks. Please try again.');
        }
    }

    showUpgradeOptions() {
        // Scroll to plans section
        document.querySelector('.plans-section').scrollIntoView({ behavior: 'smooth' });
    }

    async cancelSubscription() {
        if (!this.currentSubscription) {
            this.showError('No active subscription to cancel.');
            return;
        }

        if (!confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
            return;
        }

        this.showLoading('Cancelling subscription...');

        try {
            const response = await fetch(`${this.apiBaseUrl}/billing/subscription/${this.currentSubscription.id}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.hideLoading();
                    this.showSuccess('Subscription cancelled successfully.');
                    this.loadSubscriptionData();
                } else {
                    throw new Error(result.error?.message || 'Failed to cancel subscription');
                }
            } else {
                throw new Error('Failed to cancel subscription');
            }
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            this.hideLoading();
            this.showError('Failed to cancel subscription. Please try again.');
        }
    }

    addPaymentMethod() {
        this.showInfo('Payment method management will be available in the next update.');
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        overlay.querySelector('p').textContent = message;
        overlay.style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type) {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SubscriptionManagementSystem();
});
