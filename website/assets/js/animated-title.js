/**
 * Animated Title Controller for SmartStart
 * Cycles through different titles related to AliceSolutions vision
 * with typing effect and smooth transitions
 */

class AnimatedTitle {
    constructor() {
        this.titleElement = document.getElementById('animated-title');
        this.cursorElement = document.querySelector('.title-cursor');
        this.currentIndex = 0;
        this.isTyping = false;
        
        // Titles based on AliceSolutions vision and SmartStart mission - single line only
        this.titles = [
            "Welcome to AliceSolutionsGroup",
            "Micro-Venture Studio",
            "Transform Ideas into SaaS",
            "Collaborative Innovation Hub",
            "SmartStart Community",
            "Build Together, Succeed Together",
            "From Concept to Profit",
            "Structured Collaboration",
            "Proven Methodologies",
            "Where Ideas Find Their Team"
        ];
        
        // Wait for initial animation to complete, then start cycling
        setTimeout(() => {
            this.startCycling();
        }, 3000);
    }
    
    startCycling() {
        this.cursorElement.style.opacity = '1';
        
        // Start the cycling after a delay
        setTimeout(() => {
            this.cycleTitles();
        }, 1000);
    }
    
    async cycleTitles() {
        while (true) {
            // Type out the current title
            await this.typeTitle(this.titles[this.currentIndex]);
            
            // Wait for a moment
            await this.delay(2000);
            
            // Erase the current title
            await this.eraseTitle();
            
            // Wait for a moment
            await this.delay(500);
            
            // Move to next title
            this.currentIndex = (this.currentIndex + 1) % this.titles.length;
        }
    }
    
    async typeTitle(text) {
        this.isTyping = true;
        this.titleElement.textContent = '';
        this.titleElement.style.borderRight = '2px solid var(--primary-coral)';
        
        for (let i = 0; i <= text.length; i++) {
            if (!this.isTyping) break; // Allow interruption
            
            this.titleElement.textContent = text.slice(0, i);
            
            // Vary typing speed for natural feel
            const delay = i === 0 ? 200 : (Math.random() * 100 + 50);
            await this.delay(delay);
        }
        
        this.isTyping = false;
    }
    
    async eraseTitle() {
        this.isTyping = true;
        const currentText = this.titleElement.textContent;
        
        for (let i = currentText.length; i >= 0; i--) {
            if (!this.isTyping) break; // Allow interruption
            
            this.titleElement.textContent = currentText.slice(0, i);
            
            // Faster erasing
            await this.delay(30);
        }
        
        this.isTyping = false;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Public method to manually change title (useful for navigation)
    setTitle(title) {
        this.isTyping = false;
        this.titleElement.textContent = title;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if the animated title element exists
    if (document.getElementById('animated-title')) {
        new AnimatedTitle();
    }
});

// Export for potential use in other scripts
window.AnimatedTitle = AnimatedTitle;
