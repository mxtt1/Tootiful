import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const PasswordResetToken = sequelize.define(
  "PasswordResetToken",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    // Must match Student/Tutor PK type (UUID in your DB)
    userId: {
      type: DataTypes.STRING(36), // or DataTypes.UUID
      allowNull: false,
      field: "user_id",
    },
    userType: {
      type: DataTypes.ENUM("student", "tutor"),
      allowNull: false,
      field: "user_type",
    },
    codeHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "code_hash",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "used_at",
    },
    attempts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "password_reset_tokens",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: false,
  }
);

export { PasswordResetToken };