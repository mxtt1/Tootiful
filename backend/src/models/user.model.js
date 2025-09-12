import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import bcrypt from "bcrypt";
import { getAllGenders, isValidGender } from "../util/enum/genderEnum.js";
import gradeLevelEnum from "../util/enum/gradeLevelEnum.js";

// Unified User Model
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 50],
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255],
      },
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: true,
      validate: {
        len: [8, 8],
      },
    },
    gender: {
      type: DataTypes.ENUM(...getAllGenders()),
      allowNull: true,
      validate: {
        isValidGender(value) {
          if (value && !isValidGender(value)) {
            throw new Error(`Gender must be one of the predefined values`);
          }
        },
      },
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "URL of profile image",
    },
    // Student-specific
    gradeLevel: {
      type: DataTypes.ENUM(...gradeLevelEnum.getAllLevels()),
      allowNull: true,
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
    // Tutor-specific
    hourlyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 9999.99,
      },
      comment: "Hourly rate in local currency",
    },
    aboutMe: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    education: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // Role
    role: {
      type: DataTypes.ENUM("student", "tutor", "admin"),
      allowNull: false,
      comment: "User role: student, tutor, or admin",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    paranoid: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const saltRounds = 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const saltRounds = 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      },
    },
  }
);

export default User;
