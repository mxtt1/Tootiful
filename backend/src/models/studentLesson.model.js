import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const StudentLesson = sequelize.define(
  "StudentLesson",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    lessonId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "lessons",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "student_lessons",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["studentId", "lessonId", "startDate"],
        name: "unique_student_lesson_enrollment",
      },
      {
        fields: ["lessonId"],
      },
      {
        fields: ["startDate", "endDate"],
      },
    ],
  }
);

export default StudentLesson;
