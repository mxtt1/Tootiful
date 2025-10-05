import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const PasswordResetToken = sequelize.define(
  "PasswordResetToken",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    // Must match Student/Tutor PK type (UUID in your DB)
    userId: {
      type: DataTypes.UUID, // or DataTypes.UUID
      allowNull: false,
      field: "user_id",
    },
    codeHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "code_hash",
    },// New field for polymorphic association -> 'user' or 'agency'
      accountType: {
        type: DataTypes.STRING(16),
        allowNull: false,
        field: "account_type",
        defaultValue: "user", // 'user' | 'agency'
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

export default PasswordResetToken;