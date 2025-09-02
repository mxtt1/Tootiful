import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';
import bcrypt from 'bcrypt';

// Student Model
const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  gradeLevel: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'e.g. Primary 6, Secondary 1, Grade 10'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'students',
  timestamps: true,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    allowNull: false,
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
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  category: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: 'e.g. Mathematics, Science, Languages'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'subjects',
  timestamps: true
});

// Tutor-Subject Many-to-Many relationship
const TutorSubject = sequelize.define('TutorSubject', {
  tutorId: {
    type: DataTypes.INTEGER,
    references: {
      model: Tutor,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  subjectId: {
    type: DataTypes.INTEGER,
    references: {
      model: Subject,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  experienceLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    allowNull: false,
    defaultValue: 'intermediate'
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
