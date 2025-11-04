import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import bcrypt from "bcrypt";

const Agency = sequelize.define(
  "Agency",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
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
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    aboutUs: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    // NEW: Branding and customization fields
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
    },
    // Custom theme preferences
    customTheme: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },


    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isSuspended: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "agencies",
    timestamps: true,
    hooks: {
      async beforeCreate(agency) {
        if (agency.password) {
          agency.password = await bcrypt.hash(agency.password, 10);
        }
      },
      async beforeUpdate(agency) {
        if (agency.changed("password")) {
          agency.password = await bcrypt.hash(agency.password, 10);
        }
      },
    },
  }
);

export default Agency;