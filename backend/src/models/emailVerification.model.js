import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const EmailVerificationToken = sequelize.define(
  "EmailVerificationToken",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4, // matches uuid PK in DB
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    tokenHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "token_hash",
    },
    emailForVerification: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "email_for_verification",
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
    // New field for polymorphic association -> 'user' or 'agency' --> same as PasswordResetToken
    accountType: {
      type: DataTypes.STRING(16), // 'user' | 'agency'
      allowNull: false,
      defaultValue: "user",
      field: "account_type",
    },
    // resend counter
    resentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "resent_count",
    },
  },
  {
    tableName: "email_verification_tokens",
    underscored: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["expires_at"] },
      { name: "evt_userid_accounttype_idx", fields: ["user_id", "account_type"] },
    ],
  }
);

export default EmailVerificationToken;