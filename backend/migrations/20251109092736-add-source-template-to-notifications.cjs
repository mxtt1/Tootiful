'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add sourceTemplateId field to notifications table
    await queryInterface.addColumn("notifications", "sourceTemplateId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "lessons",
        key: "id",
      },
      onDelete: "SET NULL",
      comment: 'References the lesson that contained the template used to create this notification',
    });

    // Add index for sourceTemplateId
    await queryInterface.addIndex("notifications", {
      fields: ["sourceTemplateId"],
      name: "idx_notifications_source_template",
    });

    // Add comment for the column
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "notifications"."sourceTemplateId" IS 'References the lesson that contained the template used to create this notification'
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex("notifications", "idx_notifications_source_template");

    // Remove column when rolling back
    await queryInterface.removeColumn("notifications", "sourceTemplateId");
  },
};