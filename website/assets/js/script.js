// Optimized header scroll effect for M2 performance
let headerTicking = false;
function updateHeader() {
    const header = document.getElementById('header');
    if (window.scrollY > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    headerTicking = false;
}

window.addEventListener('scroll', () => {
    if (!headerTicking) {
        requestAnimationFrame(updateHeader);
        headerTicking = true;
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe all fade-in elements
document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
});

// Add floating animation to archetype cards
document.querySelectorAll('.archetype-card').forEach((card, index) => {
    card.style.animationDelay = `${index * 0.2}s`;
    card.classList.add('floating');
});

// Add hover effects to glass cards
document.querySelectorAll('.glass-card, .archetype-card, .feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
    });
});

// Optimized parallax effect for M2 performance
let ticking = false;
function updateParallax() {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.transform = `translate3d(0, ${scrolled * 0.3}px, 0)`;
    }
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
    }
});

// Add click effects to buttons
document.querySelectorAll('.cta-button, .archetype-card, .feature-card').forEach(element => {
    element.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add ripple effect styles
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Dynamic typing effect for hero title with changeable text
const heroTitle = document.querySelector('#hero-title');
const visionDescription = document.querySelector('#vision-description');
if (heroTitle) {
    const phrases = [
        "Welcome to AliceSolutionsGroup",
        "SmartStart Community",
        "Micro-Venture Studio",
        "Structured Collaboration",
        "Proven Methodologies",
        "Portfolio Approach",
        "Venture Success",
        "Innovation Hub"
    ];
    
    const visionPhrases = [
        "Building the future of collaborative innovation",
        "Transforming ideas into profitable ventures",
        "Empowering entrepreneurs through structure",
        "Creating the next generation of SaaS",
        "Structured approach to venture success",
        "Collaboration through proven methodologies",
        "Innovation through structured collaboration",
        "Your venture journey starts here"
    ];
    
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;
    let deletingSpeed = 50;
    let pauseTime = 3000;
    
    function typeWriter() {
        const currentPhrase = phrases[phraseIndex];
        
        if (isDeleting) {
            heroTitle.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
        } else {
            heroTitle.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
        }
        
        if (!isDeleting && charIndex === currentPhrase.length) {
            setTimeout(() => isDeleting = true, pauseTime);
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            // Update vision description when title changes
            if (visionDescription) {
                visionDescription.textContent = visionPhrases[phraseIndex];
            }
        }
        
        const delay = isDeleting ? deletingSpeed : typingSpeed;
        setTimeout(typeWriter, delay);
    }
    
    // Start typing effect after a delay
    setTimeout(typeWriter, 1000);
}
