'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Provided locations (from CSV)
    const locations = [
      { id: '5f6b3a20-68e6-4131-b268-3d0e29c266eb', address: 'lotto', agencyId: '62e03266-4b20-4d12-85b3-ff73b6383357' },
      { id: '26a88285-3f56-4f0b-a14e-b9a2da6aa6d2', address: 'bishan', agencyId: '62e03266-4b20-4d12-85b3-ff73b6383357' },
      { id: 'b82843eb-817d-46bc-87d8-92051873e74b', address: 'ang mo kio', agencyId: '62e03266-4b20-4d12-85b3-ff73b6383357' }
    ];

    // Example subjects (pick any two)
    const subjects = [
      { id: '6006ea8a-af54-412e-adfa-77ca1834bee4', name: 'Mathematics', description: 'Basic arithmetic, fractions, simple algebra', gradeLevel: 'Primary 6' },
      { id: '2916be2e-2546-454b-9b8e-ff09cefe97c1', name: 'English', description: 'Basic grammar, reading comprehension, creative writing', gradeLevel: 'Primary 6' }
    ];

    const tutorId = 'a8c736d3-b166-4bf9-b427-674802bfc447';
    const agencyId = '62e03266-4b20-4d12-85b3-ff73b6383357';

    const lessons = [];
    for (const location of locations) {
      for (const subject of subjects) {
        lessons.push({
          id: Sequelize.literal('uuid_generate_v4()'),
          locationId: location.id,
          agencyId: agencyId,
          subjectId: subject.id,
          tutorId,
          dayOfWeek: 'monday',
          startTime: '09:00:00',
          endTime: '10:30:00',
          title: `${subject.name} (${subject.gradeLevel}) at ${location.address}`,
          isActive: true,
          description: subject.description,
          studentRate: 40.00,
          totalCap: 10,
          currentCap: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    await queryInterface.bulkInsert('lessons', lessons, {});
  },

  async down (queryInterface, Sequelize) {
    // Remove lessons seeded for the specific tutor
    await queryInterface.bulkDelete('lessons', {
      tutorId: 'a8c736d3-b166-4bf9-b427-674802bfc447'
    }, {});
  }
};
