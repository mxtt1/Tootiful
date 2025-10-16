import { Attendance, Lesson, User } from '../../models/index.js';
import { Op } from "sequelize";
import sequelize from "../../config/database.js";

class TutorPaymentService {
    // ✅ FIXED: Get all tutor payment records by agency ID
    async handleGetAllTotalTutorBalance(req, res) {
        try {
            const { id } = req.params;
            console.log("🎯 Backend: Fetching payments for agency:", id);

            const attendanceRecords = await Attendance.findAll({
                include: [
                    {
                        model: Lesson,
                        as: 'lesson',
                        where: { agencyId: id },
                        attributes: ['id', 'title', 'tutorRate', 'tutorId'],
                        include: [
                            {
                                model: User,
                                as: 'tutor',
                                attributes: ['id', 'firstName', 'lastName'],
                                required: false
                            }
                        ]
                    }
                ],
                order: [['date', 'DESC']]
            });

            console.log("📊 Raw Attendance Records:", attendanceRecords.length);
            console.log("🔍 First Record:", attendanceRecords[0]);

            const paymentRecords = attendanceRecords.map(attendance => {
                const lesson = attendance.lesson;
                const tutor = lesson?.tutor;

                const record = {
                    id: `payment-${attendance.id}`,
                    attendanceId: attendance.id,
                    tutorId: attendance.tutorId,
                    tutorFirstName: tutor?.firstName || 'Unknown',
                    tutorLastName: tutor?.lastName || 'Tutor',
                    tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Unknown Tutor',
                    paymentAmount: parseFloat(lesson?.tutorRate || 0),
                    paymentStatus: 'Not Paid',
                    paymentDate: null,
                    lessonTitle: lesson?.title || 'Unknown Lesson',
                    attendanceDate: attendance.date,
                    createdAt: attendance.createdAt,
                    updatedAt: attendance.updatedAt
                };

                return record;
            });

            console.log("🎉 Payment Records Created:", paymentRecords.length);
            console.log("📋 First Payment Record:", paymentRecords[0]);
            console.log("📤 Sending Response:", paymentRecords);

            res.status(200).json(paymentRecords);

        } catch (error) {
            console.error('❌ Backend Error:', error);
            console.error('❌ Error Stack:', error.stack);
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    // ✅ OPTIONAL: Keep this method if you need total balance calculation
    async getAllTotalTutorBalance(tutorId, monthFilter = null) {
        try {
            let whereCondition = { tutorId };

            // Add date filter if provided
            if (monthFilter) {
                const year = monthFilter.getFullYear();
                const month = String(monthFilter.getMonth() + 1).padStart(2, '0');
                whereCondition.date = {
                    [Op.like]: `${year}-${month}%`
                };
            }

            // Get attendance records with lesson rates
            const attendances = await Attendance.findAll({
                where: whereCondition,
                include: [
                    {
                        model: Lesson,
                        attributes: ['tutorRate'],
                        required: true
                    }
                ]
            });

            // Sum up all tutor rates
            let totalBalance = 0;
            for (const attendance of attendances) {
                if (attendance.Lesson?.tutorRate) {
                    totalBalance += parseFloat(attendance.Lesson.tutorRate);
                }
            }

            return totalBalance;

        } catch (error) {
            console.error('Error calculating total tutor balance:', error);
            throw error;
        }
    }
}

export default TutorPaymentService;