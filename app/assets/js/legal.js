/**
 * SmartStart Platform - Legal System
 * Legal documents, contracts, and signature management
 */

class LegalSystem {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3344/api';
        this.documents = [];
        this.templates = [];
        this.signatures = [];
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Legal System...');
            await this.loadTemplates();
            await this.loadDocuments();
            await this.loadSignatures();
            this.setupEventListeners();
            console.log('Legal System initialized successfully');
        } catch (error) {
            console.error('Error initializing Legal System:', error);
            this.handleError(error);
        }
    }

    async loadTemplates() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/legal/templates`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load templates: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.templates = data.data;
                this.updateTemplatesDisplay();
            } else {
                throw new Error('Invalid templates data');
            }
        } catch (error) {
            console.error('Error loading templates:', error);
            // Fallback to demo data
            this.templates = this.getDemoTemplates();
            this.updateTemplatesDisplay();
        }
    }

    async loadDocuments() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/legal/documents`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load documents: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.documents = data.data;
                this.updateDocumentsDisplay();
            } else {
                throw new Error('Invalid documents data');
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            // Fallback to demo data
            this.documents = this.getDemoDocuments();
            this.updateDocumentsDisplay();
        }
    }

    async loadSignatures() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/legal/signatures`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load signatures: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.signatures = data.data;
                this.updateSignaturesDisplay();
            } else {
                throw new Error('Invalid signatures data');
            }
        } catch (error) {
            console.error('Error loading signatures:', error);
            // Fallback to demo data
            this.signatures = this.getDemoSignatures();
            this.updateSignaturesDisplay();
        }
    }

    updateTemplatesDisplay() {
        const templatesGrid = document.querySelector('.templates-grid');
        if (!templatesGrid) return;

        templatesGrid.innerHTML = '';
        
        this.templates.forEach(template => {
            const templateElement = this.createTemplateElement(template);
            templatesGrid.appendChild(templateElement);
        });
    }

    createTemplateElement(template) {
        const templateCard = document.createElement('div');
        templateCard.className = 'template-card';
        
        templateCard.innerHTML = `
            <div class="template-icon">
                <i class="fas ${template.icon}"></i>
            </div>
            <div class="template-info">
                <h3>${template.name}</h3>
                <p>${template.description}</p>
                <div class="template-meta">
                    <span class="template-usage">Used ${template.usageCount} times</span>
                    <span class="template-status ${template.status}">${template.status}</span>
                </div>
            </div>
            <div class="template-actions">
                <button class="btn btn-sm btn-primary" onclick="legalSystem.useTemplate('${template.id}')">Use Template</button>
                <button class="btn btn-sm btn-ghost" onclick="legalSystem.previewTemplate('${template.id}')">Preview</button>
            </div>
        `;

        return templateCard;
    }

    updateDocumentsDisplay() {
        const completedDocuments = document.querySelector('.documents-list');
        if (!completedDocuments) return;

        const completedDocs = this.documents.filter(doc => doc.status === 'completed');
        completedDocuments.innerHTML = '';
        
        completedDocs.forEach(doc => {
            const docElement = this.createDocumentElement(doc);
            completedDocuments.appendChild(docElement);
        });
    }

    createDocumentElement(document) {
        const docItem = document.createElement('div');
        docItem.className = 'document-item';
        
        docItem.innerHTML = `
            <div class="document-info">
                <h4>${document.name}</h4>
                <p>${document.description}</p>
                <div class="document-meta">
                    <span class="document-date">Completed ${this.formatDate(document.completedDate)}</span>
                    <span class="document-status ${document.status}">${document.status}</span>
                </div>
            </div>
            <div class="document-actions">
                <button class="btn btn-sm btn-ghost" onclick="legalSystem.viewDocument('${document.id}')">View</button>
                <button class="btn btn-sm btn-ghost" onclick="legalSystem.downloadDocument('${document.id}')">Download</button>
            </div>
        `;

        return docItem;
    }

    updateSignaturesDisplay() {
        const pendingSignatures = document.querySelector('.signatures-list');
        if (!pendingSignatures) return;

        const pendingSigs = this.signatures.filter(sig => sig.status === 'pending');
        pendingSignatures.innerHTML = '';
        
        pendingSigs.forEach(sig => {
            const sigElement = this.createSignatureElement(sig);
            pendingSignatures.appendChild(sigElement);
        });
    }

    createSignatureElement(signature) {
        const sigItem = document.createElement('div');
        sigItem.className = 'signature-item';
        
        sigItem.innerHTML = `
            <div class="signature-info">
                <h4>${signature.documentName}</h4>
                <p>Waiting for signature from ${signature.recipientName}</p>
                <div class="signature-meta">
                    <span class="signature-date">Sent ${this.formatDate(signature.sentDate)}</span>
                    <span class="signature-status ${signature.status}">${signature.status}</span>
                </div>
            </div>
            <div class="signature-actions">
                <button class="btn btn-sm btn-primary" onclick="legalSystem.sendReminder('${signature.id}')">Send Reminder</button>
                <button class="btn btn-sm btn-ghost" onclick="legalSystem.viewDocument('${signature.documentId}')">View Document</button>
            </div>
        `;

        return sigItem;
    }

    setupEventListeners() {
        // Create document button
        const createDocumentBtn = document.getElementById('createDocument');
        if (createDocumentBtn) {
            createDocumentBtn.addEventListener('click', () => this.showCreateDocumentModal());
        }

        // Send for signature button
        const sendForSignatureBtn = document.getElementById('sendForSignature');
        if (sendForSignatureBtn) {
            sendForSignatureBtn.addEventListener('click', () => this.showSendSignatureModal());
        }

        // Refresh signatures button
        const refreshSignaturesBtn = document.getElementById('refreshSignatures');
        if (refreshSignaturesBtn) {
            refreshSignaturesBtn.addEventListener('click', () => this.loadSignatures());
        }

        // Filter documents button
        const filterDocumentsBtn = document.getElementById('filterDocuments');
        if (filterDocumentsBtn) {
            filterDocumentsBtn.addEventListener('click', () => this.showFilterModal());
        }

        // Export documents button
        const exportDocumentsBtn = document.getElementById('exportDocuments');
        if (exportDocumentsBtn) {
            exportDocumentsBtn.addEventListener('click', () => this.exportDocuments());
        }
    }

    showCreateDocumentModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Create New Document</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form class="modal-form">
                    <div class="form-group">
                        <label for="documentTemplate">Template</label>
                        <select id="documentTemplate" required>
                            <option value="">Select a template</option>
                            ${this.templates.map(template => 
                                `<option value="${template.id}">${template.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="documentName">Document Name</label>
                        <input type="text" id="documentName" required>
                    </div>
                    <div class="form-group">
                        <label for="documentDescription">Description</label>
                        <textarea id="documentDescription" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="documentVenture">Venture</label>
                        <select id="documentVenture">
                            <option value="venture_1">Clinic CRM</option>
                            <option value="venture_2">AI Assistant</option>
                            <option value="venture_3">EcoTracker</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Document</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.modal-cancel').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateDocument(modal);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
    }

    async handleCreateDocument(modal) {
        const formData = {
            templateId: modal.querySelector('#documentTemplate').value,
            name: modal.querySelector('#documentName').value,
            description: modal.querySelector('#documentDescription').value,
            ventureId: modal.querySelector('#documentVenture').value
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/legal/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.documents.push(data.data);
                    this.updateDocumentsDisplay();
                    this.closeModal(modal);
                    this.showSuccessMessage('Document created successfully!');
                }
            } else {
                throw new Error('Failed to create document');
            }
        } catch (error) {
            console.error('Error creating document:', error);
            this.showErrorMessage('Failed to create document. Please try again.');
        }
    }

    showSendSignatureModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Send for Signature</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form class="modal-form">
                    <div class="form-group">
                        <label for="signatureDocument">Document</label>
                        <select id="signatureDocument" required>
                            <option value="">Select a document</option>
                            ${this.documents.filter(doc => doc.status === 'draft').map(doc => 
                                `<option value="${doc.id}">${doc.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="signatureRecipients">Recipients (Email addresses, separated by commas)</label>
                        <textarea id="signatureRecipients" rows="3" placeholder="user1@example.com, user2@example.com" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="signatureMessage">Personal Message</label>
                        <textarea id="signatureMessage" rows="3" placeholder="Please review and sign this document..."></textarea>
                    </div>
                    <div class="form-group">
                        <label for="signatureDeadline">Deadline</label>
                        <input type="date" id="signatureDeadline">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Send for Signature</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.modal-cancel').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSendSignature(modal);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
    }

    async handleSendSignature(modal) {
        const formData = {
            documentId: modal.querySelector('#signatureDocument').value,
            recipients: modal.querySelector('#signatureRecipients').value.split(',').map(email => email.trim()),
            message: modal.querySelector('#signatureMessage').value,
            deadline: modal.querySelector('#signatureDeadline').value
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/legal/signatures`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.signatures.push(...data.data);
                    this.updateSignaturesDisplay();
                    this.closeModal(modal);
                    this.showSuccessMessage('Document sent for signature!');
                }
            } else {
                throw new Error('Failed to send for signature');
            }
        } catch (error) {
            console.error('Error sending for signature:', error);
            this.showErrorMessage('Failed to send for signature. Please try again.');
        }
    }

    async useTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        // Navigate to document editor with template
        window.location.href = `document-editor.html?template=${templateId}`;
    }

    previewTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        // Show template preview modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>${template.name} - Preview</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="template-preview">
                    <div class="preview-content">
                        ${template.content || 'Template content will be displayed here...'}
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary modal-cancel">Close</button>
                    <button type="button" class="btn btn-primary" onclick="legalSystem.useTemplate('${templateId}')">Use Template</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => this.closeModal(modal));
        modal.querySelector('.modal-cancel').addEventListener('click', () => this.closeModal(modal));

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
    }

    async sendReminder(signatureId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/legal/signatures/${signatureId}/remind`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                }
            });

            if (response.ok) {
                this.showSuccessMessage('Reminder sent successfully!');
            } else {
                throw new Error('Failed to send reminder');
            }
        } catch (error) {
            console.error('Error sending reminder:', error);
            this.showErrorMessage('Failed to send reminder. Please try again.');
        }
    }

    viewDocument(documentId) {
        // Navigate to document viewer
        window.location.href = `document-viewer.html?id=${documentId}`;
    }

    downloadDocument(documentId) {
        // Trigger document download
        const link = document.createElement('a');
        link.href = `${this.apiBaseUrl}/legal/documents/${documentId}/download`;
        link.download = 'document.pdf';
        link.click();
    }

    exportDocuments() {
        // Export documents as CSV or PDF
        const exportData = this.documents.map(doc => ({
            name: doc.name,
            status: doc.status,
            createdDate: doc.createdDate,
            completedDate: doc.completedDate
        }));

        const csv = this.convertToCSV(exportData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'legal-documents-export.csv';
        link.click();
        window.URL.revokeObjectURL(url);
    }

    convertToCSV(data) {
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => data[header]))
        ].join('\n');
        return csvContent;
    }

    closeModal(modal) {
        document.body.removeChild(modal);
    }

    formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    getDemoTemplates() {
        return [
            {
                id: 'template_1',
                name: 'Contributor Agreement',
                description: 'IP assignment and equity distribution for team members',
                icon: 'fa-handshake',
                usageCount: 12,
                status: 'active',
                content: 'This is a sample contributor agreement template...'
            },
            {
                id: 'template_2',
                name: 'NDA Agreement',
                description: 'Non-disclosure agreement for confidential information',
                icon: 'fa-shield-alt',
                usageCount: 8,
                status: 'active',
                content: 'This is a sample NDA template...'
            },
            {
                id: 'template_3',
                name: 'Letter of Intent',
                description: 'Preliminary agreement for venture partnerships',
                icon: 'fa-file-contract',
                usageCount: 5,
                status: 'active',
                content: 'This is a sample LOI template...'
            },
            {
                id: 'template_4',
                name: 'Team Agreement',
                description: 'Roles, responsibilities, and equity distribution',
                icon: 'fa-users',
                usageCount: 3,
                status: 'draft',
                content: 'This is a sample team agreement template...'
            }
        ];
    }

    getDemoDocuments() {
        return [
            {
                id: 'doc_1',
                name: 'Contributor Agreement - EcoTracker',
                description: 'Signed by all team members',
                status: 'completed',
                createdDate: '2025-12-01',
                completedDate: '2025-12-05'
            },
            {
                id: 'doc_2',
                name: 'NDA Agreement - Local Marketplace',
                description: 'All signatures collected',
                status: 'completed',
                createdDate: '2025-11-28',
                completedDate: '2025-12-03'
            }
        ];
    }

    getDemoSignatures() {
        return [
            {
                id: 'sig_1',
                documentId: 'doc_3',
                documentName: 'Contributor Agreement - Clinic CRM',
                recipientName: 'Brian Chen',
                status: 'pending',
                sentDate: '2025-12-10'
            },
            {
                id: 'sig_2',
                documentId: 'doc_4',
                documentName: 'NDA Agreement - AI Assistant',
                recipientName: 'Alice Smith',
                status: 'pending',
                sentDate: '2025-12-08'
            }
        ];
    }

    showSuccessMessage(message) {
        if (window.Microinteractions) {
            window.Microinteractions.showSuccessMessage(message);
        } else {
            console.log('Success:', message);
        }
    }

    showErrorMessage(message) {
        if (window.Microinteractions) {
            window.Microinteractions.showErrorMessage(message);
        } else {
            console.error('Error:', message);
        }
    }

    handleError(error) {
        console.error('Legal System Error:', error);
        this.showErrorMessage('An error occurred. Please refresh the page.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.legalSystem = new LegalSystem();
});
