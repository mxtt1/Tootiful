'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add notificationTemplate field
    await queryInterface.addColumn("lessons", "notificationTemplate", {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
    });

    // Add notificationTemplateSubmitted field
    await queryInterface.addColumn("lessons", "notificationTemplateSubmitted", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Add notificationTemplateSubmittedAt field
    await queryInterface.addColumn("lessons", "notificationTemplateSubmittedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add progressionNotificationsSent field
    await queryInterface.addColumn("lessons", "progressionNotificationsSent", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Add notificationTemplateSubmittedBy field
    await queryInterface.addColumn("lessons", "notificationTemplateSubmittedBy", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "SET NULL",
    });

    // Add indexes for better performance
    await queryInterface.addIndex("lessons", {
      fields: ["notificationTemplateSubmitted"],
      name: "idx_lessons_template_submitted",
    });

    await queryInterface.addIndex("lessons", {
      fields: ["progressionNotificationsSent"],
      name: "idx_lessons_progression_sent",
    });

    await queryInterface.addIndex("lessons", {
      fields: ["notificationTemplateSubmittedBy"],
      name: "idx_lessons_template_submitted_by",
    });

    // Add comments for the new columns
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "lessons"."notificationTemplate" IS 'Stores agency-customized notification template with message and lesson links'
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "lessons"."notificationTemplateSubmitted" IS 'Prevents multiple template submissions'
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "lessons"."notificationTemplateSubmittedAt" IS 'When the template was submitted'
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "lessons"."progressionNotificationsSent" IS 'Track if automatic notifications were sent by cron'
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "lessons"."notificationTemplateSubmittedBy" IS 'Which agency admin submitted the template'
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex("lessons", "idx_lessons_template_submitted");
    await queryInterface.removeIndex("lessons", "idx_lessons_progression_sent");
    await queryInterface.removeIndex("lessons", "idx_lessons_template_submitted_by");

    // Remove columns when rolling back
    await queryInterface.removeColumn("lessons", "notificationTemplate");
    await queryInterface.removeColumn("lessons", "notificationTemplateSubmitted");
    await queryInterface.removeColumn("lessons", "notificationTemplateSubmittedAt");
    await queryInterface.removeColumn("lessons", "progressionNotificationsSent");
    await queryInterface.removeColumn("lessons", "notificationTemplateSubmittedBy");
  },
};