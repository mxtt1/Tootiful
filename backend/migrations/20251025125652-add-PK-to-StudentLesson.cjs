'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Remove the composite primary key constraint
    await queryInterface.removeConstraint('student_lesson', 'student_lesson_pkey');

    // Step 2: Add UUID id column as primary key
    await queryInterface.addColumn('student_lesson', 'id', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    });

    // Step 3: Modify studentId to be a regular foreign key (not part of primary key)
    await queryInterface.changeColumn('student_lesson', 'studentId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });

    // Step 4: Modify lessonId to be a regular foreign key (not part of primary key)
    await queryInterface.changeColumn('student_lesson', 'lessonId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'lessons',
        key: 'id',
      },
      onDelete: 'CASCADE',
    });

    // Step 5: Change startDate and endDate from DATE to DATEONLY
    await queryInterface.changeColumn('student_lesson', 'startDate', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });

    await queryInterface.changeColumn('student_lesson', 'endDate', {
      type: Sequelize.DATEONLY,
      allowNull: false,
    });

    // Step 6: Rename table from student_lesson to student_lessons
    await queryInterface.renameTable('student_lesson', 'student_lessons');

    // Step 7: Add indexes
    await queryInterface.addIndex('student_lessons', ['studentId', 'lessonId', 'startDate'], {
      name: 'unique_student_lesson_enrollment',
      unique: true,
    });

    await queryInterface.addIndex('student_lessons', ['lessonId'], {
      name: 'student_lessons_lesson_id',
    });

    await queryInterface.addIndex('student_lessons', ['startDate', 'endDate'], {
      name: 'student_lessons_date_range',
    });
  },

  async down(queryInterface, Sequelize) {
    // Step 1: Remove indexes
    await queryInterface.removeIndex('student_lessons', 'unique_student_lesson_enrollment');
    await queryInterface.removeIndex('student_lessons', 'student_lessons_lesson_id');
    await queryInterface.removeIndex('student_lessons', 'student_lessons_date_range');

    // Step 2: Rename table back
    await queryInterface.renameTable('student_lessons', 'student_lesson');

    // Step 3: Remove id column
    await queryInterface.removeColumn('student_lesson', 'id');

    // Step 4: Change date columns back to DATE
    await queryInterface.changeColumn('student_lesson', 'startDate', {
      type: Sequelize.DATE,
      allowNull: false,
    });

    await queryInterface.changeColumn('student_lesson', 'endDate', {
      type: Sequelize.DATE,
      allowNull: false,
    });

    // Step 5: Add composite primary key back
    await queryInterface.addConstraint('student_lesson', {
      fields: ['studentId', 'lessonId'],
      type: 'primary key',
      name: 'student_lesson_pkey',
    });
  }
};
