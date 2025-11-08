// Import the base grade levels for reference
import gradeLevelEnum from './gradeLevelEnum.js';

const gradeProgressionEnum = {
  // Primary School Progressions
  [gradeLevelEnum.PRESCHOOL]: gradeLevelEnum.KINDERGARTEN,
  [gradeLevelEnum.KINDERGARTEN]: gradeLevelEnum.GRADE_1,
  [gradeLevelEnum.P1]: gradeLevelEnum.P2,
  [gradeLevelEnum.P2]: gradeLevelEnum.P3,
  [gradeLevelEnum.P3]: gradeLevelEnum.P4,
  [gradeLevelEnum.P4]: gradeLevelEnum.P5,
  [gradeLevelEnum.P5]: gradeLevelEnum.P6,
  
  // Secondary School Progressions
  [gradeLevelEnum.SEC1]: gradeLevelEnum.SEC2,
  [gradeLevelEnum.SEC2]: gradeLevelEnum.SEC3,
  [gradeLevelEnum.SEC3]: gradeLevelEnum.SEC4,
  [gradeLevelEnum.SEC4]: gradeLevelEnum.SEC5,
  
  // Junior College Progressions
  [gradeLevelEnum.JC1]: gradeLevelEnum.JC2,
  
  // International Grades Progressions
  [gradeLevelEnum.GRADE_1]: gradeLevelEnum.GRADE_2,
  [gradeLevelEnum.GRADE_2]: gradeLevelEnum.GRADE_3,
  [gradeLevelEnum.GRADE_3]: gradeLevelEnum.GRADE_4,
  [gradeLevelEnum.GRADE_4]: gradeLevelEnum.GRADE_5,
  [gradeLevelEnum.GRADE_5]: gradeLevelEnum.GRADE_6,
  [gradeLevelEnum.GRADE_6]: gradeLevelEnum.GRADE_7,
  [gradeLevelEnum.GRADE_7]: gradeLevelEnum.GRADE_8,
  [gradeLevelEnum.GRADE_8]: gradeLevelEnum.GRADE_9,
  [gradeLevelEnum.GRADE_9]: gradeLevelEnum.GRADE_10,
  [gradeLevelEnum.GRADE_10]: gradeLevelEnum.GRADE_11,
  [gradeLevelEnum.GRADE_11]: gradeLevelEnum.GRADE_12,
  
  // Final grades - no progression
  [gradeLevelEnum.P6]: null,
  [gradeLevelEnum.SEC5]: null,
  [gradeLevelEnum.JC2]: null,
  [gradeLevelEnum.GRADE_12]: null,
};

// Helper functions
export const getNextGradeLevel = (currentGradeLevel) => {
  return gradeProgressionEnum[currentGradeLevel] || null;
};

export const canProgressToNextGrade = (currentGradeLevel) => {
  return gradeProgressionEnum[currentGradeLevel] !== null && gradeProgressionEnum[currentGradeLevel] !== undefined;
};

export const getNextGradeOptions = (currentSubject) => {
  if (!currentSubject) return null;
  
  const nextGrade = getNextGradeLevel(currentSubject.gradeLevel);
  if (!nextGrade) {
    return {
      canProgress: false,
      message: `No next grade level available for ${currentSubject.gradeLevel}`
    };
  }
  
  return {
    canProgress: true,
    nextGrade,
    message: `Progress to ${currentSubject.name} ${nextGrade}`
  };
};

export default gradeProgressionEnum;