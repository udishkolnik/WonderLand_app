/**
 * SmartStart Journey Tracker
 * Tracks user progress through the 30-day venture pipeline
 */

class JourneyTracker {
    constructor(database) {
        this.database = database;
        this.currentStep = 1;
        this.totalSteps = 6;
        this.steps = [
            { id: 1, name: 'Discovery', description: 'Platform exploration and account creation', duration: 'Day 1-2' },
            { id: 2, name: 'Problem Statement', description: 'Market validation and problem definition', duration: 'Day 3-5' },
            { id: 3, name: 'Sprint 0', description: 'MVP scoping and team building', duration: 'Day 6-7' },
            { id: 4, name: 'MVP Build', description: 'Development phase and collaboration', duration: 'Day 8-25' },
            { id: 5, name: 'Beta Testing', description: 'User testing and feedback collection', duration: 'Day 26-28' },
            { id: 6, name: 'Decision Gate', description: 'Go/no-go decision and scaling strategy', duration: 'Day 29-30' }
        ];
    }

    // Initialize journey for new user
    async initializeJourney(userId) {
        try {
            const journeyData = {
                user_id: userId,
                current_step: 1,
                progress_percentage: 0,
                started_at: new Date().toISOString(),
                completed_steps: JSON.stringify([])
            };

            const result = await this.database.createUserJourney(userId, null, 'discovery', journeyData);
            return result;
        } catch (error) {
            console.error('Failed to initialize journey:', error);
            return { success: false, error: error.message };
        }
    }

    // Get current journey progress
    async getJourneyProgress(userId) {
        try {
            const journeys = await this.database.getUserJourneys(userId);
            if (journeys.length === 0) {
                return null;
            }

            const latestJourney = journeys[0];
            const completedSteps = JSON.parse(latestJourney.stage_data || '{}');
            
            return {
                currentStep: completedSteps.current_step || 1,
                progressPercentage: completedSteps.progress_percentage || 0,
                completedSteps: completedSteps.completed_steps || [],
                startedAt: completedSteps.started_at,
                isComplete: completedSteps.current_step >= this.totalSteps
            };
        } catch (error) {
            console.error('Failed to get journey progress:', error);
            return null;
        }
    }

    // Update journey progress
    async updateJourneyProgress(userId, stepId, stepData = {}) {
        try {
            const progress = await this.getJourneyProgress(userId);
            if (!progress) {
                return { success: false, message: 'Journey not found' };
            }

            // Calculate new progress
            const newProgressPercentage = Math.round((stepId / this.totalSteps) * 100);
            const completedSteps = [...progress.completedSteps];
            
            if (!completedSteps.includes(stepId)) {
                completedSteps.push(stepId);
            }

            const updatedData = {
                current_step: stepId,
                progress_percentage: newProgressPercentage,
                completed_steps: completedSteps,
                last_updated: new Date().toISOString(),
                ...stepData
            };

            const result = await this.database.createUserJourney(
                userId, 
                null, 
                this.steps[stepId - 1].name.toLowerCase().replace(' ', '_'), 
                updatedData
            );

            return { success: true, progress: updatedData };
        } catch (error) {
            console.error('Failed to update journey progress:', error);
            return { success: false, error: error.message };
        }
    }

    // Complete a specific step
    async completeStep(userId, stepId, completionData = {}) {
        try {
            const step = this.steps.find(s => s.id === stepId);
            if (!step) {
                return { success: false, message: 'Invalid step ID' };
            }

            const completionInfo = {
                step_id: stepId,
                step_name: step.name,
                completed_at: new Date().toISOString(),
                ...completionData
            };

            const result = await this.updateJourneyProgress(userId, stepId, completionInfo);
            
            if (result.success) {
                // Check if journey is complete
                if (stepId === this.totalSteps) {
                    await this.completeJourney(userId);
                }
            }

            return result;
        } catch (error) {
            console.error('Failed to complete step:', error);
            return { success: false, error: error.message };
        }
    }

    // Complete entire journey
    async completeJourney(userId) {
        try {
            const completionData = {
                journey_completed: true,
                completed_at: new Date().toISOString(),
                final_progress: 100
            };

            const result = await this.database.createUserJourney(
                userId, 
                null, 
                'journey_complete', 
                completionData
            );

            return result;
        } catch (error) {
            console.error('Failed to complete journey:', error);
            return { success: false, error: error.message };
        }
    }

    // Get step information
    getStepInfo(stepId) {
        return this.steps.find(step => step.id === stepId) || null;
    }

    // Get next step
    getNextStep(currentStepId) {
        if (currentStepId >= this.totalSteps) {
            return null;
        }
        return this.steps.find(step => step.id === currentStepId + 1);
    }

    // Get previous step
    getPreviousStep(currentStepId) {
        if (currentStepId <= 1) {
            return null;
        }
        return this.steps.find(step => step.id === currentStepId - 1);
    }

    // Calculate time remaining
    calculateTimeRemaining(currentStepId) {
        const daysPerStep = [2, 3, 2, 18, 3, 2]; // Days for each step
        const remainingSteps = this.totalSteps - currentStepId + 1;
        let totalDays = 0;
        
        for (let i = currentStepId - 1; i < this.totalSteps; i++) {
            totalDays += daysPerStep[i];
        }
        
        return {
            totalDays: totalDays,
            remainingSteps: remainingSteps,
            estimatedCompletion: new Date(Date.now() + (totalDays * 24 * 60 * 60 * 1000))
        };
    }

    // Generate progress report
    async generateProgressReport(userId) {
        try {
            const progress = await this.getJourneyProgress(userId);
            if (!progress) {
                return null;
            }

            const currentStepInfo = this.getStepInfo(progress.currentStep);
            const nextStepInfo = this.getNextStep(progress.currentStep);
            const timeRemaining = this.calculateTimeRemaining(progress.currentStep);

            return {
                user_id: userId,
                current_step: progress.currentStep,
                current_step_info: currentStepInfo,
                next_step_info: nextStepInfo,
                progress_percentage: progress.progressPercentage,
                completed_steps: progress.completedSteps,
                total_steps: this.totalSteps,
                is_complete: progress.isComplete,
                time_remaining: timeRemaining,
                started_at: progress.startedAt,
                last_updated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to generate progress report:', error);
            return null;
        }
    }

    // Reset journey (for testing or restart)
    async resetJourney(userId) {
        try {
            const result = await this.initializeJourney(userId);
            return result;
        } catch (error) {
            console.error('Failed to reset journey:', error);
            return { success: false, error: error.message };
        }
    }

    // Get journey statistics
    async getJourneyStatistics(userId) {
        try {
            const progress = await this.getJourneyProgress(userId);
            if (!progress) {
                return null;
            }

            const timeRemaining = this.calculateTimeRemaining(progress.currentStep);
            const startDate = new Date(progress.startedAt);
            const currentDate = new Date();
            const daysElapsed = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));

            return {
                days_elapsed: daysElapsed,
                days_remaining: timeRemaining.totalDays,
                completion_rate: progress.progressPercentage,
                steps_completed: progress.completedSteps.length,
                steps_remaining: this.totalSteps - progress.completedSteps.length,
                average_days_per_step: daysElapsed / Math.max(progress.completedSteps.length, 1),
                estimated_completion: timeRemaining.estimatedCompletion,
                is_on_track: daysElapsed <= (progress.currentStep * 5) // Rough estimate
            };
        } catch (error) {
            console.error('Failed to get journey statistics:', error);
            return null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JourneyTracker;
} else {
    window.JourneyTracker = JourneyTracker;
}
