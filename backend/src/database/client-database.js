// Client-side database for SmartStart Platform
// Fallback database for offline functionality

class ClientDatabase {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      // Check if SQL.js is available
      if (typeof initSqlJs !== 'undefined') {
        // Load SQL.js from local files
        const SQL = await initSqlJs({
          locateFile: (file) => `database/${file}`
        });

        // Create or load database
        const savedDb = localStorage.getItem('smartstart_client_db');
        if (savedDb) {
          const data = new Uint8Array(JSON.parse(savedDb));
          this.db = new SQL.Database(data);
        } else {
          this.db = new SQL.Database();
          this.createTables();
        }

        this.isInitialized = true;
        console.log('Client database initialized successfully');
      } else {
        // Fallback to localStorage-only storage
        this.initLocalStorage();
      }
    } catch (error) {
      console.error('Client database initialization failed:', error);
      // Fallback to localStorage-only storage
      this.initLocalStorage();
    }
  }

  initLocalStorage() {
    this.isInitialized = true;
    console.log('Using localStorage fallback for client database');
  }

  createTables() {
    if (!this.db) return;

    // Users table
    this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                company TEXT,
                role TEXT DEFAULT 'member',
                subscription_status TEXT DEFAULT 'trial',
                subscription_start DATE,
                subscription_end DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        `);

    // User profiles table
    this.db.run(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                bio TEXT,
                skills TEXT,
                experience_level TEXT,
                interests TEXT,
                avatar_url TEXT,
                linkedin_url TEXT,
                github_url TEXT,
                portfolio_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

    // Ventures table
    this.db.run(`
            CREATE TABLE IF NOT EXISTS ventures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                problem_statement TEXT,
                target_market TEXT,
                status TEXT DEFAULT 'idea',
                stage TEXT DEFAULT 'discovery',
                founder_id INTEGER NOT NULL,
                team_members TEXT,
                equity_distribution TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (founder_id) REFERENCES users (id)
            )
        `);

    // User journeys table
    this.db.run(`
            CREATE TABLE IF NOT EXISTS user_journeys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                venture_id INTEGER,
                stage TEXT NOT NULL,
                stage_data TEXT,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (venture_id) REFERENCES ventures (id)
            )
        `);

    // Journey milestones table
    this.db.run(`
            CREATE TABLE IF NOT EXISTS journey_milestones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                journey_id INTEGER NOT NULL,
                milestone_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                completed BOOLEAN DEFAULT 0,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (journey_id) REFERENCES user_journeys (id)
            )
        `);

    // Team collaborations table
    this.db.run(`
            CREATE TABLE IF NOT EXISTS team_collaborations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venture_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                equity_percentage REAL,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'active',
                FOREIGN KEY (venture_id) REFERENCES ventures (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

    // Feedback and reviews table
    this.db.run(`
            CREATE TABLE IF NOT EXISTS feedback_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venture_id INTEGER NOT NULL,
                reviewer_id INTEGER NOT NULL,
                rating INTEGER,
                feedback_text TEXT,
                feedback_type TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (venture_id) REFERENCES ventures (id),
                FOREIGN KEY (reviewer_id) REFERENCES users (id)
            )
        `);

    this.saveDatabase();
  }

  // User management methods
  async createUser(userData) {
    if (!this.db) {
      return this.createUserLocalStorage(userData);
    }

    try {
      const {
        email, password_hash, first_name, last_name, company
      } = userData;
      const stmt = this.db.prepare(`
                INSERT INTO users (email, password_hash, first_name, last_name, company)
                VALUES (?, ?, ?, ?, ?)
            `);
      stmt.run([email, password_hash, first_name, last_name, company]);
      this.saveDatabase();
      return { success: true, userId: this.db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getUserByEmail(email) {
    if (!this.db) {
      return this.getUserByEmailLocalStorage(email);
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
      const result = stmt.get([email]);
      return result || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async updateUser(userId, updateData) {
    if (!this.db) {
      return this.updateUserLocalStorage(userId, updateData);
    }

    try {
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map((field) => `${field} = ?`).join(', ');

      const stmt = this.db.prepare(`UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
      stmt.run([...values, userId]);
      this.saveDatabase();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Journey tracking methods
  async createUserJourney(userId, ventureId, stage, stageData) {
    if (!this.db) {
      return this.createUserJourneyLocalStorage(userId, ventureId, stage, stageData);
    }

    try {
      const stmt = this.db.prepare(`
                INSERT INTO user_journeys (user_id, venture_id, stage, stage_data, completed_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
      stmt.run([userId, ventureId, stage, JSON.stringify(stageData)]);
      this.saveDatabase();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getUserJourneys(userId) {
    if (!this.db) {
      return this.getUserJourneysLocalStorage(userId);
    }

    try {
      const stmt = this.db.prepare(`
                SELECT uj.*, v.name as venture_name 
                FROM user_journeys uj 
                LEFT JOIN ventures v ON uj.venture_id = v.id 
                WHERE uj.user_id = ? 
                ORDER BY uj.created_at DESC
            `);
      const result = stmt.all([userId]);
      return result.map((journey) => ({
        ...journey,
        stage_data: JSON.parse(journey.stage_data || '{}')
      }));
    } catch (error) {
      console.error('Error getting user journeys:', error);
      return [];
    }
  }

  async getJourneyProgress(userId) {
    if (!this.db) {
      return this.getJourneyProgressLocalStorage(userId);
    }

    try {
      const stmt = this.db.prepare(`
                SELECT stage, COUNT(*) as count, MAX(completed_at) as last_completed
                FROM user_journeys 
                WHERE user_id = ? 
                GROUP BY stage
            `);
      const result = stmt.all([userId]);
      return result;
    } catch (error) {
      console.error('Error getting journey progress:', error);
      return [];
    }
  }

  // Venture management methods
  async createVenture(ventureData) {
    if (!this.db) {
      return this.createVentureLocalStorage(ventureData);
    }

    try {
      const {
        name, description, problem_statement, target_market, founder_id
      } = ventureData;
      const stmt = this.db.prepare(`
                INSERT INTO ventures (name, description, problem_statement, target_market, founder_id)
                VALUES (?, ?, ?, ?, ?)
            `);
      stmt.run([name, description, problem_statement, target_market, founder_id]);
      this.saveDatabase();
      return { success: true, ventureId: this.db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getUserVentures(userId) {
    if (!this.db) {
      return this.getUserVenturesLocalStorage(userId);
    }

    try {
      const stmt = this.db.prepare(`
                SELECT v.*, u.first_name, u.last_name, u.email
                FROM ventures v
                JOIN users u ON v.founder_id = u.id
                WHERE v.founder_id = ?
                ORDER BY v.created_at DESC
            `);
      const result = stmt.all([userId]);
      return result;
    } catch (error) {
      console.error('Error getting user ventures:', error);
      return [];
    }
  }

  // LocalStorage fallback methods
  createUserLocalStorage(userData) {
    try {
      const users = JSON.parse(localStorage.getItem('smartstart_client_users') || '[]');
      const userId = Date.now();
      const newUser = { id: userId, ...userData, created_at: new Date().toISOString() };
      users.push(newUser);
      localStorage.setItem('smartstart_client_users', JSON.stringify(users));
      return { success: true, userId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getUserByEmailLocalStorage(email) {
    try {
      const users = JSON.parse(localStorage.getItem('smartstart_client_users') || '[]');
      return users.find((user) => user.email === email) || null;
    } catch (error) {
      return null;
    }
  }

  updateUserLocalStorage(userId, updateData) {
    try {
      const users = JSON.parse(localStorage.getItem('smartstart_client_users') || '[]');
      const userIndex = users.findIndex((user) => user.id === userId);
      if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updateData, updated_at: new Date().toISOString() };
        localStorage.setItem('smartstart_client_users', JSON.stringify(users));
        return { success: true };
      }
      return { success: false, error: 'User not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  createUserJourneyLocalStorage(userId, ventureId, stage, stageData) {
    try {
      const journeys = JSON.parse(localStorage.getItem('smartstart_client_journeys') || '[]');
      const journeyId = Date.now();
      const newJourney = {
        id: journeyId,
        user_id: userId,
        venture_id: ventureId,
        stage,
        stage_data: stageData,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      journeys.push(newJourney);
      localStorage.setItem('smartstart_client_journeys', JSON.stringify(journeys));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getUserJourneysLocalStorage(userId) {
    try {
      const journeys = JSON.parse(localStorage.getItem('smartstart_client_journeys') || '[]');
      return journeys.filter((journey) => journey.user_id === userId);
    } catch (error) {
      return [];
    }
  }

  getJourneyProgressLocalStorage(userId) {
    try {
      const journeys = JSON.parse(localStorage.getItem('smartstart_client_journeys') || '[]');
      const userJourneys = journeys.filter((journey) => journey.user_id === userId);
      const progress = {};
      userJourneys.forEach((journey) => {
        if (!progress[journey.stage]) {
          progress[journey.stage] = { count: 0, last_completed: journey.completed_at };
        }
        progress[journey.stage].count++;
      });
      return Object.entries(progress).map(([stage, data]) => ({ stage, ...data }));
    } catch (error) {
      return [];
    }
  }

  createVentureLocalStorage(ventureData) {
    try {
      const ventures = JSON.parse(localStorage.getItem('smartstart_client_ventures') || '[]');
      const ventureId = Date.now();
      const newVenture = { id: ventureId, ...ventureData, created_at: new Date().toISOString() };
      ventures.push(newVenture);
      localStorage.setItem('smartstart_client_ventures', JSON.stringify(ventures));
      return { success: true, ventureId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getUserVenturesLocalStorage(userId) {
    try {
      const ventures = JSON.parse(localStorage.getItem('smartstart_client_ventures') || '[]');
      return ventures.filter((venture) => venture.founder_id === userId);
    } catch (error) {
      return [];
    }
  }

  // Utility methods
  hashPassword(password) {
    // Simple hash function - in production, use bcrypt or similar
    return btoa(`${password}smartstart_salt`).substring(0, 64);
  }

  verifyPassword(password, hash) {
    const testHash = this.hashPassword(password);
    return testHash === hash;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isStrongPassword(password) {
    if (password.length < 8) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[^A-Za-z0-9]/.test(password)) return false;
    return true;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setSession(sessionId, userId) {
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
    localStorage.setItem('smartstart_client_session', JSON.stringify(session));
  }

  getSession() {
    try {
      const session = localStorage.getItem('smartstart_client_session');
      if (!session) return null;

      const sessionData = JSON.parse(session);
      if (new Date(sessionData.expiresAt) < new Date()) {
        localStorage.removeItem('smartstart_client_session');
        return null;
      }

      return sessionData;
    } catch (error) {
      return null;
    }
  }

  clearSession() {
    localStorage.removeItem('smartstart_client_session');
  }

  // Database persistence
  saveDatabase() {
    if (this.db) {
      const data = this.db.export();
      localStorage.setItem('smartstart_client_db', JSON.stringify(Array.from(data)));
    }
  }

  // Export database
  exportDatabase() {
    if (this.db) {
      const data = this.db.export();
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smartstart_client_database.sqlite';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // Import database
  async importDatabase(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`
      });
      this.db = new SQL.Database(data);
      this.saveDatabase();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Initialize client database instance
const clientDB = new ClientDatabase();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.clientDB = clientDB;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClientDatabase;
}
