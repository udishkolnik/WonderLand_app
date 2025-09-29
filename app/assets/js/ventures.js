/**
 * SmartStart Ventures JavaScript
 * Advanced venture management and analytics
 */

class SmartStartVentures {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3344/api';
    this.currentUser = null;
    this.authToken = null;
    this.ventures = [];
    this.analytics = null;
    
    this.init();
  }

  /**
   * Initialize ventures management
   */
  async init() {
    try {
      // Check authentication
      await this.checkAuth();
      
      // Load ventures data
      await this.loadVenturesData();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('Ventures management initialized successfully');
    } catch (error) {
      console.error('Ventures initialization failed:', error);
      this.handleError(error);
    }
  }

  /**
   * Check user authentication
   */
  async checkAuth() {
    try {
      this.authToken = localStorage.getItem('smartstart_token') || sessionStorage.getItem('smartstart_token');
      this.currentUser = JSON.parse(localStorage.getItem('smartstart_user') || '{}');
      
      if (!this.authToken || !this.currentUser.email) {
        window.location.href = 'auth/login.html';
        return;
      }
      
      console.log('Ventures authentication successful for:', this.currentUser.email);
    } catch (error) {
      console.error('Authentication check failed:', error);
      window.location.href = 'auth/login.html';
    }
  }

  /**
   * Load ventures data with analytics
   */
  async loadVenturesData() {
    try {
      // Load ventures analytics
      await this.loadVenturesAnalytics();
      
      // Load ventures list
      await this.loadVenturesList();
      
      // Update AI insights
      this.updateAIInsights();
      
      console.log('Ventures data loaded successfully');
    } catch (error) {
      console.error('Failed to load ventures data:', error);
      this.loadDemoData();
    }
  }

  /**
   * Load ventures analytics
   */
  async loadVenturesAnalytics() {
    try {
      const response = await this.apiCall('/ventures/analytics');
      this.analytics = response;
      this.updateAnalytics();
    } catch (error) {
      console.warn('Using demo ventures analytics');
      this.analytics = {
        totalVentures: 3,
        activeVentures: 2,
        completedVentures: 1,
        totalValue: 2400000
      };
      this.updateAnalytics();
    }
  }

  /**
   * Load ventures list
   */
  async loadVenturesList() {
    try {
      const response = await this.apiCall('/ventures');
      this.ventures = response.ventures || [];
      this.updateVenturesList();
    } catch (error) {
      console.warn('Using demo ventures data');
      this.ventures = [
        {
          id: 1,
          name: 'SmartStart Platform',
          description: 'Building the next generation venture platform',
          status: 'development',
          progress: 75,
          equity: 15,
          daysRemaining: 15,
          teamMembers: 3,
          value: 1200000
        },
        {
          id: 2,
          name: 'AI Assistant',
          description: 'Intelligent assistant for entrepreneurs',
          status: 'idea',
          progress: 25,
          equity: 12,
          daysRemaining: 28,
          teamMembers: 2,
          value: 800000
        },
        {
          id: 3,
          name: 'FinTech Solution',
          description: 'Revolutionary financial technology platform',
          status: 'completed',
          progress: 100,
          equity: 20,
          daysRemaining: 0,
          teamMembers: 4,
          value: 2000000
        }
      ];
      this.updateVenturesList();
    }
  }

  /**
   * Update analytics display
   */
  updateAnalytics() {
    if (!this.analytics) return;

    const elements = {
      totalVentures: this.analytics.totalVentures,
      activeVentures: this.analytics.activeVentures,
      completedVentures: this.analytics.completedVentures,
      totalValue: '$' + (this.analytics.totalValue / 1000000).toFixed(1) + 'M'
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  }

  /**
   * Update ventures list display
   */
  updateVenturesList() {
    const venturesGrid = document.getElementById('venturesGrid');
    if (!venturesGrid || !this.ventures.length) return;

    venturesGrid.innerHTML = this.ventures.map(venture => `
      <div class="venture-card enhanced">
        <div class="venture-header">
          <div class="venture-info">
            <h3>${venture.name}</h3>
            <p>${venture.description}</p>
            <div class="venture-badges">
              <span class="badge ${this.getStatusBadgeClass(venture.status)}">${venture.status}</span>
              <span class="badge info">${venture.teamMembers} members</span>
            </div>
          </div>
          <div class="venture-metrics">
            <div class="metric">
              <span class="metric-label">Equity</span>
              <span class="metric-value">${venture.equity}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Value</span>
              <span class="metric-value">$${(venture.value / 1000000).toFixed(1)}M</span>
            </div>
          </div>
        </div>
        <div class="venture-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${venture.progress}%"></div>
          </div>
          <div class="venture-status">
            <span class="status-text">${venture.progress}% complete</span>
            ${venture.daysRemaining > 0 ? `<span class="days-remaining">${venture.daysRemaining} days to decision gate</span>` : ''}
          </div>
        </div>
        <div class="venture-actions">
          <button class="btn btn-sm btn-primary" onclick="venturesManager.continueVenture('${venture.name}')">Continue</button>
          <button class="btn btn-sm btn-secondary" onclick="venturesManager.showVentureAnalytics('${venture.name}')">Analytics</button>
          <button class="btn btn-sm btn-ghost" onclick="venturesManager.showVentureDetails('${venture.name}')">Details</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status) {
    const statusClasses = {
      'development': 'primary',
      'idea': 'secondary',
      'completed': 'success',
      'paused': 'warning',
      'cancelled': 'error'
    };
    return statusClasses[status] || 'secondary';
  }

  /**
   * Update AI insights
   */
  updateAIInsights() {
    const insights = this.generateAIInsights();
    const aiInsightsContent = document.querySelector('.ai-insights-content');
    if (!aiInsightsContent) return;

    aiInsightsContent.innerHTML = insights.map(insight => `
      <div class="insight-item">
        <div class="insight-icon">${insight.icon}</div>
        <div class="insight-content">
          <h4>${insight.title}</h4>
          <p>${insight.description}</p>
        </div>
      </div>
    `).join('');
  }

  /**
   * Generate AI insights based on ventures data
   */
  generateAIInsights() {
    const insights = [];
    
    // Market opportunity analysis
    const activeVentures = this.ventures.filter(v => v.status === 'development');
    if (activeVentures.length > 0) {
      insights.push({
        icon: '🎯',
        title: 'Market Opportunity',
        description: 'Your fintech venture shows strong market potential. Consider expanding to adjacent markets.'
      });
    }

    // Decision gate alerts
    const approachingDecisionGate = this.ventures.filter(v => v.daysRemaining > 0 && v.daysRemaining <= 5);
    if (approachingDecisionGate.length > 0) {
      insights.push({
        icon: '⚠️',
        title: 'Decision Gate Alert',
        description: `${approachingDecisionGate[0].name} is approaching its 30-day decision gate. Prepare your metrics.`
      });
    }

    // Success rate insights
    const successRate = (this.analytics.completedVentures / this.analytics.totalVentures) * 100;
    if (successRate < 50) {
      insights.push({
        icon: '📊',
        title: 'Success Rate Analysis',
        description: 'Your success rate could be improved by focusing on market validation in the early stages.'
      });
    }

    return insights;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Refresh insights button
    const refreshInsights = document.getElementById('refreshVentureInsights');
    if (refreshInsights) {
      refreshInsights.addEventListener('click', () => {
        this.refreshAIInsights();
      });
    }

    // Filter ventures button
    const filterVentures = document.getElementById('filterVentures');
    if (filterVentures) {
      filterVentures.addEventListener('click', () => {
        this.showVentureFilters();
      });
    }

    // Create venture button
    const createVenture = document.getElementById('createVenture');
    if (createVenture) {
      createVenture.addEventListener('click', () => {
        this.showCreateVentureModal();
      });
    }
  }

  /**
   * Refresh AI insights
   */
  refreshAIInsights() {
    this.showInfo('Refreshing AI insights...');
    setTimeout(() => {
      this.updateAIInsights();
      this.showSuccessMessage('AI insights updated!');
    }, 1000);
  }

  /**
   * Show venture filters
   */
  showVentureFilters() {
    this.showInfo('Venture filtering feature coming soon!');
  }

  /**
   * Show create venture modal
   */
  showCreateVentureModal() {
    this.showInfo('Create venture feature coming soon!');
  }

  /**
   * Continue venture
   */
  continueVenture(ventureName) {
    this.showSuccessMessage(`Opening ${ventureName} workspace...`);
  }

  /**
   * Show venture analytics
   */
  showVentureAnalytics(ventureName) {
    this.showInfo(`Opening analytics for ${ventureName}...`);
  }

  /**
   * Show venture details
   */
  showVentureDetails(ventureName) {
    this.showInfo(`Opening details for ${ventureName}...`);
  }

  /**
   * Load demo data
   */
  loadDemoData() {
    console.log('Loading demo ventures data...');
    this.analytics = {
      totalVentures: 3,
      activeVentures: 2,
      completedVentures: 1,
      totalValue: 2400000
    };
    this.updateAnalytics();
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    if (window.Microinteractions) {
      window.Microinteractions.showSuccessMessage(message);
    } else {
      console.log('Success:', message);
    }
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    if (window.Microinteractions) {
      window.Microinteractions.showErrorMessage(message);
    } else {
      console.error('Error:', message);
    }
  }

  /**
   * Show info message
   */
  showInfo(message) {
    if (window.Microinteractions) {
      window.Microinteractions.showNotification(message, 'info');
    } else {
      console.log('Info:', message);
    }
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('Ventures management error:', error);
    this.showErrorMessage('An error occurred. Please try again.');
  }

  /**
   * Make API call
   */
  async apiCall(endpoint, method = 'GET', data = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }
}

// Initialize ventures management when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.venturesManager = new SmartStartVentures();
});
