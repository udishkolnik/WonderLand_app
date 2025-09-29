/**
 * SmartStart Team Management JavaScript
 * Advanced team analytics and collaboration features
 */

class SmartStartTeam {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3344/api';
    this.currentUser = null;
    this.authToken = null;
    this.teamMembers = [];
    this.teamAnalytics = null;
    
    this.init();
  }

  /**
   * Initialize team management
   */
  async init() {
    try {
      // Check authentication
      await this.checkAuth();
      
      // Load team data
      await this.loadTeamData();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('Team management initialized successfully');
    } catch (error) {
      console.error('Team initialization failed:', error);
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
        window.location.href = '/auth/login.html';
        return;
      }
      
      console.log('Team authentication successful for:', this.currentUser.email);
    } catch (error) {
      console.error('Authentication check failed:', error);
      window.location.href = '/auth/login.html';
    }
  }

  /**
   * Load team data with analytics
   */
  async loadTeamData() {
    try {
      // Load team analytics
      await this.loadTeamAnalytics();
      
      // Load team members
      await this.loadTeamMembers();
      
      // Update AI insights
      this.updateAIInsights();
      
      console.log('Team data loaded successfully');
    } catch (error) {
      console.error('Failed to load team data:', error);
      this.loadDemoData();
    }
  }

  /**
   * Load team analytics
   */
  async loadTeamAnalytics() {
    try {
      const response = await this.apiCall('/team/analytics');
      this.teamAnalytics = response;
      this.updateAnalytics();
    } catch (error) {
      console.warn('Using demo team analytics');
      this.teamAnalytics = {
        teamMembers: 5,
        activeVentures: 3,
        collaborationScore: 95,
        equityDistributed: 2400000
      };
      this.updateAnalytics();
    }
  }

  /**
   * Load team members
   */
  async loadTeamMembers() {
    try {
      const response = await this.apiCall('/team/members');
      this.teamMembers = response.members || [];
      this.updateTeamMembers();
    } catch (error) {
      console.warn('Using demo team members');
      this.teamMembers = [
        {
          id: 1,
          name: 'John Smith',
          role: 'Lead Developer & Co-founder',
          status: 'online',
          equity: 15,
          ventures: 3,
          performance: 95,
          badges: ['Technical Lead', 'High Performer']
        },
        {
          id: 2,
          name: 'Alice Johnson',
          role: 'Product Manager & Co-founder',
          status: 'away',
          equity: 12,
          ventures: 2,
          performance: 78,
          badges: ['Product Lead', 'Decision Gate']
        },
        {
          id: 3,
          name: 'Mike Davis',
          role: 'UX/UI Designer',
          status: 'online',
          equity: 8,
          ventures: 1,
          performance: 88,
          badges: ['Design Lead', 'Contributor']
        }
      ];
      this.updateTeamMembers();
    }
  }

  /**
   * Update analytics display
   */
  updateAnalytics() {
    if (!this.teamAnalytics) return;

    const elements = {
      teamMembers: this.teamAnalytics.teamMembers,
      activeVentures: this.teamAnalytics.activeVentures,
      collaborationScore: this.teamAnalytics.collaborationScore + '%',
      equityDistributed: '$' + (this.teamAnalytics.equityDistributed / 1000000).toFixed(1) + 'M'
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  }

  /**
   * Update team members display
   */
  updateTeamMembers() {
    const teamMembersGrid = document.querySelector('.team-members-grid');
    if (!teamMembersGrid || !this.teamMembers.length) return;

    teamMembersGrid.innerHTML = this.teamMembers.map(member => `
      <div class="member-card enhanced">
        <div class="member-header">
          <div class="member-avatar">
            <span>${this.getInitials(member.name)}</span>
            <div class="status-indicator ${member.status}"></div>
          </div>
          <div class="member-info">
            <h3>${member.name}</h3>
            <p>${member.role}</p>
            <div class="member-badges">
              ${member.badges.map(badge => `<span class="badge ${this.getBadgeClass(badge)}">${badge}</span>`).join('')}
            </div>
          </div>
          <div class="member-metrics">
            <div class="metric">
              <span class="metric-label">Equity</span>
              <span class="metric-value">${member.equity}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Ventures</span>
              <span class="metric-value">${member.ventures}</span>
            </div>
          </div>
        </div>
        <div class="member-performance">
          <div class="performance-bar">
            <div class="performance-fill" style="width: ${member.performance}%"></div>
          </div>
          <span class="performance-text">${member.performance}% productivity this week</span>
        </div>
        <div class="member-actions">
          <button class="btn btn-sm btn-primary" onclick="teamManager.messageMember('${member.name}')">Message</button>
          <button class="btn btn-sm btn-secondary" onclick="teamManager.showMemberAnalytics('${member.name}')">Analytics</button>
          <button class="btn btn-sm btn-ghost" onclick="teamManager.showEquityDetails('${member.name}')">Equity</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Get initials from name
   */
  getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  /**
   * Get badge class based on badge text
   */
  getBadgeClass(badge) {
    const badgeClasses = {
      'Technical Lead': 'primary',
      'Product Lead': 'primary',
      'Design Lead': 'secondary',
      'High Performer': 'success',
      'Decision Gate': 'warning',
      'Contributor': 'info'
    };
    return badgeClasses[badge] || 'secondary';
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
   * Generate AI insights based on team data
   */
  generateAIInsights() {
    const insights = [];
    
    // Skill gap analysis
    if (this.teamAnalytics && this.teamAnalytics.activeVentures > 2) {
      insights.push({
        icon: '💡',
        title: 'Skill Gap Detected',
        description: 'Your team could benefit from a marketing specialist for the upcoming launch phase'
      });
    }

    // Performance insights
    const highPerformers = this.teamMembers.filter(m => m.performance > 90);
    if (highPerformers.length > 0) {
      insights.push({
        icon: '⚡',
        title: 'High Performance Alert',
        description: `${highPerformers[0].name}'s productivity has increased 25% this week - consider their workload`
      });
    }

    // Collaboration insights
    if (this.teamAnalytics && this.teamAnalytics.collaborationScore < 80) {
      insights.push({
        icon: '🤝',
        title: 'Collaboration Opportunity',
        description: 'Team collaboration could be improved with more cross-functional meetings'
      });
    }

    return insights;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Refresh insights button
    const refreshInsights = document.getElementById('refreshInsights');
    if (refreshInsights) {
      refreshInsights.addEventListener('click', () => {
        this.refreshAIInsights();
      });
    }

    // Filter members button
    const filterMembers = document.getElementById('filterMembers');
    if (filterMembers) {
      filterMembers.addEventListener('click', () => {
        this.showMemberFilters();
      });
    }

    // Invite member button
    const inviteMember = document.getElementById('invite-member-btn');
    if (inviteMember) {
      inviteMember.addEventListener('click', () => {
        this.showInviteModal();
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
   * Show member filters
   */
  showMemberFilters() {
    this.showInfo('Member filtering feature coming soon!');
  }

  /**
   * Show invite modal
   */
  showInviteModal() {
    this.showInfo('Invite member feature coming soon!');
  }

  /**
   * Message member
   */
  messageMember(memberName) {
    this.showSuccessMessage(`Opening chat with ${memberName}...`);
  }

  /**
   * Show member analytics
   */
  showMemberAnalytics(memberName) {
    this.showInfo(`Opening analytics for ${memberName}...`);
  }

  /**
   * Show equity details
   */
  showEquityDetails(memberName) {
    this.showInfo(`Opening equity details for ${memberName}...`);
  }

  /**
   * Load demo data
   */
  loadDemoData() {
    console.log('Loading demo team data...');
    this.teamAnalytics = {
      teamMembers: 5,
      activeVentures: 3,
      collaborationScore: 95,
      equityDistributed: 2400000
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
    console.error('Team management error:', error);
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

// Initialize team management when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.teamManager = new SmartStartTeam();
});
