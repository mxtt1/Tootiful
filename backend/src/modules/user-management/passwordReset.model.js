export default (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define(
    "PasswordResetToken",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      userType: {
        // you have two user tables; we key which table this token belongs to
        type: DataTypes.ENUM("student", "tutor"),
        allowNull: false,
      },
      codeHash: {
        // stores a bcrypt hash of either the 6-digit OTP *or* the later resetToken
        type: DataTypes.STRING(255),
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
      indexes: [
        { fields: ["user_id", "user_type"] },
        { fields: ["expires_at"] },
      ],
    }
  );

  return PasswordResetToken;
};
