/**
 * Simple SmartStart Database - localStorage only
 * No WebAssembly dependencies
 */

class SimpleSmartStartDatabase {
  constructor() {
    this.storageKey = 'smartstart_database';
    this.init();
  }

  init() {
    // Initialize localStorage structure
    if (!localStorage.getItem(this.storageKey)) {
      const initialData = {
        users: [],
        profiles: [],
        ventures: [],
        userJourneys: [],
        journeyMilestones: [],
        teamCollaborations: [],
        feedbackReviews: [],
        nextUserId: 1,
        nextVentureId: 1,
        nextJourneyId: 1
      };
      localStorage.setItem(this.storageKey, JSON.stringify(initialData));
    }
    console.log('Simple database initialized successfully');
  }

  // Get all data
  getData() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : null;
  }

  // Save all data
  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // User management
  async registerUser(userData) {
    try {
      const data = this.getData();
      if (!data) throw new Error('Database not initialized');

      // Check if user already exists
      const existingUser = data.users.find((user) => user.email === userData.email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Validate input
      if (!this.isValidEmail(userData.email)) {
        throw new Error('Invalid email format');
      }

      if (!this.isStrongPassword(userData.password)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      }

      // Create new user
      const newUser = {
        id: data.nextUserId++,
        email: userData.email,
        password_hash: this.hashPassword(userData.password),
        first_name: userData.firstName || '',
        last_name: userData.lastName || '',
        company: userData.company || '',
        role: 'member',
        subscription_status: 'free',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      data.users.push(newUser);
      this.saveData(data);

      // Create user profile
      const newProfile = {
        id: newUser.id,
        user_id: newUser.id,
        bio: '',
        skills: [],
        interests: [],
        experience_level: 'beginner',
        availability: 'part-time',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      data.profiles.push(newProfile);
      this.saveData(data);

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          company: newUser.company,
          role: newUser.role,
          subscription_status: newUser.subscription_status
        }
      };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async loginUser(email, password) {
    try {
      const data = this.getData();
      if (!data) throw new Error('Database not initialized');

      // Find user
      const user = data.users.find((u) => u.email === email && u.is_active);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      if (!this.verifyPassword(password, user.password_hash)) {
        throw new Error('Invalid email or password');
      }

      // Create session
      const sessionId = this.generateSessionId();
      this.setSession(sessionId, user.id);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          company: user.company,
          role: user.role,
          subscription_status: user.subscription_status
        },
        sessionId
      };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Password utilities
  hashPassword(password) {
    // Simple hash function (in production, use bcrypt or similar)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  verifyPassword(password, hash) {
    return this.hashPassword(password) === hash;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isStrongPassword(password) {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[^A-Za-z0-9]/.test(password)) return false;
    return true;
  }

  // Session management
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setSession(sessionId, userId) {
    localStorage.setItem('smartstart_session', JSON.stringify({
      sessionId,
      userId,
      createdAt: new Date().toISOString()
    }));
  }

  getSession() {
    const session = localStorage.getItem('smartstart_session');
    return session ? JSON.parse(session) : null;
  }

  clearSession() {
    localStorage.removeItem('smartstart_session');
  }

  // User data methods
  async getUserById(userId) {
    const data = this.getData();
    return data.users.find((user) => user.id === userId);
  }

  async getUserByEmail(email) {
    const data = this.getData();
    return data.users.find((user) => user.email === email);
  }

  // Journey tracking
  async createUserJourney(userId, journeyData) {
    const data = this.getData();
    const newJourney = {
      id: data.nextJourneyId++,
      user_id: userId,
      title: journeyData.title || 'My Journey',
      description: journeyData.description || '',
      status: 'active',
      current_stage: 'discovery',
      progress_percentage: 0,
      start_date: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      milestones: [],
      notes: []
    };

    data.userJourneys.push(newJourney);
    this.saveData(data);
    return newJourney;
  }

  async updateJourneyProgress(journeyId, progress) {
    const data = this.getData();
    const journey = data.userJourneys.find((j) => j.id === journeyId);
    if (journey) {
      journey.progress_percentage = progress.percentage;
      journey.current_stage = progress.stage;
      journey.last_updated = new Date().toISOString();
      this.saveData(data);
      return journey;
    }
    return null;
  }

  async getUserJourneys(userId) {
    const data = this.getData();
    return data.userJourneys.filter((journey) => journey.user_id === userId);
  }

  // Statistics
  async getStatistics() {
    const data = this.getData();
    return {
      totalUsers: data.users.length,
      activeUsers: data.users.filter((u) => u.is_active).length,
      totalVentures: data.ventures.length,
      activeJourneys: data.userJourneys.filter((j) => j.status === 'active').length,
      completedJourneys: data.userJourneys.filter((j) => j.status === 'completed').length
    };
  }

  // Export/Import
  exportData() {
    return this.getData();
  }

  importData(importedData) {
    this.saveData(importedData);
    return true;
  }
}

// Global instance
window.SimpleSmartStartDatabase = SimpleSmartStartDatabase;
