'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove any existing primary key if present
    await queryInterface.sequelize.query(`
      ALTER TABLE student_lesson DROP CONSTRAINT IF EXISTS student_lesson_pkey;
    `);
    // Add composite primary key
    await queryInterface.sequelize.query(`
      ALTER TABLE student_lesson ADD PRIMARY KEY ("studentId", "lessonId");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove composite primary key
    await queryInterface.sequelize.query(`
      ALTER TABLE student_lesson DROP CONSTRAINT IF EXISTS student_lesson_pkey;
    `);
    // Optionally, you can add back a single-column primary key if needed
    // await queryInterface.addColumn('student_lesson', 'id', {
    //   type: Sequelize.INTEGER,
    //   autoIncrement: true,
    //   primaryKey: true,
    // });
  }
};

