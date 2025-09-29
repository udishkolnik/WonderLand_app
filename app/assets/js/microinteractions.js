/**
 * SmartStart Platform - Microinteractions & Enhanced UX
 * Advanced 2025 UI/UX best practices implementation
 */

class Microinteractions {
  constructor() {
    this.init();
  }

  init() {
    try {
      this.setupButtonAnimations();
      this.setupLoadingStates();
      this.setupFormEnhancements();
      this.setupSkeletonLoading();
      this.setupAccessibility();
      this.setupPerformanceOptimizations();
    } catch (error) {
      console.warn('Microinteractions initialization failed:', error);
    }
  }

  /**
   * Enhanced button animations and microinteractions
   */
  setupButtonAnimations() {
    try {
      // Add ripple effect to buttons
      document.addEventListener('click', (e) => {
        try {
          if (e.target && e.target.classList && (e.target.classList.contains('btn') || e.target.closest('.btn'))) {
            this.createRippleEffect(e);
          }
        } catch (error) {
          console.warn('Button animation error:', error);
        }
      });

      // Add hover sound effect (optional)
      document.addEventListener('mouseenter', (e) => {
        try {
          if (e.target && e.target.classList && e.target.classList.contains('btn')) {
            e.target.style.transform = 'translateY(-1px)';
          }
        } catch (error) {
          console.warn('Button hover error:', error);
        }
      }, true);

      document.addEventListener('mouseleave', (e) => {
        try {
          if (e.target && e.target.classList && e.target.classList.contains('btn')) {
            e.target.style.transform = 'translateY(0)';
          }
        } catch (error) {
          console.warn('Button leave error:', error);
        }
      }, true);
    } catch (error) {
      console.warn('Button animations setup failed:', error);
    }
  }

  createRippleEffect(e) {
    const button = e.target.closest('.btn');
    if (!button) return;

    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
    `;

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * Loading states and progress indicators
   */
  setupLoadingStates() {
    // Global loading overlay
    this.createLoadingOverlay();
    
    // Form submission loading
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.classList.contains('loading-form')) {
        this.showFormLoading(form);
      }
    });

    // API call loading states
    this.interceptFetch();
  }

  createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
    `;
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
    this.loadingOverlay = overlay;
  }

  showLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'flex';
    }
  }

  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'none';
    }
  }

  showFormLoading(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
    }
  }

  hideFormLoading(form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  }

  /**
   * Enhanced form interactions
   */
  setupFormEnhancements() {
    // Real-time validation
    document.addEventListener('input', (e) => {
      if (e.target.matches('.form-input, .form-select, .form-textarea')) {
        this.validateField(e.target);
      }
    });

    // Form submission with loading
    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (form.classList.contains('enhanced-form')) {
        e.preventDefault();
        this.handleFormSubmission(form);
      }
    });

    // Auto-save functionality
    document.addEventListener('input', (e) => {
      if (e.target.matches('.auto-save')) {
        this.debounce(() => this.autoSave(e.target), 1000);
      }
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const isValid = field.checkValidity();
    
    field.classList.remove('valid', 'invalid');
    field.classList.add(isValid ? 'valid' : 'invalid');

    // Show validation message
    this.showValidationMessage(field, isValid);
  }

  showValidationMessage(field, isValid) {
    let messageEl = field.parentNode.querySelector('.validation-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.className = 'validation-message';
      field.parentNode.appendChild(messageEl);
    }

    if (isValid) {
      messageEl.textContent = '✓ Valid';
      messageEl.className = 'validation-message valid';
    } else {
      messageEl.textContent = field.validationMessage || 'Please check this field';
      messageEl.className = 'validation-message invalid';
    }
  }

  async handleFormSubmission(form) {
    this.showFormLoading(form);
    
    try {
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        this.showSuccessMessage('Form submitted successfully!');
        form.reset();
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      this.showErrorMessage('Submission failed. Please try again.');
    } finally {
      this.hideFormLoading(form);
    }
  }

  /**
   * Skeleton loading for better perceived performance
   */
  setupSkeletonLoading() {
    // Show skeleton while content loads
    this.showSkeleton = (container) => {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-content';
      skeleton.innerHTML = `
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width: 60%;"></div>
      `;
      container.appendChild(skeleton);
      return skeleton;
    };

    this.hideSkeleton = (skeleton) => {
      if (skeleton) {
        skeleton.remove();
      }
    };
  }

  /**
   * Enhanced accessibility features
   */
  setupAccessibility() {
    // Skip to content link
    this.createSkipLink();
    
    // Enhanced keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });

    // Announce dynamic content changes
    this.createLiveRegion();
  }

  createSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link sr-only';
    skipLink.addEventListener('focus', () => {
      skipLink.classList.remove('sr-only');
    });
    skipLink.addEventListener('blur', () => {
      skipLink.classList.add('sr-only');
    });
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  createLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);
    this.liveRegion = liveRegion;
  }

  announce(message) {
    if (this.liveRegion) {
      this.liveRegion.textContent = message;
    }
  }

  /**
   * Performance optimizations
   */
  setupPerformanceOptimizations() {
    // Lazy load images
    this.setupLazyLoading();
    
    // Debounce scroll events
    this.setupScrollOptimization();
    
    // Preload critical resources
    this.preloadCriticalResources();
  }

  setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  setupScrollOptimization() {
    let ticking = false;
    
    const updateScroll = () => {
      // Handle scroll-based animations
      const scrolled = window.pageYOffset;
      const parallax = document.querySelectorAll('.parallax');
      
      parallax.forEach(element => {
        const speed = element.dataset.speed || 0.5;
        element.style.transform = `translateY(${scrolled * speed}px)`;
      });
      
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateScroll);
        ticking = true;
      }
    });
  }

  preloadCriticalResources() {
    // Preload critical resources
    const mainCSS = document.createElement('link');
    mainCSS.rel = 'preload';
    mainCSS.href = 'assets/css/styles.css';
    mainCSS.as = 'style';
    document.head.appendChild(mainCSS);
  }

  /**
   * Utility functions
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  showSuccessMessage(message) {
    this.showNotification(message, 'success');
  }

  showErrorMessage(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });
    
    // Auto remove
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      this.showLoading();
      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        this.hideLoading();
      }
    };
  }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  .skip-link {
    position: absolute;
    top: -40px;
    left: 6px;
    background: var(--accent);
    color: white;
    padding: 8px;
    text-decoration: none;
    border-radius: 4px;
    z-index: 1000;
  }
  
  .skip-link:focus {
    top: 6px;
  }
  
  .keyboard-navigation *:focus {
    outline: 2px solid var(--accent) !important;
  }
  
  .validation-message {
    font-size: 12px;
    margin-top: 4px;
  }
  
  .validation-message.valid {
    color: var(--success);
  }
  
  .validation-message.invalid {
    color: var(--error);
  }
  
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }
  
  .notification.show {
    transform: translateX(0);
  }
  
  .notification-success {
    background: var(--success);
  }
  
  .notification-error {
    background: var(--error);
  }
  
  .notification-info {
    background: var(--accent);
  }
`;

document.head.appendChild(style);

// Initialize microinteractions when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Microinteractions();
});

// Export for use in other modules
window.Microinteractions = Microinteractions;
