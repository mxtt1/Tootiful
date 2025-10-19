'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding tutor constraint (non-nullable)...');
    
    await queryInterface.sequelize.query(`
      ALTER TABLE attendance 
      ADD CONSTRAINT attendance_tutorId_fkey 
      FOREIGN KEY ("tutorId") 
      REFERENCES users(id);
      -- No ON DELETE (defaults to RESTRICT/NO ACTION)
    `);
    
    console.log('Tutor constraint added successfully!');
  },

  async down(queryInterface, Sequelize) {
    console.log('Removing tutor constraint...');
    
    await queryInterface.sequelize.query(`
      ALTER TABLE attendance 
      DROP CONSTRAINT IF EXISTS attendance_tutorId_fkey;
    `);
    
    console.log('Tutor constraint removed!');
  }
};