import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4, // Auto-generate UUID
    allowNull: false
  },
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: 'Hashed refresh token for security'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User ID this token belongs to'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When this refresh token expires'
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this token has been revoked'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this token was last used to refresh'
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  indexes: [
    {
      fields: ['token'],
      unique: true
    },
    {
      fields: ['userId']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

export default RefreshToken;

