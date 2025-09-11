import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import gradeLevelEnum from "../util/enum/gradeLevelEnum.js";

// Subject Model for normalized relationships
const Subject = sequelize.define(
  "Subject",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    gradeLevel: {
      type: DataTypes.ENUM(...gradeLevelEnum.getAllLevels()),
      allowNull: false,
      validate: {
        isValidGrade(value) {
          if (value && !gradeLevelEnum.isValidLevel(value)) {
            throw new Error(`Grade level must be one of the predefined values`);
          }
        },
      },
      comment:
        "Student grade level - Primary, Secondary, JC, International, etc.",
    },
  },
  {
    tableName: "subjects",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["name", "gradeLevel"],
        name: "unique_subject_grade_level",
      },
    ],
  }
);

export default Subject;