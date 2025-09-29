/**
 * SmartStart Platform - Venture Board
 * Task management and collaboration functionality
 */

class VentureBoard {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3344/api';
        this.currentVenture = null;
        this.tasks = [];
        this.teamMembers = [];
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Venture Board...');
            await this.loadVentureData();
            await this.loadTasks();
            await this.loadTeamMembers();
            this.setupEventListeners();
            this.setupDragAndDrop();
            console.log('Venture Board initialized successfully');
        } catch (error) {
            console.error('Error initializing Venture Board:', error);
            this.handleError(error);
        }
    }

    async loadVentureData() {
        try {
            // Get venture ID from URL or localStorage
            const urlParams = new URLSearchParams(window.location.search);
            const ventureId = urlParams.get('id') || localStorage.getItem('currentVentureId');
            
            if (!ventureId) {
                throw new Error('No venture ID provided');
            }

            const response = await fetch(`${this.apiBaseUrl}/ventures/${ventureId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load venture: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.currentVenture = data.data;
                this.updateVentureHeader();
            } else {
                throw new Error('Invalid venture data');
            }
        } catch (error) {
            console.error('Error loading venture data:', error);
            // Fallback to demo data
            this.currentVenture = {
                id: 'venture_1',
                name: 'Clinic CRM',
                description: 'A Jane App competitor for clinic management',
                stage: 'development',
                progress: 75,
                teamSize: 5
            };
            this.updateVentureHeader();
        }
    }

    async loadTasks() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/ventures/${this.currentVenture.id}/tasks`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load tasks: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.tasks = data.data;
                this.updateTaskBoard();
            } else {
                throw new Error('Invalid tasks data');
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            // Fallback to demo data
            this.tasks = this.getDemoTasks();
            this.updateTaskBoard();
        }
    }

    async loadTeamMembers() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/ventures/${this.currentVenture.id}/members`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load team members: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.teamMembers = data.data;
                this.updateTeamMembers();
            } else {
                throw new Error('Invalid team data');
            }
        } catch (error) {
            console.error('Error loading team members:', error);
            // Fallback to demo data
            this.teamMembers = this.getDemoTeamMembers();
            this.updateTeamMembers();
        }
    }

    updateVentureHeader() {
        if (!this.currentVenture) return;

        const nameElement = document.getElementById('ventureName');
        const descriptionElement = document.getElementById('ventureDescription');
        
        if (nameElement) nameElement.textContent = this.currentVenture.name;
        if (descriptionElement) descriptionElement.textContent = this.currentVenture.description;
    }

    updateTaskBoard() {
        const columns = {
            'backlog': document.querySelector('.board-column:nth-child(1) .task-list'),
            'in-progress': document.querySelector('.board-column:nth-child(2) .task-list'),
            'review': document.querySelector('.board-column:nth-child(3) .task-list'),
            'done': document.querySelector('.board-column:nth-child(4) .task-list')
        };

        // Clear existing tasks
        Object.values(columns).forEach(column => {
            if (column) column.innerHTML = '';
        });

        // Add tasks to appropriate columns
        this.tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            const column = columns[task.status];
            if (column) {
                column.appendChild(taskElement);
            }
        });

        // Update task counts
        this.updateTaskCounts();
    }

    createTaskElement(task) {
        const taskCard = document.createElement('div');
        taskCard.className = `task-card ${task.status === 'done' ? 'completed' : ''}`;
        taskCard.draggable = true;
        taskCard.dataset.taskId = task.id;

        const priorityClass = task.priority || 'medium';
        const assigneeInitials = this.getInitials(task.assignee);
        
        taskCard.innerHTML = `
            <div class="task-header">
                <h4>${task.title}</h4>
                <div class="task-priority ${priorityClass}"></div>
            </div>
            <p>${task.description}</p>
            <div class="task-meta">
                <div class="task-assignee">
                    <div class="assignee-avatar">${assigneeInitials}</div>
                    <span>${task.assignee}</span>
                </div>
                <div class="task-due-date">
                    <i class="fas fa-calendar"></i>
                    <span>${this.formatDate(task.dueDate)}</span>
                </div>
            </div>
            <div class="task-tags">
                ${task.tags.map(tag => `<span class="tag ${tag.toLowerCase()}">${tag}</span>`).join('')}
            </div>
        `;

        return taskCard;
    }

    updateTaskCounts() {
        const counts = {
            'backlog': 0,
            'in-progress': 0,
            'review': 0,
            'done': 0
        };

        this.tasks.forEach(task => {
            if (counts.hasOwnProperty(task.status)) {
                counts[task.status]++;
            }
        });

        // Update count elements
        Object.keys(counts).forEach((status, index) => {
            const countElement = document.querySelector(`.board-column:nth-child(${index + 1}) .task-count`);
            if (countElement) {
                countElement.textContent = counts[status];
            }
        });
    }

    updateTeamMembers() {
        const teamContainer = document.querySelector('.team-members');
        if (!teamContainer) return;

        teamContainer.innerHTML = '';
        
        this.teamMembers.forEach(member => {
            const memberElement = document.createElement('div');
            memberElement.className = 'team-member';
            
            const initials = this.getInitials(member.name);
            const statusClass = member.status || 'offline';
            
            memberElement.innerHTML = `
                <div class="member-avatar">${initials}</div>
                <div class="member-info">
                    <h4>${member.name}</h4>
                    <p>${member.role}</p>
                </div>
                <div class="member-status ${statusClass}"></div>
            `;
            
            teamContainer.appendChild(memberElement);
        });
    }

    setupEventListeners() {
        // Add task button
        const addTaskBtn = document.getElementById('addTask');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.showAddTaskModal());
        }

        // Invite members button
        const inviteMembersBtn = document.getElementById('inviteMembers');
        if (inviteMembersBtn) {
            inviteMembersBtn.addEventListener('click', () => this.showInviteModal());
        }

        // Filter tasks button
        const filterTasksBtn = document.getElementById('filterTasks');
        if (filterTasksBtn) {
            filterTasksBtn.addEventListener('click', () => this.showFilterModal());
        }
    }

    setupDragAndDrop() {
        const columns = document.querySelectorAll('.board-column');
        
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = this.getStatusFromColumn(column);
                
                this.moveTask(taskId, newStatus);
            });
        });

        // Task cards
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-card')) {
                e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
                e.target.classList.add('dragging');
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('task-card')) {
                e.target.classList.remove('dragging');
            }
        });
    }

    getStatusFromColumn(column) {
        const columnIndex = Array.from(column.parentNode.children).indexOf(column);
        const statuses = ['backlog', 'in-progress', 'review', 'done'];
        return statuses[columnIndex] || 'backlog';
    }

    async moveTask(taskId, newStatus) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Update local data
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    task.status = newStatus;
                    this.updateTaskBoard();
                }
            } else {
                throw new Error('Failed to move task');
            }
        } catch (error) {
            console.error('Error moving task:', error);
            this.showErrorMessage('Failed to move task. Please try again.');
        }
    }

    showAddTaskModal() {
        // Create and show add task modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add New Task</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form class="modal-form">
                    <div class="form-group">
                        <label for="taskTitle">Task Title</label>
                        <input type="text" id="taskTitle" required>
                    </div>
                    <div class="form-group">
                        <label for="taskDescription">Description</label>
                        <textarea id="taskDescription" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="taskAssignee">Assignee</label>
                        <select id="taskAssignee">
                            ${this.teamMembers.map(member => 
                                `<option value="${member.name}">${member.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="taskPriority">Priority</label>
                        <select id="taskPriority">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="taskDueDate">Due Date</label>
                        <input type="date" id="taskDueDate">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Task</button>
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
            this.handleAddTask(modal);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
    }

    async handleAddTask(modal) {
        const formData = new FormData(modal.querySelector('.modal-form'));
        const taskData = {
            title: modal.querySelector('#taskTitle').value,
            description: modal.querySelector('#taskDescription').value,
            assignee: modal.querySelector('#taskAssignee').value,
            priority: modal.querySelector('#taskPriority').value,
            dueDate: modal.querySelector('#taskDueDate').value,
            status: 'backlog',
            ventureId: this.currentVenture.id
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.tasks.push(data.data);
                    this.updateTaskBoard();
                    this.closeModal(modal);
                    this.showSuccessMessage('Task added successfully!');
                }
            } else {
                throw new Error('Failed to add task');
            }
        } catch (error) {
            console.error('Error adding task:', error);
            this.showErrorMessage('Failed to add task. Please try again.');
        }
    }

    showInviteModal() {
        // Create and show invite members modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Invite Team Members</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <form class="modal-form">
                    <div class="form-group">
                        <label for="inviteEmail">Email Address</label>
                        <input type="email" id="inviteEmail" required placeholder="member@example.com">
                    </div>
                    <div class="form-group">
                        <label for="inviteRole">Role</label>
                        <select id="inviteRole">
                            <option value="contributor">Contributor</option>
                            <option value="developer">Developer</option>
                            <option value="designer">Designer</option>
                            <option value="advisor">Advisor</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="inviteMessage">Personal Message (Optional)</label>
                        <textarea id="inviteMessage" rows="3" placeholder="Join our venture and help us build something amazing!"></textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Send Invitation</button>
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
            this.handleInviteMember(modal);
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });
    }

    async handleInviteMember(modal) {
        const formData = {
            email: modal.querySelector('#inviteEmail').value,
            role: modal.querySelector('#inviteRole').value,
            message: modal.querySelector('#inviteMessage').value,
            ventureId: this.currentVenture.id
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/ventures/${this.currentVenture.id}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('smartstart_token')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.closeModal(modal);
                this.showSuccessMessage('Invitation sent successfully!');
            } else {
                throw new Error('Failed to send invitation');
            }
        } catch (error) {
            console.error('Error sending invitation:', error);
            this.showErrorMessage('Failed to send invitation. Please try again.');
        }
    }

    closeModal(modal) {
        document.body.removeChild(modal);
    }

    getDemoTasks() {
        return [
            {
                id: 'task_1',
                title: 'User Authentication System',
                description: 'Implement secure login and registration with JWT tokens',
                assignee: 'Brian Chen',
                priority: 'high',
                status: 'backlog',
                dueDate: '2025-12-15',
                tags: ['Backend', 'Security']
            },
            {
                id: 'task_2',
                title: 'Database Schema Design',
                description: 'Design and implement the core database structure',
                assignee: 'Alice Smith',
                priority: 'medium',
                status: 'backlog',
                dueDate: '2025-12-20',
                tags: ['Database', 'Planning']
            },
            {
                id: 'task_3',
                title: 'Frontend Dashboard',
                description: 'Create the main dashboard interface with responsive design',
                assignee: 'John Doe',
                priority: 'high',
                status: 'in-progress',
                dueDate: '2025-12-18',
                tags: ['Frontend', 'UI/UX']
            },
            {
                id: 'task_4',
                title: 'API Documentation',
                description: 'Write comprehensive API documentation',
                assignee: 'Brian Chen',
                priority: 'low',
                status: 'review',
                dueDate: '2025-12-22',
                tags: ['Docs', 'API']
            },
            {
                id: 'task_5',
                title: 'Project Setup',
                description: 'Initialize project structure and development environment',
                assignee: 'Brian Chen',
                priority: 'medium',
                status: 'done',
                dueDate: '2025-12-10',
                tags: ['Setup']
            }
        ];
    }

    getDemoTeamMembers() {
        return [
            {
                name: 'Brian Chen',
                role: 'Lead Developer',
                status: 'online'
            },
            {
                name: 'Alice Smith',
                role: 'Product Manager',
                status: 'away'
            },
            {
                name: 'John Doe',
                role: 'UI/UX Designer',
                status: 'online'
            }
        ];
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }

    formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        console.error('Venture Board Error:', error);
        this.showErrorMessage('An error occurred. Please refresh the page.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VentureBoard();
});
