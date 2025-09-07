import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';
import bcrypt from 'bcrypt';
import experienceLevelEnum from '../../util/enum/experienceLevelEnum.js';
import gradeLevelEnum from '../../util/enum/gradeLevelEnum.js';
import { getAllGenders, isValidGender } from '../../util/enum/genderEnum.js';

// Student Model
const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4, // Auto-generate UUID
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    validate: {
      len: [8, 8]
    }
  },
  gender: {
    type: DataTypes.ENUM(...getAllGenders()),
    allowNull: true,
    validate: {
      isValidGender(value) {
        if (value && !isValidGender(value)) {
          throw new Error(`Gender must be one of the predefined values`);
        }
      }
    }
  },
  image: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'URL of profile image'
  },
  gradeLevel: {
    type: DataTypes.ENUM(...gradeLevelEnum.getAllLevels()),
    allowNull: true,
    validate: {
      isValidGrade(value) {
        if (value && !gradeLevelEnum.isValidLevel(value)) {
          throw new Error(`Grade level must be one of the predefined values`);
        }
      }
    },
    comment: 'Student grade level - Primary, Secondary, JC, International, etc.'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
}, {
  tableName: 'students',
  timestamps: true,
  paranoid: true,
  hooks: {
    beforeCreate: async (student) => {
      if (student.password) {
        const saltRounds = 12;
        student.password = await bcrypt.hash(student.password, saltRounds);
      }
    },
    beforeUpdate: async (student) => {
      if (student.changed('password')) {
        const saltRounds = 12;
        student.password = await bcrypt.hash(student.password, saltRounds);
      }
    }
  }
});

// Tutor Model
const Tutor = sequelize.define('Tutor', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4, // Auto-generate UUID
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    validate: {
      len: [8, 8]
    }
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 9999.99
    },
    comment: 'Hourly rate in local currency'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'tutors',
  timestamps: true,
  paranoid: true,
  hooks: {
    beforeCreate: async (tutor) => {
      if (tutor.password) {
        const saltRounds = 12;
        tutor.password = await bcrypt.hash(tutor.password, saltRounds);
      }
    },
    beforeUpdate: async (tutor) => {
      if (tutor.changed('password')) {
        const saltRounds = 12;
        tutor.password = await bcrypt.hash(tutor.password, saltRounds);
      }
    }
  }
});

// Subject Model for normalized relationships
const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4, // Auto-generate UUID
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  gradeLevel: {
    type: DataTypes.ENUM(...gradeLevelEnum.getAllLevels()),
    allowNull: false,
    validate: {
      isValidGrade(value) {
        if (value && !gradeLevelEnum.isValidLevel(value)) {
          throw new Error(`Grade level must be one of the predefined values`);
        }
      }
    },
    comment: 'Student grade level - Primary, Secondary, JC, International, etc.'
  }
}, {
  tableName: 'subjects',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['name', 'gradeLevel'],
      name: 'unique_subject_grade_level'
    }
  ]
});

// Tutor-Subject Many-to-Many relationship
const TutorSubject = sequelize.define('TutorSubject', {
  tutorId: {
    type: DataTypes.UUID,
    references: {
      model: Tutor,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  subjectId: {
    type: DataTypes.UUID,
    references: {
      model: Subject,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  experienceLevel: {
    type: DataTypes.ENUM(...experienceLevelEnum.getAllLevels()),
    allowNull: false,
    defaultValue: experienceLevelEnum.INTERMEDIATE,
    validate: {
      isValidLevel(value) {
        if (!experienceLevelEnum.isValidLevel(value)) {
          throw new Error(`Experience level must be one of: ${experienceLevelEnum.getAllLevels().join(', ')}`);
        }
      }
    },
    comment: 'Tutor experience level for this subject'
  }
}, {
  tableName: 'tutor_subjects',
  timestamps: true
});

// Set up associations
Tutor.belongsToMany(Subject, {
  through: TutorSubject,
  foreignKey: 'tutorId',
  otherKey: 'subjectId',
  as: 'subjects'
});

Subject.belongsToMany(Tutor, {
  through: TutorSubject,
  foreignKey: 'subjectId',
  otherKey: 'tutorId',
  as: 'tutors'
});




export { Student, Tutor, Subject, TutorSubject };
export default { Student, Tutor, Subject, TutorSubject };
