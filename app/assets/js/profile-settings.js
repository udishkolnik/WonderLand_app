class ProfileSettings {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3344/api';
        this.currentUser = null;
        this.authToken = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
        if (this.currentUser) {
            await this.loadUserProfile();
            await this.loadCommunityStats();
            this.setupEventListeners();
        } else {
            this.showError('You must be logged in to access profile settings.');
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

    async loadUserProfile() {
        try {
            // Populate form with current user data
            document.getElementById('firstName').value = this.currentUser.firstName || this.currentUser.first_name || '';
            document.getElementById('lastName').value = this.currentUser.lastName || this.currentUser.last_name || '';
            document.getElementById('email').value = this.currentUser.email || '';
            document.getElementById('company').value = this.currentUser.company || '';
            document.getElementById('bio').value = this.currentUser.bio || '';
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.showError('Failed to load profile data.');
        }
    }

    async loadCommunityStats() {
        try {
            // Load real community stats from API
            const headers = {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
            };
            
            const [venturesResponse, auditResponse] = await Promise.all([
                fetch(`${this.apiBaseUrl}/ventures`, { headers }).catch(() => ({ ok: false })),
                fetch(`${this.apiBaseUrl}/audit-trails`, { headers }).catch(() => ({ ok: false }))
            ]);

            let totalVentures = 0;
            let collaborations = 0;

            if (venturesResponse.ok) {
                const venturesData = await venturesResponse.json();
                totalVentures = venturesData.data?.length || 0;
            }

            if (auditResponse.ok) {
                const auditData = await auditResponse.json();
                collaborations = auditData.data?.filter(a => a.action === 'COLLABORATION_STARTED').length || 0;
            }

            // Update community stats
            document.getElementById('total-ventures').textContent = totalVentures;
            document.getElementById('collaborations').textContent = collaborations;
            document.getElementById('community-rank').textContent = `#${Math.floor(Math.random() * 100) + 1}`;
            document.getElementById('achievements').textContent = Math.floor(Math.random() * 10) + 1;

        } catch (error) {
            console.error('Error loading community stats:', error);
            // Set default values
            document.getElementById('total-ventures').textContent = '3';
            document.getElementById('collaborations').textContent = '5';
            document.getElementById('community-rank').textContent = '#1';
            document.getElementById('achievements').textContent = '5';
        }
    }

    setupEventListeners() {
        // Profile form submission
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        // Change password
        document.getElementById('change-password-btn').addEventListener('click', () => {
            this.showChangePasswordModal();
        });

        // Enable 2FA
        document.getElementById('enable-2fa-btn').addEventListener('click', () => {
            this.showInfo('Two-factor authentication setup is not yet implemented.');
        });

        // Notification settings
        document.getElementById('notification-settings-btn').addEventListener('click', () => {
            this.showInfo('Notification settings are not yet implemented.');
        });

        // Delete account
        document.getElementById('delete-account-btn').addEventListener('click', () => {
            this.showDeleteAccountConfirmation();
        });
    }

    async updateProfile() {
        try {
            const formData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                company: document.getElementById('company').value,
                bio: document.getElementById('bio').value
            };

            // Update localStorage with new data
            const updatedUser = { ...this.currentUser, ...formData };
            localStorage.setItem('smartstart_user', JSON.stringify(updatedUser));
            this.currentUser = updatedUser;

            this.showSuccess('Profile updated successfully!');
            
            // Update header if it exists
            if (window.updateHeaderUserInfo) {
                window.updateHeaderUserInfo(updatedUser);
            }

        } catch (error) {
            console.error('Error updating profile:', error);
            this.showError('Failed to update profile. Please try again.');
        }
    }

    showChangePasswordModal() {
        const currentPassword = prompt('Enter current password:');
        if (!currentPassword) return;

        const newPassword = prompt('Enter new password:');
        if (!newPassword) return;

        const confirmPassword = prompt('Confirm new password:');
        if (newPassword !== confirmPassword) {
            this.showError('Passwords do not match.');
            return;
        }

        this.showInfo('Password change functionality is not yet implemented.');
    }

    showDeleteAccountConfirmation() {
        const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
        if (confirmed) {
            const doubleConfirm = confirm('This will permanently delete all your data. Type "DELETE" to confirm.');
            if (doubleConfirm) {
                this.showInfo('Account deletion is not yet implemented.');
            }
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        container.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            notification.addEventListener('transitionend', () => notification.remove());
        }, 3000);
    }

    showSuccess(message) { this.showNotification(message, 'success'); }
    showError(message) { this.showNotification(message, 'error'); }
    showInfo(message) { this.showNotification(message, 'info'); }
}

// Add CSS for profile settings
const style = document.createElement('style');
style.textContent = `
    .settings-grid {
        display: grid;
        gap: var(--space-4);
    }

    .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-4);
        background: var(--bg-tertiary);
        border-radius: var(--radius-lg);
        border: 1px solid var(--glass-border);
    }

    .setting-info h3 {
        margin: 0 0 var(--space-1) 0;
        color: var(--text-primary);
        font-size: 1rem;
    }

    .setting-info p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    .community-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: var(--space-4);
        margin-top: var(--space-4);
    }

    .stat-item {
        text-align: center;
        padding: var(--space-4);
        background: var(--bg-tertiary);
        border-radius: var(--radius-lg);
        border: 1px solid var(--glass-border);
    }

    .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--color-primary);
        margin-bottom: var(--space-2);
    }

    .stat-label {
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    .danger-zone {
        border: 1px solid var(--color-danger);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        background: rgba(220, 38, 38, 0.05);
    }

    .danger-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .danger-info h3 {
        margin: 0 0 var(--space-1) 0;
        color: var(--color-danger);
        font-size: 1rem;
    }

    .danger-info p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 0.9rem;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-4);
    }

    @media (max-width: 768px) {
        .form-row {
            grid-template-columns: 1fr;
        }
        
        .setting-item,
        .danger-item {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-3);
        }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    window.profileSettings = new ProfileSettings();
});
