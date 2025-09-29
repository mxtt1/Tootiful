import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const EmailVerificationToken = sequelize.define("EmailVerificationToken", {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tokenHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  emailForVerification: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: "email_verification_tokens",
  underscored: true,
  indexes: [{ fields: ["user_id"] }, { fields: ["expires_at"] }],
});

export default EmailVerificationToken;