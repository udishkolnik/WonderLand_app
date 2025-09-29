// Shared components for the SmartStart webapp

// Prevent duplicate declarations
if (typeof window.SmartStartComponents === 'undefined') {

// Global header HTML
var globalHeader = `
<header class="header" id="header">
    <div class="container">
        <nav class="nav">
            <div class="logo">
                <a href="index.html" style="text-decoration: none; color: inherit;">
                    AliceSolutionsGroup
                </a>
            </div>
            <ul class="nav-links">
                <li><a href="ecosystem.html">Ecosystem</a></li>
                <li><a href="business-model.html">Business Model</a></li>
                <li><a href="venture-funnel.html">Venture Funnel</a></li>
                <li><a href="smartstart.html">SmartStart</a></li>
                <li><a href="pricing.html">Pricing</a></li>
                <li><a href="user-journey/">User Journey</a></li>
            </ul>
            <div class="header-actions">
                <a href="auth/register.html" class="cta-button small primary">Get Started</a>
                <a href="auth/login.html" class="cta-button small secondary">Login</a>
            </div>
        </nav>
    </div>
</header>
`;

// Global footer HTML
const globalFooter = `
<footer class="footer">
    <div class="container">
        <div class="footer-content">
            <div class="footer-section">
                <h3>AliceSolutionsGroup</h3>
                <p>Micro-venture studio transforming practical product ideas into profitable SaaS businesses through structured collaboration and proven methodologies.</p>
            </div>
            <div class="footer-section">
                <h3>Platform</h3>
                <p><a href="ecosystem.html">Ecosystem</a></p>
                <p><a href="business-model.html">Business Model</a></p>
                <p><a href="venture-funnel.html">Venture Funnel</a></p>
                <p><a href="smartstart.html">SmartStart</a></p>
                <p><a href="pricing.html">Pricing</a></p>
            </div>
            <div class="footer-section">
                <h3>Legal</h3>
                <p><a href="legal.html">Terms of Service</a></p>
                <p><a href="privacy.html">Privacy Policy</a></p>
                <p><a href="contributor-agreement.html">Contributor Agreement</a></p>
                <p><a href="nda.html">NDA</a></p>
                <p><a href="refund-policy.html">Refund Policy</a></p>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2025 AliceSolutionsGroup. All rights reserved. | SmartStart by Udi Shkolnik | Status: Production Ready</p>
        </div>
    </div>
</footer>
`;

// Function to inject header and footer
function injectGlobalComponents() {
    // Inject header
    const headerPlaceholder = document.getElementById('global-header');
    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = globalHeader;
    }

    // Inject footer
    const footerPlaceholder = document.getElementById('global-footer');
    if (footerPlaceholder) {
        footerPlaceholder.innerHTML = globalFooter;
    }

    // Update logo links based on current directory
    updateLogoLinks();
}

// Function to update logo links based on directory depth
function updateLogoLinks() {
    const path = window.location.pathname;
    const logoLinks = document.querySelectorAll('.logo a');
    
    logoLinks.forEach(link => {
        if (path.includes('/auth/')) {
            link.href = '../index.html';
        } else if (path.includes('/user-journey/')) {
            link.href = '../index.html';
        } else {
            link.href = 'index.html';
        }
    });
}

// Function to highlight current page in navigation
function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop().split('.')[0];
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        const linkPage = link.href.split('/').pop().split('.')[0];
        if (linkPage === currentPage) {
            link.style.color = 'var(--accent-cyan)';
            link.style.textShadow = '0 0 10px var(--accent-cyan)';
        }
    });
}

// Initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    injectGlobalComponents();
    highlightCurrentPage();
});

// Export functions for external use
window.SmartStartComponents = {
    injectGlobalComponents,
    updateLogoLinks,
    highlightCurrentPage
};

} // End of SmartStartComponents check
