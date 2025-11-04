'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // STEP 1: Add the 4 new columns to agencies table
    await queryInterface.addColumn('agencies', 'websiteUrl', {
      type: Sequelize.STRING(500),
      allowNull: true
    });

    await queryInterface.addColumn('agencies', 'useCustomTheme', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('agencies', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {}
    });

    await queryInterface.addColumn('agencies', 'customTheme', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {}
    });

    console.log('Added customization columns to agencies table');

    // STEP 2: Remove the tenant_configs table (since we're not using it anymore)
    await queryInterface.dropTable('tenant_configs');
    console.log('Removed tenant_configs table');
  },

  async down(queryInterface, Sequelize) {
    // STEP 1: Recreate the tenant_configs table (if rolling back)
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
    console.log('Recreated tenant_configs table');

    // STEP 2: Remove the columns from agencies table
    await queryInterface.removeColumn('agencies', 'websiteUrl');
    await queryInterface.removeColumn('agencies', 'useCustomTheme');
    await queryInterface.removeColumn('agencies', 'metadata');
    await queryInterface.removeColumn('agencies', 'customTheme');
    console.log('Removed customization columns from agencies table');
  }
};