// Lesson and Attendance imports
import Lesson from './lesson.model.js';
import Attendance from './attendance.model.js';
import StudentLesson from './studentLesson.model.js';
import StudentPayment from './studentPayment.model.js';
import TutorPayment from './tutorPayment.model.js';
import GeneratedPaper from './generatedPaper.model.js';

// StudentLesson direct associations (upstream)
StudentLesson.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
StudentLesson.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });
User.hasMany(StudentLesson, { foreignKey: 'studentId', as: 'enrollments' });
Lesson.hasMany(StudentLesson, { foreignKey: 'lessonId', as: 'enrollments' });

// StudentLesson many-to-many links retained for legacy consumers
User.belongsToMany(Lesson, {
  through: StudentLesson,
  foreignKey: 'studentId',
  otherKey: 'lessonId',
  as: 'studentLessons'
});
Lesson.belongsToMany(User, {
  through: StudentLesson,
  foreignKey: 'lessonId',
  otherKey: 'studentId',
  as: 'students'
});

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

// StudentPayment associations
StudentPayment.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
StudentPayment.belongsTo(Lesson, { foreignKey: 'lessonId', as: 'lesson' });
User.hasMany(StudentPayment, { foreignKey: 'studentId', as: 'payments' });
Lesson.hasMany(StudentPayment, { foreignKey: 'lessonId', as: 'payments' });

// Attendance-TutorPayment association
const tutorPaymentForeignKey = { name: 'attendanceId', field: 'attendanceId' };
Attendance.hasOne(TutorPayment, { foreignKey: tutorPaymentForeignKey, as: 'payment' });
TutorPayment.belongsTo(Attendance, { foreignKey: tutorPaymentForeignKey, as: 'attendance' });

// Tutor-TutorPayment association
User.hasMany(TutorPayment, { foreignKey: 'tutorId', as: 'tutorPayments' });
TutorPayment.belongsTo(User, { foreignKey: 'tutorId', as: 'tutor' });

// Tutor-GeneratedPaper association
User.hasMany(GeneratedPaper, { foreignKey: 'tutorId', as: 'generatedPapers' });
GeneratedPaper.belongsTo(User, { foreignKey: 'tutorId', as: 'tutor' });

// Subject-GeneratedPaper association
Subject.hasMany(GeneratedPaper, { foreignKey: 'subjectId', as: 'generatedPapers' });
GeneratedPaper.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

// Notification source template relationship
Notification.belongsTo(Lesson, { foreignKey: 'sourceTemplateId', as: 'sourceTemplate' });
Lesson.hasMany(Notification, { foreignKey: 'sourceTemplateId', as: 'generatedNotifications' });

import Sequelize, { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Model imports
import User from './user.model.js';
import Subject from './subject.model.js';
import PasswordResetToken from './passwordReset.model.js';
import RefreshToken from './refreshToken.model.js';
import Agency from './agency.model.js';
import Location from './location.model.js';
import Notification from './notification.model.js';

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

Notification.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(Notification, {
  foreignKey: 'userId',
  as: 'notifications'
});

Notification.belongsTo(Lesson, {
  foreignKey: 'lessonId',
  as: 'lesson'
});

Lesson.hasMany(Notification, {
  foreignKey: 'lessonId',
  as: 'notifications'
});

Notification.belongsTo(Agency, {
  foreignKey: 'agencyId',
  as: 'agency'
});

Agency.hasMany(Notification, {
  foreignKey: 'agencyId',
  as: 'notifications'
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

export { User, Subject, TutorSubject, Agency, PasswordResetToken, RefreshToken, Location, Sequelize, sequelize, EmailVerificationToken, Lesson, Attendance, StudentLesson, StudentPayment, TutorPayment, GeneratedPaper, Notification };



