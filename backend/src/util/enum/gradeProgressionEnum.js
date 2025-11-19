// gradeProgressionEnum.js - UPDATED VERSION
import gradeLevelEnum from './gradeLevelEnum.js';

const gradeProgressionEnum = {
  // Preschool to Primary
  'Preschool': 'Kindergarten',
  'Kindergarten': 'Primary 1',

  // Primary School Progressions - USE THE SAME NAMES AS YOUR SUBJECTS
  'Primary 1': 'Primary 2',
  'Primary 2': 'Primary 3', 
  'Primary 3': 'Primary 4',
  'Primary 4': 'Primary 5',
  'Primary 5': 'Primary 6',

  // Bridge: Primary to Secondary
  'Primary 6': 'Secondary 1',

  // Secondary School Progressions
  'Secondary 1': 'Secondary 2',
  'Secondary 2': 'Secondary 3',
  'Secondary 3': 'Secondary 4',
  'Secondary 4': 'Secondary 5',

  // Bridge: Secondary to JC
  'Secondary 4': 'Junior College 1', // O-Level path
  'Secondary 5': 'Junior College 1', // N(A)-Level path

  // Junior College Progressions
  'Junior College 1': 'Junior College 2',

  // International Grades Progressions
  'Grade 1': 'Grade 2',
  'Grade 2': 'Grade 3',
  'Grade 3': 'Grade 4',
  'Grade 4': 'Grade 5',
  'Grade 5': 'Grade 6',
  'Grade 6': 'Grade 7',
  'Grade 7': 'Grade 8',
  'Grade 8': 'Grade 9',
  'Grade 9': 'Grade 10',
  'Grade 10': 'Grade 11',
  'Grade 11': 'Grade 12',

  // Final grades - no progression
  'Junior College 2': null,
  'Grade 12': null,
};

    // Helper functions
    export const getNextGradeLevel = (currentGradeLevel) => {  
    console.log(`🔍 DEBUG - getNextGradeLevel called with: "${currentGradeLevel}"`);
    const result = gradeProgressionEnum[currentGradeLevel] || null;  // Look up in the enum object
    console.log(`🔍 DEBUG - getNextGradeLevel result:`, result);
    return result;
    };

export const canProgressToNextGrade = (currentGradeLevel) => {
  return (
    gradeProgressionEnum[currentGradeLevel] !== null &&
    gradeProgressionEnum[currentGradeLevel] !== undefined
  );
};

export default gradeProgressionEnum;