'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Get all active lessons
        const lessons = await queryInterface.sequelize.query(
            `SELECT id, "tutorId" FROM lessons WHERE "tutorId" IS NOT NULL`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        const attendanceRecords = [];

        for (const lesson of lessons) {
            const dates = ['2025-10-10', '2025-10-11', '2025-10-12'];
            for (const date of dates) {
                attendanceRecords.push({
                    id: uuidv4(),
                    lessonId: lesson.id,
                    tutorId: lesson.tutorId,
                    date: date,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }

        if (attendanceRecords.length > 0) {
            await queryInterface.bulkInsert('attendance', attendanceRecords);
        }

        console.log(`Seeded ${attendanceRecords.length} attendance records.`);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('attendance', null, {});
    }
};