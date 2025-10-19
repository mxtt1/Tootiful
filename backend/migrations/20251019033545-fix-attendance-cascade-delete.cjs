'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Fixing attendance cascade delete constraint...');
    
    // First, let's find what constraints actually exist
    const [results] = await queryInterface.sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'attendance' 
      AND constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('Found constraints:', results);
    
    // Drop any foreign key constraints on lessonId
    for (const result of results) {
      const constraintName = result.constraint_name;
      console.log(`Dropping constraint: ${constraintName}`);
      
      try {
        await queryInterface.removeConstraint('attendance', constraintName);
        console.log(`Successfully dropped constraint: ${constraintName}`);
      } catch (error) {
        console.log(`Could not drop constraint ${constraintName}:`, error.message);
      }
    }
    
    // Add the new constraint with CASCADE
    console.log('Adding new constraint with CASCADE delete...');
    await queryInterface.sequelize.query(`
      ALTER TABLE attendance 
      ADD CONSTRAINT attendance_lessonId_fkey 
      FOREIGN KEY ("lessonId") 
      REFERENCES lessons(id) 
      ON DELETE CASCADE;
    `);
    
    console.log('Cascade constraint added successfully!');
  },

  async down(queryInterface, Sequelize) {
    console.log('Reverting cascade constraint...');
    
    // Drop the cascade constraint
    await queryInterface.sequelize.query(`
      ALTER TABLE attendance 
      DROP CONSTRAINT IF EXISTS attendance_lessonId_fkey;
    `);
    
    // Re-add without cascade (default behavior)
    await queryInterface.sequelize.query(`
      ALTER TABLE attendance 
      ADD CONSTRAINT attendance_lessonId_fkey 
      FOREIGN KEY ("lessonId") 
      REFERENCES lessons(id);
    `);
    
    console.log('Constraint reverted to original state.');
  }
};