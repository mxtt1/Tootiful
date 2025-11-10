'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create notifications table
    await queryInterface.createTable("notifications", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM(
          'grade_progression',
          'lesson_reminder', 
          'system_alert'
        ),
        allowNull: false,
        defaultValue: 'grade_progression',
      },
      lessonId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "lessons",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      agencyId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "agencies",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      scheduledFor: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'For scheduled notifications (like lesson reminders)',
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

    // Add indexes for better query performance
    await queryInterface.addIndex("notifications", {
      fields: ["userId", "isRead"],
      name: "idx_notifications_user_read",
    });

    await queryInterface.addIndex("notifications", {
      fields: ["userId", "type"],
      name: "idx_notifications_user_type",
    });

    await queryInterface.addIndex("notifications", {
      fields: ["scheduledFor"],
      name: "idx_notifications_scheduled",
    });

    await queryInterface.addIndex("notifications", {
      fields: ["createdAt"],
      name: "idx_notifications_created_at",
    });

    await queryInterface.addIndex("notifications", {
      fields: ["lessonId"],
      name: "idx_notifications_lesson_id",
    });

    await queryInterface.addIndex("notifications", {
      fields: ["agencyId"],
      name: "idx_notifications_agency_id",
    });

    // Add comment for the table
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE "notifications" IS 'Stores user notifications for grade progression, lesson reminders, and system alerts'
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex("notifications", "idx_notifications_user_read");
    await queryInterface.removeIndex("notifications", "idx_notifications_user_type");
    await queryInterface.removeIndex("notifications", "idx_notifications_scheduled");
    await queryInterface.removeIndex("notifications", "idx_notifications_created_at");
    await queryInterface.removeIndex("notifications", "idx_notifications_lesson_id");
    await queryInterface.removeIndex("notifications", "idx_notifications_agency_id");

    // Remove table when rolling back
    await queryInterface.dropTable("notifications");

    // Drop the ENUM type (PostgreSQL specific)
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_notifications_type"
    `);
  },
};