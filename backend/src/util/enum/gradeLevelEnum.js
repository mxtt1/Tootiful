const gradeLevelEnum = Object.freeze({
    // Primary School Levels
    P1: 'Primary 1',
    P2: 'Primary 2',
    P3: 'Primary 3',
    P4: 'Primary 4',
    P5: 'Primary 5',
    P6: 'Primary 6',
    
    // Secondary School Levels
    SEC1: 'Secondary 1',
    SEC2: 'Secondary 2',
    SEC3: 'Secondary 3',
    SEC4: 'Secondary 4',
    SEC5: 'Secondary 5',
    
    // Junior College / Pre-University
    JC1: 'Junior College 1',
    JC2: 'Junior College 2',
    
    // International / Alternative Systems
    GRADE_1: 'Grade 1',
    GRADE_2: 'Grade 2',
    GRADE_3: 'Grade 3',
    GRADE_4: 'Grade 4',
    GRADE_5: 'Grade 5',
    GRADE_6: 'Grade 6',
    GRADE_7: 'Grade 7',
    GRADE_8: 'Grade 8',
    GRADE_9: 'Grade 9',
    GRADE_10: 'Grade 10',
    GRADE_11: 'Grade 11',
    GRADE_12: 'Grade 12',
    
    // Higher Education
    DIPLOMA: 'Diploma',
    DEGREE: 'Degree',
    POSTGRAD: 'Postgraduate',
    
    // Special Categories
    KINDERGARTEN: 'Kindergarten',
    PRESCHOOL: 'Preschool',
    ADULT_LEARNER: 'Adult Learner',
    OTHER: 'Other',
    
    // Helper Methods
    getAllLevels: () => {
        const levels = { ...gradeLevelEnum };
        // Remove helper methods from the values
        delete levels.getAllLevels;
        delete levels.getDisplayValues;
        delete levels.isValidLevel;
        delete levels.getCategory;
        return Object.values(levels);
    },
    
    getDisplayValues: () => {
        return gradeLevelEnum.getAllLevels();
    },
    
    isValidLevel: (level) => {
        return gradeLevelEnum.getAllLevels().includes(level);
    },
    
    getCategory: (level) => {
        const categories = {
            'Primary 1': 'Primary',
            'Primary 2': 'Primary',
            'Primary 3': 'Primary',
            'Primary 4': 'Primary',
            'Primary 5': 'Primary',
            'Primary 6': 'Primary',
            'Secondary 1': 'Secondary',
            'Secondary 2': 'Secondary',
            'Secondary 3': 'Secondary',
            'Secondary 4': 'Secondary',
            'Secondary 5': 'Secondary',
            'Junior College 1': 'Pre-University',
            'Junior College 2': 'Pre-University',
            'Diploma': 'Higher Education',
            'Degree': 'Higher Education',
            'Postgraduate': 'Higher Education',
            'Kindergarten': 'Early Education',
            'Preschool': 'Early Education',
            'Adult Learner': 'Adult Education'
        };
        
        // Handle international grades
        if (level && level.startsWith('Grade')) {
            const gradeNum = parseInt(level.split(' ')[1]);
            if (gradeNum <= 6) return 'Elementary';
            if (gradeNum <= 8) return 'Middle School';
            if (gradeNum <= 12) return 'High School';
        }
        
        return categories[level] || 'Other';
    }
});

export default gradeLevelEnum;