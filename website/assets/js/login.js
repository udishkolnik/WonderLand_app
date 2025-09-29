// Login page functionality
let database = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    database = new SimpleSmartStartDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
});

// Login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!email || !password) {
    showNotification('Please fill in all fields', 'error');
    return;
  }
  
  // Show loading state
  const submitBtn = document.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Signing in...';
  submitBtn.disabled = true;
  
  try {
    
    // Simulate login process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo purposes, accept any email/password
    if (email && password) {
      showNotification('Login successful! Redirecting...', 'success');
      
      // Store user session
      const userData = {
        email: email,
        name: email.split('@')[0],
        firstName: email.split('@')[0],
        lastName: 'User',
        loginTime: new Date().toISOString()
      };
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Store token for dashboard authentication
      const token = 'demo_token_' + Date.now();
      localStorage.setItem('smartstart_token', token);
      
      console.log('Login successful, stored data:', { user: userData, token: token });
      
      // Redirect to dashboard
      setTimeout(() => {
        console.log('Redirecting to dashboard...');
        window.location.href = '../dashboard.html';
      }, 1500);
    } else {
      showNotification('Invalid credentials', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification('Login failed. Please try again.', 'error');
  } finally {
    // Reset button state
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Notification system
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelector('.notification');
  if (existing) {
    existing.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Password toggle functionality
function togglePassword() {
  const passwordInput = document.getElementById('password');
  const toggleIcon = document.getElementById('passwordToggleIcon');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
}

// Demo credentials helper
document.addEventListener('DOMContentLoaded', () => {
  // Add event listener for password toggle
  const passwordToggleBtn = document.getElementById('passwordToggleBtn');
  if (passwordToggleBtn) {
    passwordToggleBtn.addEventListener('click', togglePassword);
  }
  const demoBtn = document.createElement('button');
  demoBtn.textContent = 'Use Demo Credentials';
  demoBtn.className = 'demo-credentials-btn';
  demoBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--color-neon-teal);
    color: var(--color-bg-dark);
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12px;
    z-index: 1000;
  `;
  
  demoBtn.addEventListener('click', () => {
    document.getElementById('email').value = 'demo@alicesolutions.com';
    document.getElementById('password').value = 'demo123';
    showNotification('Demo credentials filled!', 'info');
  });
  
  document.body.appendChild(demoBtn);
});
