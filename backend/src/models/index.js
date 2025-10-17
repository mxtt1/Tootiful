// Lesson and Attendance imports + Payment
import Lesson from './lesson.model.js';
import Attendance from './attendance.model.js';
import TutorPayment from './tutorPayment.model.js';
import TutorPayment from './tutorPayment.model.js';

// StudentLesson join table
const StudentLesson = sequelize.define('StudentLesson', {
  studentId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: User, key: 'id' },
    onDelete: 'CASCADE',
    allowNull: false,
  },
  lessonId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: Lesson, key: 'id' },
    onDelete: 'CASCADE',
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true
    }
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true,
      isAfterStartDate(value) {
        if (this.startDate && value <= this.startDate) {
          throw new Error('End date must be after start date');
        }
      }
    }
  }
}, {
  tableName: 'student_lesson',
  timestamps: true
});

// Associations for lessons
User.belongsToMany(Lesson, { through: StudentLesson, foreignKey: 'studentId', otherKey: 'lessonId', as: 'studentLessons' });
Lesson.belongsToMany(User, { through: StudentLesson, foreignKey: 'lessonId', otherKey: 'studentId', as: 'students' });

// Tutor-Lesson association
User.hasMany(Lesson, { foreignKey: 'tutorId', as: 'tutorLessons' });
Lesson.belongsTo(User, { foreignKey: 'tutorId', as: 'tutor' });

// Agency-Lesson association
Agency.hasMany(Lesson, { foreignKey: 'agencyId', as: 'lessons' });
Lesson.belongsTo(Agency, { foreignKey: 'agencyId', as: 'agency' });

// Subject-Lesson association
Subject.hasMany(Lesson, { foreignKey: 'subjectId', as: 'lessons' });
Lesson.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

// Location-Lesson association
Lesson.belongsTo(Location, { foreignKey: 'locationId', as: 'location' });
Location.hasMany(Lesson, { foreignKey: 'locationId', as: 'lessons' });

// Lesson-Attendance association
Lesson.hasMany(Attendance, { foreignKey: 'lessonId', as: 'instances' });
Attendance.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });

// Tutor-Attendance association (for substitutes)
User.hasMany(Attendance, { foreignKey: 'tutorId', as: 'attendanceInstances' });
Attendance.belongsTo(User, { foreignKey: 'tutorId', as: 'tutor' });

// Attendance-TutorPayment association
Attendance.hasOne(TutorPayment, { foreignKey: 'attendanceId', as: 'payment' });
TutorPayment.belongsTo(Attendance, { foreignKey: 'attendanceId', as: 'attendance' });

// Tutor-TutorPayment association
User.hasMany(TutorPayment, { foreignKey: 'tutorId', as: 'tutorPayments' });
TutorPayment.belongsTo(User, { foreignKey: 'tutorId', as: 'tutor' });


import Sequelize, { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Model imports
import User from './user.model.js';
import Subject from './subject.model.js';
import PasswordResetToken from './passwordReset.model.js';
import RefreshToken from './refreshToken.model.js';
import Agency from './agency.model.js';
import Location from './location.model.js';

// Util imports
import experienceLevelEnum from "../util/enum/experienceLevelEnum.js";

import EmailVerificationToken from "./emailVerification.model.js";

// Tutor-Subject Many-to-Many relationship
const TutorSubject = sequelize.define(
  "TutorSubject",
  {
    tutorId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    subjectId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: Subject,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    experienceLevel: {
      type: DataTypes.ENUM(...experienceLevelEnum.getAllLevels()),
      allowNull: false,
      defaultValue: experienceLevelEnum.INTERMEDIATE,
      validate: {
        isValidLevel(value) {
          if (!experienceLevelEnum.isValidLevel(value)) {
            throw new Error(
              `Experience level must be one of: ${experienceLevelEnum
                .getAllLevels()
                .join(", ")}`
            );
          }
        },
      },
      comment: "Tutor experience level for this subject",
    },
    hourlyRate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 45,
      validate: {
        min: 0,
        max: 1000
      },
      comment: "Hourly rate for this subject",
    },
  },
  {
    tableName: "tutor_subjects",
    timestamps: true,
  }
);

// Set up associations
User.belongsToMany(Subject, {
  through: TutorSubject,
  foreignKey: "tutorId",
  otherKey: "subjectId",
  as: "subjects",
});

Subject.belongsToMany(User, {
  through: TutorSubject,
  foreignKey: "subjectId",
  otherKey: "tutorId",
  as: "tutors",
});

PasswordResetToken.belongsTo(User, { foreignKey: "userId", as: "user", allowNull: false });
User.hasMany(PasswordResetToken, { foreignKey: "userId", as: "passwordResetTokens" });

RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user', allowNull: false });
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });

Agency.hasMany(User, { foreignKey: 'agencyId', as: 'tutors' });
User.belongsTo(Agency, { foreignKey: 'agencyId', as: 'tutorAgency' });

Agency.hasMany(User, { foreignKey: 'agencyId', as: 'agencyAdmins' });
User.belongsTo(Agency, { foreignKey: 'agencyId', as: 'agency' });

Agency.hasMany(Location, { foreignKey: 'agencyId', as: 'locations' });
Location.belongsTo(Agency, { foreignKey: 'agencyId', as: 'agency' });
TutorPayment.belongsTo(User, { foreignKey: 'tutorId', as: 'tutor' });


export { User, Subject, TutorSubject, Agency, PasswordResetToken, RefreshToken, Location, Sequelize, sequelize, EmailVerificationToken, Lesson, Attendance, StudentLesson, TutorPayment };
