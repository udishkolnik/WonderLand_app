/**
 * Header Loader System
 * Loads appropriate header based on page type (public website vs private app)
 */

class HeaderLoader {
    constructor() {
        this.isAppPage = this.detectAppPage();
        this.init();
    }

    detectAppPage() {
        // Check if this is an app page (requires authentication)
        const appPages = [
            'dashboard.html',
            'ventures.html',
            'team.html',
            'profile-settings.html',
            'subscription-management.html',
            'settings.html',
            'notifications.html',
            'help.html'
        ];
        
        const currentPage = window.location.pathname.split('/').pop();
        return appPages.includes(currentPage) || window.location.pathname.includes('/app/');
    }

    init() {
        if (this.isAppPage) {
            this.loadAppHeader();
        } else {
            this.loadPublicHeader();
        }
    }

    async loadAppHeader() {
        try {
            const response = await fetch('header-app.html');
            const headerHtml = await response.text();
            
            const headerContainer = document.getElementById('app-header') || 
                                 document.getElementById('global-header') ||
                                 document.querySelector('body');
            
            if (headerContainer) {
                headerContainer.innerHTML = headerHtml;
                this.initializeAppHeader();
            }
        } catch (error) {
            console.error('Error loading app header:', error);
            this.loadFallbackHeader();
        }
    }

    async loadPublicHeader() {
        try {
            const response = await fetch('header-public.html');
            const headerHtml = await response.text();
            
            const headerContainer = document.getElementById('public-header') || 
                                 document.getElementById('global-header') ||
                                 document.querySelector('body');
            
            if (headerContainer) {
                headerContainer.innerHTML = headerHtml;
                this.initializePublicHeader();
            }
        } catch (error) {
            console.error('Error loading public header:', error);
            this.loadFallbackHeader();
        }
    }

    initializeAppHeader() {
        // Initialize user menu
        const userMenuToggle = document.getElementById('user-menu-toggle');
        const userDropdown = document.getElementById('user-dropdown');
        const userName = document.getElementById('user-name');

        if (userMenuToggle && userDropdown) {
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }

        // Set user name
        if (userName) {
            const userInfo = this.getUserInfo();
            if (userInfo) {
                userName.textContent = userInfo.firstName || userInfo.name || 'User';
            }
        }

        // Handle logout
        const logoutLink = document.querySelector('.logout');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    initializePublicHeader() {
        // Initialize public header functionality
        console.log('Public header initialized');
    }

    getUserInfo() {
        try {
            const user = localStorage.getItem('smartstart_user');
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.error('Error parsing user info:', error);
            return null;
        }
    }

    logout() {
        localStorage.removeItem('smartstart_user');
        localStorage.removeItem('smartstart_token');
        window.location.href = 'auth/login.html';
    }

    loadFallbackHeader() {
        // Fallback header if loading fails
        const fallbackHeader = `
            <nav class="navbar fallback-navbar">
                <div class="nav-container">
                    <div class="nav-brand">
                        <a href="/" class="nav-logo">
                            <span class="logo-text">SmartStart</span>
                            <span class="logo-subtitle">Platform</span>
                        </a>
                    </div>
                    <div class="nav-menu">
                        <a href="/" class="nav-link">Home</a>
                        <a href="/auth/login.html" class="nav-link">Login</a>
                    </div>
                </div>
            </nav>
        `;
        
        const headerContainer = document.getElementById('app-header') || 
                             document.getElementById('public-header') ||
                             document.getElementById('global-header');
        
        if (headerContainer) {
            headerContainer.innerHTML = fallbackHeader;
        }
    }
}

// Initialize header loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new HeaderLoader();
});
