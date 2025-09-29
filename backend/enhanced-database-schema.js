#!/usr/bin/env node

/**
 * Enhanced Database Schema for Professional LinkedIn-style Profiles
 * Adds professional fields to support comprehensive user profiles
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class EnhancedDatabaseSchema {
    constructor() {
        this.dbPath = path.join(__dirname, 'data/smartstart.db');
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    resolve();
                }
            });
        });
    }

    async createProfessionalTables() {
        console.log('🔧 Creating professional profile tables...');

        const tables = [
            // Professional Profile Table
            `CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                headline TEXT,
                summary TEXT,
                location TEXT,
                industry TEXT,
                experience_level TEXT,
                availability_status TEXT DEFAULT 'available',
                profile_visibility TEXT DEFAULT 'public',
                profile_completion INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id)
            )`,

            // Professional Experience Table
            `CREATE TABLE IF NOT EXISTS professional_experience (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                location TEXT,
                employment_type TEXT DEFAULT 'full-time',
                start_date DATE,
                end_date DATE,
                is_current BOOLEAN DEFAULT 0,
                description TEXT,
                achievements TEXT,
                skills TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id)
            )`,

            // Education Table
            `CREATE TABLE IF NOT EXISTS education (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                institution TEXT NOT NULL,
                degree TEXT,
                field_of_study TEXT,
                start_date DATE,
                end_date DATE,
                grade TEXT,
                activities TEXT,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id)
            )`,

            // Skills Table
            `CREATE TABLE IF NOT EXISTS skills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                skill_name TEXT NOT NULL,
                skill_level TEXT DEFAULT 'intermediate',
                endorsements INTEGER DEFAULT 0,
                category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id)
            )`,

            // Certifications Table
            `CREATE TABLE IF NOT EXISTS certifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                name TEXT NOT NULL,
                issuing_organization TEXT,
                issue_date DATE,
                expiry_date DATE,
                credential_id TEXT,
                credential_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id)
            )`,

            // Projects Table
            `CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                url TEXT,
                start_date DATE,
                end_date DATE,
                technologies TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id)
            )`,

            // Social Links Table
            `CREATE TABLE IF NOT EXISTS social_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                platform TEXT NOT NULL,
                url TEXT NOT NULL,
                is_primary BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id)
            )`,

            // Recommendations Table
            `CREATE TABLE IF NOT EXISTS recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                recommender_id INTEGER NOT NULL,
                relationship TEXT,
                recommendation_text TEXT,
                is_public BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id),
                FOREIGN KEY (recommender_id) REFERENCES users (id)
            )`,

            // Connections Table
            `CREATE TABLE IF NOT EXISTS connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                connected_user_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                connection_type TEXT DEFAULT 'professional',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (connected_user_id) REFERENCES users (id)
            )`,

            // Endorsements Table
            `CREATE TABLE IF NOT EXISTS endorsements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                skill_id INTEGER NOT NULL,
                endorser_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (skill_id) REFERENCES skills (id),
                FOREIGN KEY (endorser_id) REFERENCES users (id)
            )`,

            // Profile Views Table
            `CREATE TABLE IF NOT EXISTS profile_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_user_id INTEGER NOT NULL,
                viewer_id INTEGER,
                view_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (profile_user_id) REFERENCES users (id),
                FOREIGN KEY (viewer_id) REFERENCES users (id)
            )`
        ];

        for (const table of tables) {
            await this.runQuery(table);
        }

        console.log('✅ Professional profile tables created successfully');
    }

    async addProfessionalFieldsToUsers() {
        console.log('🔧 Adding professional fields to users table...');

        const alterQueries = [
            'ALTER TABLE users ADD COLUMN headline TEXT',
            'ALTER TABLE users ADD COLUMN summary TEXT',
            'ALTER TABLE users ADD COLUMN location TEXT',
            'ALTER TABLE users ADD COLUMN industry TEXT',
            'ALTER TABLE users ADD COLUMN phone TEXT',
            'ALTER TABLE users ADD COLUMN website TEXT',
            'ALTER TABLE users ADD COLUMN linkedin_url TEXT',
            'ALTER TABLE users ADD COLUMN github_url TEXT',
            'ALTER TABLE users ADD COLUMN twitter_url TEXT',
            'ALTER TABLE users ADD COLUMN avatar_url TEXT',
            'ALTER TABLE users ADD COLUMN cover_url TEXT',
            'ALTER TABLE users ADD COLUMN profile_visibility TEXT DEFAULT "public"',
            'ALTER TABLE users ADD COLUMN profile_completion INTEGER DEFAULT 0'
        ];

        for (const query of alterQueries) {
            try {
                await this.runQuery(query);
            } catch (error) {
                // Column might already exist, continue
                console.log(`Column might already exist: ${query}`);
            }
        }

        console.log('✅ Professional fields added to users table');
    }

    async runQuery(query) {
        return new Promise((resolve, reject) => {
            this.db.run(query, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async close() {
        if (this.db) {
            this.db.close();
        }
    }

    async run() {
        try {
            await this.initialize();
            await this.addProfessionalFieldsToUsers();
            await this.createProfessionalTables();
            console.log('🎉 Enhanced database schema created successfully!');
        } catch (error) {
            console.error('❌ Error creating enhanced database schema:', error);
        } finally {
            await this.close();
        }
    }
}

// Run the enhanced database schema creation
if (require.main === module) {
    const schema = new EnhancedDatabaseSchema();
    schema.run();
}

module.exports = EnhancedDatabaseSchema;
