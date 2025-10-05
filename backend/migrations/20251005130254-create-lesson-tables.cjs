'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Create lessons table
    await queryInterface.createTable('lessons', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'locations', key: 'id' }
      },
      agencyId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'agencies', key: 'id' }
      },
      subjectId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'subjects', key: 'id' }
      },
      tutorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      dayOfWeek: {
        type: Sequelize.ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday'),
        allowNull: false
      },
      startTime: {
        type: Sequelize.TIME,
        allowNull: false
      },
      endTime: {
        type: Sequelize.TIME,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      description: {
        type: Sequelize.STRING
      },
      studentRate: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: false
      },
      totalCap: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      currentCap: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create student_lesson join table
    await queryInterface.createTable('student_lesson', {
      studentId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      lessonId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'lessons', key: 'id' },
        onDelete: 'CASCADE'
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create lesson_instances table
    await queryInterface.createTable('lesson_instances', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      lessonId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'lessons', key: 'id' }
      },
      tutorId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('lesson_instances');
    await queryInterface.dropTable('student_lesson');
    await queryInterface.dropTable('lessons');
  }
};
