/**
 * Legal Documents System for SmartStart Platform
 * Handles document display, reading, and signing during registration
 */

class LegalDocumentsSystem {
  constructor() {
    this.documents = [];
    this.currentDocumentIndex = 0;
    this.signedDocuments = [];
    this.userInfo = null;
    this.apiBaseUrl = 'http://localhost:3344/api/legal';
  }

  /**
   * Initialize the legal documents system
   */
  async initialize(userInfo) {
    try {
      console.log('LegalDocumentsSystem: Initializing with userInfo:', userInfo);
      
      // Prevent multiple initializations
      if (window.legalDocumentsSystemActive && document.getElementById('legal-documents-modal')) {
        console.log('LegalDocumentsSystem: Already active, skipping initialization...');
        return;
      }
      
      this.userInfo = userInfo;
      
      // If we have form data with password, create user first
      if (userInfo.firstName && userInfo.lastName && userInfo.email && userInfo.password && !userInfo.id) {
        console.log('LegalDocumentsSystem: Creating user from form data');
        await this.createUserFromFormData(userInfo);
      }
      
      console.log('LegalDocumentsSystem: Loading documents...');
      await this.loadDocuments();
      console.log('LegalDocumentsSystem: Setting up event listeners...');
      this.setupEventListeners();
      console.log('LegalDocumentsSystem: Showing document modal...');
      this.showDocumentModal();
      console.log('LegalDocumentsSystem: Initialization complete');
    } catch (error) {
      console.error('Failed to initialize legal documents system:', error);
      console.error('Error stack:', error.stack);
      this.showError('Failed to load legal documents. Please try again.');
    }
  }

  /**
   * Create user from form data before signing documents
   */
  async createUserFromFormData(formData) {
    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        company: formData.company || null,
        role: 'user'
      };

      const response = await fetch('http://localhost:3344/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create user account');
      }

      // Update userInfo with real user ID
      this.userInfo.id = result.data.user.id;
      this.userInfo.realUserId = result.data.user.id;
      
      console.log('User created successfully:', result.data.user);
      return result.data.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Load legal documents from the backend
   */
    async loadDocuments() {
      try {
        console.log('LegalDocumentsSystem: Loading documents from backend...');
        
        try {
          // Try to load from real backend API
          const response = await fetch(`${this.apiBaseUrl}/required`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.userInfo.token || localStorage.getItem('smartstart_token')}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              this.documents = result.data.map(doc => ({
                id: doc.id,
                name: doc.title,
                filename: doc.filename || `${doc.title.replace(/\s+/g, '_')}.md`,
                content: doc.content,
                size: doc.content ? doc.content.length : 1024,
                lastModified: new Date(doc.updatedAt),
                isSigned: doc.isSigned,
                signedAt: doc.signedAt
              }));
              console.log('Loaded real legal documents from backend:', this.documents);
              return;
            }
          }
        } catch (apiError) {
          console.warn('Failed to load from backend, using mock documents:', apiError);
        }

        // Fallback to mock documents
        this.documents = [
          {
            id: 'terms',
            name: 'Terms of Service',
            filename: 'TERMS_OF_SERVICE.md',
            content: `# Terms of Service

## 1. Acceptance of Terms
By accessing and using SmartStart Platform, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Use License
Permission is granted to temporarily use SmartStart Platform for personal, non-commercial transitory viewing only.

## 3. Disclaimer
The materials on SmartStart Platform are provided on an 'as is' basis. SmartStart makes no warranties, expressed or implied.

## 4. Limitations
In no event shall SmartStart or its suppliers be liable for any damages arising out of the use or inability to use the materials on SmartStart Platform.

## 5. Revisions
SmartStart may revise these terms of service at any time without notice.`,
            size: 1024,
            lastModified: new Date()
          },
          {
            id: 'privacy',
            name: 'Privacy Policy',
            filename: 'PRIVACY_POLICY.md',
            content: `# Privacy Policy

## 1. Information We Collect
We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.

## 2. How We Use Your Information
We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.

## 3. Information Sharing
We do not sell, trade, or otherwise transfer your personal information to third parties without your consent.

## 4. Data Security
We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## 5. Your Rights
You have the right to access, update, or delete your personal information at any time.`,
            size: 1024,
            lastModified: new Date()
          },
          {
            id: 'nda',
            name: 'Non-Disclosure Agreement',
            filename: 'NDA.md',
            content: `# Non-Disclosure Agreement

## 1. Confidential Information
The parties acknowledge that they may have access to confidential and proprietary information belonging to the other party.

## 2. Non-Disclosure Obligations
Each party agrees to hold in strict confidence all confidential information and not to disclose it to any third party without prior written consent.

## 3. Permitted Disclosures
The receiving party may disclose confidential information if required by law or court order.

## 4. Return of Information
Upon termination of this agreement, each party shall return or destroy all confidential information.

## 5. Term
This agreement shall remain in effect for a period of five (5) years from the date of execution.`,
            size: 1024,
            lastModified: new Date()
          },
          {
            id: 'contributor',
            name: 'Contributor Agreement',
            filename: 'CONTRIBUTOR_AGREEMENT.md',
            content: `# Contributor Agreement

## 1. Contribution License
By contributing to SmartStart Platform, you grant us a perpetual, worldwide, non-exclusive, royalty-free license to use, modify, and distribute your contributions.

## 2. Original Work
You represent that your contributions are your original work and do not infringe on any third-party rights.

## 3. Code of Conduct
Contributors must adhere to our code of conduct, treating all community members with respect and professionalism.

## 4. Intellectual Property
You retain ownership of your contributions but grant us the necessary rights to use them in our platform.

## 5. Termination
This agreement may be terminated by either party with written notice.`,
            size: 1024,
            lastModified: new Date()
          }
        ];
        
        console.log('Loaded mock legal documents:', this.documents);
        
      } catch (error) {
        console.error('Error loading documents:', error);
        throw error;
      }
    }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Document navigation
    document.addEventListener('click', (e) => {
      if (e.target.id === 'next-document-btn') {
        this.nextDocument();
      } else if (e.target.id === 'prev-document-btn') {
        this.previousDocument();
      } else if (e.target.id === 'sign-document-btn') {
        this.signCurrentDocument();
      } else if (e.target.id === 'accept-all-btn') {
        this.acceptAllDocuments();
      } else if (e.target.id === 'close-legal-modal') {
        this.closeDocumentModal();
      }
    });

    // Scroll tracking for reading progress
    const documentContent = document.getElementById('legal-document-content');
    if (documentContent) {
      documentContent.addEventListener('scroll', () => {
        this.updateReadingProgress();
      });
    }
  }

  /**
   * Show the legal documents modal
   */
  showDocumentModal() {
    console.log('LegalDocumentsSystem: Creating modal, documents count:', this.documents ? this.documents.length : 'undefined');
    
    const modal = document.createElement('div');
    modal.id = 'legal-documents-modal';
    modal.className = 'legal-modal-overlay';
    
    const documentsCount = this.documents ? this.documents.length : 0;
    
    modal.innerHTML = `
      <div class="legal-modal professional-layout">
        <!-- Minimal Header -->
        <div class="legal-modal-header minimal">
          <div class="document-counter">Document <span id="current-doc-number">1</span> of <span id="total-docs">${documentsCount}</span></div>
          <div class="minimal-controls">
            <button id="prev-document-btn" class="minimal-btn" disabled>←</button>
            <button id="next-document-btn" class="minimal-btn">→</button>
          </div>
        </div>
        
        <!-- Main Reading Area - 85% of screen -->
        <div class="legal-modal-body reading-focused">
          <div class="document-content-wrapper professional-reading" id="legal-document-content">
            <!-- Document content will be loaded here -->
          </div>
        </div>
        
        <!-- Minimal Footer with Status -->
        <div class="legal-modal-footer minimal">
          <div class="document-status-minimal">
            <div id="signed-documents-list" class="status-list">
              <!-- Document status will be shown here -->
            </div>
          </div>
          
          <div class="minimal-actions">
            <button id="sign-document-btn" class="minimal-action-btn" disabled>
              Accept Document
            </button>
            <button id="close-legal-modal" class="minimal-action-btn complete" style="display: none;">
              Complete Registration
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.loadCurrentDocument();
    this.updateSignedDocumentsList();
    
    // Add skip reading button event listener
    const skipBtn = document.getElementById('skip-reading-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        const signBtn = document.getElementById('sign-document-btn');
        if (signBtn) {
          signBtn.disabled = false;
          skipBtn.style.display = 'none';
          console.log('✅ Sign button enabled via skip reading');
        }
      });
    }
  }

  /**
   * Load the current document
   */
  loadCurrentDocument() {
    if (this.currentDocumentIndex >= this.documents.length) {
      this.showCompletionMessage();
      return;
    }

    const currentDoc = this.documents[this.currentDocumentIndex];
    const content = document.getElementById('legal-document-content');
    
    if (content) {
      content.innerHTML = `
        <div class="document-content professional">
          <h1 class="document-title">${currentDoc.name}</h1>
          ${this.convertMarkdownToHtml(currentDoc.content)}
        </div>
      `;
    }

    this.updateDocumentCounter();
    this.updateNavigationButtons();
    this.updateSignedDocumentsList();
    
    // Auto-enable sign button after 3 seconds (reduced for better UX)
    setTimeout(() => {
      const signBtn = document.getElementById('sign-document-btn');
      if (signBtn && signBtn.disabled) {
        signBtn.disabled = false;
        console.log('✅ Sign button auto-enabled after 3 seconds');
      }
    }, 3000);
  }


  /**
   * Convert markdown to HTML
   */
  convertMarkdownToHtml(markdown) {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/^\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br>')
      .replace(/^(.*)$/gim, '<p>$1</p>')
      .replace(/<p><h/gim, '<h')
      .replace(/<\/h([1-6])><\/p>/gim, '</h$1>')
      .replace(/<p><li>/gim, '<ul><li>')
      .replace(/<\/li><\/p>/gim, '</li></ul>')
      .replace(/<p><ul>/gim, '<ul>')
      .replace(/<\/ul><\/p>/gim, '</ul>');
  }

  /**
   * Update document counter
   */
  updateDocumentCounter() {
    const currentDocNumber = document.getElementById('current-doc-number');
    const totalDocs = document.getElementById('total-docs');
    
    if (currentDocNumber) {
      currentDocNumber.textContent = this.currentDocumentIndex + 1;
    }
    if (totalDocs) {
      totalDocs.textContent = this.documents.length;
    }
  }

  /**
   * Update navigation buttons
   */
  updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-document-btn');
    const nextBtn = document.getElementById('next-document-btn');
    const signBtn = document.getElementById('sign-document-btn');
    
    if (prevBtn) {
      prevBtn.disabled = this.currentDocumentIndex === 0;
    }
    
    // Disable next button until current document is signed
    if (nextBtn) {
      const currentDoc = this.documents[this.currentDocumentIndex];
      const isCurrentSigned = this.signedDocuments.includes(currentDoc.id);
      nextBtn.disabled = this.currentDocumentIndex >= this.documents.length - 1 || !isCurrentSigned;
    }
    
    if (signBtn) {
      const currentDoc = this.documents[this.currentDocumentIndex];
      const isSigned = this.signedDocuments.includes(currentDoc.id);
      signBtn.disabled = isSigned;
      signBtn.textContent = isSigned ? '✓ Already Accepted' : '✓ Accept This Document';
    }
  }

  /**
   * Update reading progress
   */
  updateReadingProgress() {
    const content = document.getElementById('legal-document-content');
    const progressFill = document.getElementById('reading-progress');
    const progressPercentage = document.getElementById('progress-percentage');
    
    if (content && progressFill && progressPercentage) {
      const scrollTop = content.scrollTop;
      const scrollHeight = content.scrollHeight - content.clientHeight;
      const progress = Math.min((scrollTop / scrollHeight) * 100, 100);
      
      progressFill.style.width = `${progress}%`;
      progressPercentage.textContent = `${Math.round(progress)}%`;
      
      // Enable sign button when user has read 10% of the document or after 5 seconds
      const signBtn = document.getElementById('sign-document-btn');
      if (signBtn && progress >= 10) {
        signBtn.disabled = false;
      }
    }
  }

  /**
   * Reset reading progress
   */
  resetReadingProgress() {
    const progressFill = document.getElementById('reading-progress');
    const progressPercentage = document.getElementById('progress-percentage');
    const signBtn = document.getElementById('sign-document-btn');
    
    if (progressFill) {
      progressFill.style.width = '0%';
    }
    if (progressPercentage) {
      progressPercentage.textContent = '0%';
    }
    if (signBtn) {
      signBtn.disabled = true;
    }
  }

  /**
   * Navigate to next document
   */
  nextDocument() {
    if (this.currentDocumentIndex < this.documents.length - 1) {
      this.currentDocumentIndex++;
      this.loadCurrentDocument();
    }
  }

  /**
   * Navigate to previous document
   */
  previousDocument() {
    if (this.currentDocumentIndex > 0) {
      this.currentDocumentIndex--;
      this.loadCurrentDocument();
    }
  }

  /**
   * Sign the current document
   */
  async signCurrentDocument() {
    try {
      const currentDocument = this.documents[this.currentDocumentIndex];
      const signBtn = document.getElementById('sign-document-btn');
      
      if (signBtn) {
        signBtn.disabled = true;
        signBtn.textContent = 'Signing...';
      }

      try {
        // Try to sign with real backend API
        const response = await fetch(`${this.apiBaseUrl}/sign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.userInfo.token || localStorage.getItem('smartstart_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            documentId: currentDocument.id,
            signatureData: {
              name: this.userInfo.name,
              email: this.userInfo.email,
              ipAddress: this.getClientIP(),
              userAgent: navigator.userAgent,
              signedAt: new Date().toISOString()
            }
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log(`Real signature created for document ${currentDocument.id}:`, result.data);
            this.signedDocuments.push(currentDocument.id);
            this.updateSignedDocumentsList();
            this.updateNavigationButtons();
            this.showSuccess(`Successfully accepted ${currentDocument.name}`);
            
            // Auto-advance to next document after a short delay
            setTimeout(() => {
              if (this.currentDocumentIndex < this.documents.length - 1) {
                this.nextDocument();
              } else {
                // All documents signed, show completion message
                this.showCompletionMessage();
              }
            }, 1500);
            return;
          } else {
            throw new Error(result.error?.message || 'Failed to sign document');
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (apiError) {
        console.warn('Failed to sign with backend, using demo mode:', apiError);
        
        // Fallback to demo signing
        console.log(`Demo: Signing document ${currentDocument.id}`, {
          documentId: currentDocument.id,
          userId: this.userInfo.id,
          userInfo: {
            name: this.userInfo.name,
            email: this.userInfo.email,
            ipAddress: this.getClientIP(),
            userAgent: navigator.userAgent,
            signedAt: new Date().toISOString()
          }
        });
        
        // Simulate successful response
        const data = { success: true, signatureId: 'demo_signature_' + Date.now() };
        
        if (data.success) {
          this.signedDocuments.push(currentDocument.id);
          this.updateSignedDocumentsList();
          this.updateNavigationButtons();
          this.showSuccess(`Successfully accepted ${currentDocument.name}`);
          
          // Auto-advance to next document after a short delay
          setTimeout(() => {
            if (this.currentDocumentIndex < this.documents.length - 1) {
              this.nextDocument();
            } else {
              // All documents signed, show completion message
              this.showCompletionMessage();
            }
          }, 1500);
        } else {
          throw new Error(data.message || 'Failed to sign document');
        }
      }
    } catch (error) {
      console.error('Error signing document:', error);
      this.showError('Failed to sign document. Please try again.');
      
      const signBtn = document.getElementById('sign-document-btn');
      if (signBtn) {
        signBtn.disabled = false;
        signBtn.textContent = '✓ Accept This Document';
      }
    }
  }

  /**
   * Accept all documents (legacy method - now handled by sequential flow)
   */
  async acceptAllDocuments() {
    // This method is now handled by the sequential document flow
    // Users sign documents one by one, then complete registration
    this.onAllDocumentsAccepted();
  }

  /**
   * Sign a specific document
   */
  async signDocument(doc) {
    const response = await fetch(`${this.apiBaseUrl}/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: doc.id,
        userId: this.userInfo.id,
        userInfo: {
          name: this.userInfo.name,
          email: this.userInfo.email,
          ipAddress: this.getClientIP(),
          userAgent: navigator.userAgent,
          signedAt: new Date().toISOString()
        }
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to sign document');
    }
    
    return data;
  }

  /**
   * Update signed documents list
   */
  updateSignedDocumentsList() {
    const signedList = document.getElementById('signed-documents-list');
    
    if (signedList) {
      const signedCount = this.signedDocuments.length;
      const totalCount = this.documents.length;
      
      signedList.innerHTML = `
        <div class="status-summary">
          <span class="status-text">Documents: ${signedCount}/${totalCount} completed</span>
        </div>
        <div class="document-list">
          ${this.documents.map((doc, index) => {
            const isSigned = this.signedDocuments.includes(doc.id);
            const isCurrent = index === this.currentDocumentIndex;
            return `
              <div class="document-item ${isSigned ? 'completed' : isCurrent ? 'current' : 'pending'}">
                <span class="doc-number">${index + 1}</span>
                <span class="doc-name">${doc.name}</span>
                <span class="doc-status">${isSigned ? '✓' : isCurrent ? '→' : '○'}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  /**
   * Show completion message
   */
  showCompletionMessage() {
    const content = document.getElementById('legal-document-content');
    if (content) {
      content.innerHTML = `
        <div class="completion-message professional">
          <h1 class="document-title">All Documents Completed</h1>
          <div class="completion-summary">
            <p>You have successfully read and accepted all legal documents:</p>
            <div class="completed-docs">
              ${this.documents.map(doc => `
                <div class="completed-doc-item">
                  <span class="checkmark">✓</span>
                  <span class="doc-name">${doc.name}</span>
                </div>
              `).join('')}
            </div>
            <p class="completion-note">You can now complete your registration and start using the SmartStart platform.</p>
          </div>
        </div>
      `;
      
      // Show the Complete Registration button and hide the sign button
      const signBtn = document.getElementById('sign-document-btn');
      const completeBtn = document.getElementById('close-legal-modal');
      
      if (signBtn) {
        signBtn.style.display = 'none';
      }
      
      if (completeBtn) {
        completeBtn.style.display = 'inline-block';
      }
      
      // Call the completion callback to trigger the next step
      this.onAllDocumentsAccepted();
    }
  }

  /**
   * Close the document modal
   */
  closeDocumentModal() {
    const modal = document.getElementById('legal-documents-modal');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showMessage(message, 'error');
  }

  /**
   * Show message
   */
  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `legal-message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  /**
   * Get client IP address
   */
  getClientIP() {
    // This is a placeholder - in a real application, you'd get this from the server
    return '127.0.0.1';
  }

  /**
   * Callback when all documents are accepted
   */
  onAllDocumentsAccepted() {
    // This will be called when all documents are accepted
    // The parent application should handle this
    if (window.onLegalDocumentsAccepted) {
      window.onLegalDocumentsAccepted();
    }
  }
}

// Export for use in other modules
window.LegalDocumentsSystem = LegalDocumentsSystem;
