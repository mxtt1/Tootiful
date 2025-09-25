// location.model.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  /*
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  */
  // Foreign key to Agency
  agencyId: {
    type: DataTypes.UUID,
    allowNull: false,
  }
}, {
  tableName: 'locations',
  timestamps: true,
});

export default Location;