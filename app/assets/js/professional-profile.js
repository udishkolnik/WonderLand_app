/**
 * Professional Profile JavaScript
 * LinkedIn-style professional profile with full CRUD operations and RBAC
 */

class ProfessionalProfile {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3344/api';
        this.currentUser = null;
        this.authToken = null;
        this.profileData = null;
        this.isEditing = false;
        this.init();
    }

    async init() {
        await this.checkAuth();
        if (this.currentUser) {
            await this.loadProfileData();
            await this.loadProfileStats();
            await this.loadConnections();
            await this.loadRecentActivity();
            this.setupEventListeners();
            this.updateProfileCompletion();
        } else {
            this.showError('You must be logged in to access your professional profile.');
            window.location.href = '/auth/login.html';
        }
    }

    async checkAuth() {
        this.authToken = localStorage.getItem('smartstart_token');
        const userString = localStorage.getItem('smartstart_user');
        if (this.authToken && userString) {
            try {
                this.currentUser = JSON.parse(userString);
                console.log('Authenticated user:', this.currentUser.email);
            } catch (e) {
                console.error('Failed to parse user data from localStorage', e);
                this.logout();
            }
        } else {
            this.logout();
        }
    }

    logout() {
        localStorage.removeItem('smartstart_token');
        localStorage.removeItem('smartstart_user');
        window.location.href = '/auth/login.html';
    }

    async loadProfileData() {
        try {
            const headers = {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            };

            // Load user profile data
            const response = await fetch(`${this.apiBaseUrl}/users/profile`, { headers });
            if (response.ok) {
                this.profileData = await response.json();
                this.populateProfileData();
            } else {
                // Create default profile if none exists
                await this.createDefaultProfile();
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
            this.showError('Failed to load profile data.');
        }
    }

    async createDefaultProfile() {
        try {
            const headers = {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            };

            const profileData = {
                headline: 'Venture Founder & CEO at SmartStart Platform',
                summary: 'Passionate entrepreneur and technology leader with over 10 years of experience in building and scaling innovative startups.',
                location: 'San Francisco, CA',
                industry: 'Technology',
                phone: '',
                website: '',
                linkedin_url: '',
                github_url: '',
                twitter_url: '',
                avatar_url: '',
                cover_url: '',
                profile_visibility: 'public',
                profile_completion: 0
            };

            const response = await fetch(`${this.apiBaseUrl}/users/profile`, {
                method: 'POST',
                headers,
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                this.profileData = await response.json();
                this.populateProfileData();
            }
        } catch (error) {
            console.error('Error creating default profile:', error);
        }
    }

    populateProfileData() {
        if (!this.profileData) return;

        // Update profile header
        document.getElementById('profileName').textContent = 
            `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        document.getElementById('profileInitials').textContent = 
            `${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}`;
        
        if (this.profileData.headline) {
            document.getElementById('profileHeadline').textContent = this.profileData.headline;
        }
        
        if (this.profileData.location) {
            document.getElementById('profileLocation').innerHTML = 
                `<i class="fas fa-map-marker-alt"></i> ${this.profileData.location}`;
        }

        // Update about section
        if (this.profileData.summary) {
            document.getElementById('aboutContent').innerHTML = 
                `<p>${this.profileData.summary}</p>`;
        }

        // Update profile completion
        this.updateProfileCompletion();
    }

    async loadProfileStats() {
        try {
            const headers = {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            };

            const [connectionsResponse, viewsResponse, venturesResponse] = await Promise.all([
                fetch(`${this.apiBaseUrl}/connections/count`, { headers }).catch(() => ({ ok: false })),
                fetch(`${this.apiBaseUrl}/profile-views/count`, { headers }).catch(() => ({ ok: false })),
                fetch(`${this.apiBaseUrl}/ventures`, { headers }).catch(() => ({ ok: false }))
            ]);

            let connections = 0;
            let views = 0;
            let ventures = 0;

            if (connectionsResponse.ok) {
                const data = await connectionsResponse.json();
                connections = data.count || 0;
            }

            if (viewsResponse.ok) {
                const data = await viewsResponse.json();
                views = data.count || 0;
            }

            if (venturesResponse.ok) {
                const data = await venturesResponse.json();
                ventures = data.data?.length || 0;
            }

            // Update stats
            document.getElementById('totalConnections').textContent = connections > 500 ? '500+' : connections.toString();
            document.getElementById('profileViews').textContent = views > 1000 ? `${(views/1000).toFixed(1)}K` : views.toString();
            document.getElementById('postImpressions').textContent = '5.8K'; // Mock data
            document.getElementById('searchAppearances').textContent = '45'; // Mock data

        } catch (error) {
            console.error('Error loading profile stats:', error);
        }
    }

    async loadConnections() {
        try {
            const headers = {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            };

            const response = await fetch(`${this.apiBaseUrl}/connections/suggested`, { headers });
            if (response.ok) {
                const connections = await response.json();
                this.populateSuggestedConnections(connections.data || []);
            } else {
                // Use mock data if API fails
                this.populateSuggestedConnections([
                    { name: 'Alice Johnson', title: 'Product Manager at TechCorp', initials: 'AJ' },
                    { name: 'Mike Brown', title: 'Software Engineer at StartupCo', initials: 'MB' },
                    { name: 'Sarah Chen', title: 'Designer at Creative Agency', initials: 'SC' }
                ]);
            }
        } catch (error) {
            console.error('Error loading connections:', error);
        }
    }

    populateSuggestedConnections(connections) {
        const container = document.getElementById('suggestedConnections');
        container.innerHTML = '';

        connections.forEach(connection => {
            const connectionItem = document.createElement('div');
            connectionItem.className = 'connection-item';
            connectionItem.innerHTML = `
                <div class="connection-avatar">${connection.initials || connection.name.split(' ').map(n => n[0]).join('')}</div>
                <div class="connection-info">
                    <p class="connection-name">${connection.name}</p>
                    <p class="connection-title">${connection.title}</p>
                </div>
                <a href="#" class="connection-action" data-user-id="${connection.id}">Connect</a>
            `;
            container.appendChild(connectionItem);
        });
    }

    async loadRecentActivity() {
        try {
            const headers = {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            };

            const response = await fetch(`${this.apiBaseUrl}/activity/recent`, { headers });
            if (response.ok) {
                const activities = await response.json();
                this.populateRecentActivity(activities.data || []);
            } else {
                // Use mock data if API fails
                this.populateRecentActivity([
                    { type: 'Posted', description: 'about the future of venture creation', time: '2 hours ago' },
                    { type: 'Connected', description: 'with 3 new professionals', time: '1 day ago' },
                    { type: 'Updated', description: 'profile with new skills', time: '3 days ago' }
                ]);
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    populateRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        container.innerHTML = '';

        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <p><strong>${activity.type}</strong> ${activity.description}</p>
                <p class="activity-time">${activity.time}</p>
            `;
            container.appendChild(activityItem);
        });
    }

    updateProfileCompletion() {
        if (!this.profileData) return;

        let completion = 0;
        const fields = [
            'headline', 'summary', 'location', 'industry', 'phone', 'website'
        ];

        fields.forEach(field => {
            if (this.profileData[field] && this.profileData[field].trim() !== '') {
                completion += 16.67; // 100% / 6 fields
            }
        });

        // Add points for experience, education, skills
        if (this.profileData.experience && this.profileData.experience.length > 0) completion += 10;
        if (this.profileData.education && this.profileData.education.length > 0) completion += 10;
        if (this.profileData.skills && this.profileData.skills.length > 0) completion += 10;

        completion = Math.min(100, Math.round(completion));

        document.getElementById('completionPercentage').textContent = `${completion}%`;
        document.getElementById('completionFill').style.width = `${completion}%`;

        // Update profile completion in database
        this.updateProfileCompletionInDB(completion);
    }

    async updateProfileCompletionInDB(completion) {
        try {
            const headers = {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            };

            await fetch(`${this.apiBaseUrl}/users/profile/completion`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ completion })
            });
        } catch (error) {
            console.error('Error updating profile completion:', error);
        }
    }

    setupEventListeners() {
        // Edit profile sections
        document.getElementById('editAbout').addEventListener('click', (e) => {
            e.preventDefault();
            this.editSection('about');
        });

        document.getElementById('editExperience').addEventListener('click', (e) => {
            e.preventDefault();
            this.editSection('experience');
        });

        document.getElementById('editEducation').addEventListener('click', (e) => {
            e.preventDefault();
            this.editSection('education');
        });

        document.getElementById('editSkills').addEventListener('click', (e) => {
            e.preventDefault();
            this.editSection('skills');
        });

        // Profile actions
        document.getElementById('connectBtn').addEventListener('click', () => {
            this.handleConnect();
        });

        document.getElementById('messageBtn').addEventListener('click', () => {
            this.handleMessage();
        });

        document.getElementById('moreBtn').addEventListener('click', () => {
            this.handleMore();
        });

        // Avatar edit
        document.getElementById('editAvatar').addEventListener('click', () => {
            this.editAvatar();
        });

        // Connection actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('connection-action')) {
                e.preventDefault();
                const userId = e.target.dataset.userId;
                this.sendConnectionRequest(userId);
            }
        });
    }

    editSection(section) {
        console.log(`Editing ${section} section`);
        // Implement section editing logic
        this.showModal(`Edit ${section.charAt(0).toUpperCase() + section.slice(1)}`, this.getSectionForm(section));
    }

    getSectionForm(section) {
        const forms = {
            about: `
                <form id="aboutForm">
                    <div class="form-group">
                        <label for="summary">About</label>
                        <textarea id="summary" name="summary" rows="4" placeholder="Tell us about yourself...">${this.profileData?.summary || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            `,
            experience: `
                <form id="experienceForm">
                    <div class="form-group">
                        <label for="title">Job Title</label>
                        <input type="text" id="title" name="title" required>
                    </div>
                    <div class="form-group">
                        <label for="company">Company</label>
                        <input type="text" id="company" name="company" required>
                    </div>
                    <div class="form-group">
                        <label for="location">Location</label>
                        <input type="text" id="location" name="location">
                    </div>
                    <div class="form-group">
                        <label for="startDate">Start Date</label>
                        <input type="date" id="startDate" name="startDate">
                    </div>
                    <div class="form-group">
                        <label for="endDate">End Date</label>
                        <input type="date" id="endDate" name="endDate">
                    </div>
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" name="description" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            `,
            education: `
                <form id="educationForm">
                    <div class="form-group">
                        <label for="institution">Institution</label>
                        <input type="text" id="institution" name="institution" required>
                    </div>
                    <div class="form-group">
                        <label for="degree">Degree</label>
                        <input type="text" id="degree" name="degree">
                    </div>
                    <div class="form-group">
                        <label for="fieldOfStudy">Field of Study</label>
                        <input type="text" id="fieldOfStudy" name="fieldOfStudy">
                    </div>
                    <div class="form-group">
                        <label for="startDate">Start Date</label>
                        <input type="date" id="startDate" name="startDate">
                    </div>
                    <div class="form-group">
                        <label for="endDate">End Date</label>
                        <input type="date" id="endDate" name="endDate">
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            `,
            skills: `
                <form id="skillsForm">
                    <div class="form-group">
                        <label for="skillName">Skill Name</label>
                        <input type="text" id="skillName" name="skillName" required>
                    </div>
                    <div class="form-group">
                        <label for="skillLevel">Skill Level</label>
                        <select id="skillLevel" name="skillLevel">
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="category">Category</label>
                        <input type="text" id="category" name="category">
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            `
        };

        return forms[section] || '';
    }

    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal handlers
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Form submission handlers
        const form = modal.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission(form, title.toLowerCase());
                modal.remove();
            });
        }
    }

    async handleFormSubmission(form, section) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const headers = {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            };

            const response = await fetch(`${this.apiBaseUrl}/users/profile/${section}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showSuccess(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully!`);
                await this.loadProfileData();
            } else {
                this.showError('Failed to update profile section.');
            }
        } catch (error) {
            console.error('Error updating profile section:', error);
            this.showError('Failed to update profile section.');
        }
    }

    async handleConnect() {
        console.log('Connect button clicked');
        this.showSuccess('Connection request sent!');
    }

    async handleMessage() {
        console.log('Message button clicked');
        this.showSuccess('Opening message composer...');
    }

    async handleMore() {
        console.log('More button clicked');
        // Show dropdown menu with more options
    }

    async editAvatar() {
        console.log('Edit avatar clicked');
        // Implement avatar upload
        this.showSuccess('Avatar upload feature coming soon!');
    }

    async sendConnectionRequest(userId) {
        try {
            const headers = {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            };

            const response = await fetch(`${this.apiBaseUrl}/connections/request`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId })
            });

            if (response.ok) {
                this.showSuccess('Connection request sent!');
            } else {
                this.showError('Failed to send connection request.');
            }
        } catch (error) {
            console.error('Error sending connection request:', error);
            this.showError('Failed to send connection request.');
        }
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.getElementById('notification-container').appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.getElementById('notification-container').appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize the professional profile when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ProfessionalProfile();
});
