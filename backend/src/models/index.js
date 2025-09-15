import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Model imports
import User from './user.model.js';
import Subject from './subject.model.js';
import PasswordResetToken from './passwordReset.model.js';
import RefreshToken from './refreshToken.model.js';

// Util imports
import experienceLevelEnum from "../util/enum/experienceLevelEnum.js";

// Tutor-Subject Many-to-Many relationship
const TutorSubject = sequelize.define(
  "TutorSubject",
  {
    tutorId: {
      type: DataTypes.UUID,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    subjectId: {
      type: DataTypes.UUID,
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

export { User, Subject, TutorSubject, PasswordResetToken, RefreshToken };
