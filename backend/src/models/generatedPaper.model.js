import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const GeneratedPaper = sequelize.define('GeneratedPaper', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'completed', 'failed']]
    }
  },
  downloadUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  tutorId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  subjectId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  topics: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expoPushToken: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'generated_papers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false // Table doesn't have updated_at
});

export default GeneratedPaper;
