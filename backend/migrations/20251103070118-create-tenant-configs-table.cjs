'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create tenant_configs table
    await queryInterface.createTable("tenant_configs", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      agencyId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "agencies",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      websiteUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      useCustomTheme: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      customTheme: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint - one config per agency
    await queryInterface.addConstraint("tenant_configs", {
      fields: ["agencyId"],
      type: "unique",
      name: "unique_agency_tenant_config",
    });

    // Add index for better performance
    await queryInterface.addIndex("tenant_configs", {
      fields: ["agencyId"],
      name: "idx_tenant_configs_agency_id",
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove table when rolling back
    await queryInterface.dropTable("tenant_configs");
  },
};