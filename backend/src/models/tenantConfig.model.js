import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TenantConfig = sequelize.define(
  "TenantConfig",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    agencyId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'agencies',
        key: 'id'
      },
      onDelete: 'CASCADE',
      unique: true, // One config per agency
      comment: "Reference to the agency this config belongs to"
    },
    websiteUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    useCustomTheme: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Store extracted metadata as JSON
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: "Extracted colors, fonts, favicon, etc."
    },
    // Custom theme preferences
    customTheme: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: "Custom theme preferences chosen by agency"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: "tenant_configs",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["agencyId"],
        name: "unique_agency_tenant_config"
      }
    ]
  }
);

export default TenantConfig;