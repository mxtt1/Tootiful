const experienceLevelEnum = Object.freeze({
    // Basic Experience Levels
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate', 
    ADVANCED: 'advanced',
    EXPERT: 'expert',
    
    // Alternative Display Names (for UI)
    DISPLAY_NAMES: {
        beginner: 'Beginner (0-1 years)',
        intermediate: 'Intermediate (1-3 years)',
        advanced: 'Advanced (3-5 years)',
        expert: 'Expert (5+ years)'
    },
    
    // Helper Methods
    getAllLevels: () => ['beginner', 'intermediate', 'advanced', 'expert'],
    
    getDisplayName: (level) => {
        return experienceLevelEnum.DISPLAY_NAMES[level] || level;
    },
    
    isValidLevel: (level) => {
        return experienceLevelEnum.getAllLevels().includes(level);
    },
    
    // Progression Order (for sorting/filtering)
    getOrder: (level) => {
        const order = {
            beginner: 1,
            intermediate: 2,
            advanced: 3,
            expert: 4
        };
        return order[level] || 0;
    }
});

export default experienceLevelEnum;