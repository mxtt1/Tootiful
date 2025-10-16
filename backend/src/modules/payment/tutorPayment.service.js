import { Attendance, Lesson, User, TutorPayment } from '../../models/index.js';
import { Op } from "sequelize";
import sequelize from "../../config/database.js";

class TutorPaymentService {

    // ✅ HANDLER: Get all tutor payment records by agency ID
    async handleGetAllTutorPaymentsByAgency(req, res) {
        try {
            const { id } = req.params;
            console.log(`Handler: Fetching tutor payments for agency: ${id}`);

            const paymentRecords = await this.getAllTutorPaymentsByAgency(id);

            console.log(`Handler: Retrieved ${paymentRecords.length} payment records for agency ${id}`);

            res.status(200).json({
                success: true,
                data: paymentRecords,
            });

        } catch (error) {
            console.error('Handler Error - Get tutor payments by agency:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }


    //just markAttendanceAsPaid... 
    async handleMarkAttendanceAsPaid(req, res) {
        try {
            const { id } = req.params;
            console.log(`Handler: Marking attendance as paid for ID: ${id}`);
            const attendanceRecord = await Attendance.findByPk(id);
            if (!attendanceRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'Attendance record not found'
                });
            }

            // Mark the attendance as paid
            attendanceRecord.isPaid = true;
            await attendanceRecord.save();

            console.log(`Handler: Attendance marked as paid for ID: ${id}`);
            res.status(200).json({
                success: true,
                message: 'Attendance marked as paid successfully',
                data: attendanceRecord
            });
        } catch (error) {
            console.error('Handler Error - Mark attendance as paid:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    //Revisit this again later
    async handleCreatePayment(req, res) {

        try {
            const { tutorId, totalAmount, paymentDate, agencyId } = req.body;
            console.log(`Handler: Creating payment for tutor: ${tutorId} with amount: ${totalAmount}`);
            const newPayment = await TutorPayment.create({
                tutorId: tutorId,
                paymentAmount: totalAmount,
                paymentDate: paymentDate,
                agencyId: agencyId
            });
            console.log(`Handler: Payment created successfully for tutor: ${tutorId}`);
            res.status(201).json({
                success: true,
                message: 'Payment created successfully',
                data: newPayment
            });
        } catch (error) {
            console.error('Handler Error - Create payment:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }


    async handleGetPaidPaymentsFromAgencyID(req, res) {
        try {
            const { id } = req.params;
            console.log(`Handler: Fetching paid payments for agency: ${id}`);
            const payments = await TutorPayment.findAll({
                where: {
                    agencyId: id,
                },
                include: [
                    {
                        model: User,
                        as: 'tutor',
                        attributes: ['id', 'firstName', 'lastName'],
                        required: false
                    }
                ],
                order: [['paymentDate', 'DESC']]

            });
            const formattedPayments = payments.map(payment => {
                const tutor = payment.tutor;
                return {
                    id: payment.id,
                    tutorId: payment.tutorId,
                    tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Unknown Tutor',
                    paymentAmount: payment.paymentAmount,
                    paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : null,
                    createdAt: payment.createdAt,
                    updatedAt: payment.updatedAt
                };
            }
            );
            // console.log(`Handler: Retrieved ${formattedPayments.length} paid payments for agency ${id}`);
            res.status(200).json({
                success: true,
                data: formattedPayments
            });

        } catch (error) {
            console.error('Handler Error - Get paid payments by agency ID:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    //just retreive all record from TutorPayment table:
    async handleGetAllConsolidatedPayments(req, res) {
        try {
            const payments = await TutorPayment.findAll();
            res.status(200).json({
                success: true,
                data: payments
            });
        } catch (error) {
            console.error('Handler Error - Get all consolidated payments:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }


    async handleUpdatePaymentStatus(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            console.log(`Handler: Updating payment status for: ${id} with data:`, updateData);
            const result = await this.updatePaymentStatus(id, updateData);
            console.log(`Handler: Payment status updated successfully for: ${id}`);
            res.status(200).json({
                success: true,
                message: 'Payment status updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Handler Error - Update payment status:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }
    // ✅ HANDLER: Get tutor balance summary
    async handleGetTutorBalanceSummary(req, res) {
        try {
            const { tutorId } = req.params;
            const { monthFilter } = req.query;
            console.log(`Handler: Getting balance summary for tutor: ${tutorId}`);

            const balanceSummary = await this.getTutorBalanceSummary(tutorId, monthFilter);

            console.log(`Handler: Retrieved balance summary for tutor ${tutorId}`);

            res.status(200).json({
                success: true,
                data: balanceSummary,
            });

        } catch (error) {
            console.error('Handler Error - Get tutor balance summary:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    // ✅ BUSINESS LOGIC: Get all tutor payment records by agency ID
    async getAllTutorPaymentsByAgency(agencyId) {
        try {
            console.log("🎯 Business Logic: Fetching payments for agency:", agencyId);
            //need to implement isActive Later

            const attendanceRecords = await Attendance.findAll({
                where: {
                    isAttended: true,
                    isPaid: false
                },
                include: [
                    {
                        model: Lesson,
                        as: 'lesson',
                        where: { agencyId: agencyId },
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

            console.log("📊 Raw Attendance Records found:", attendanceRecords.length);

            if (attendanceRecords.length > 0) {
                console.log("🔍 First Record sample:", {
                    id: attendanceRecords[0].id,
                    date: attendanceRecords[0].date,
                    lessonTitle: attendanceRecords[0].lesson?.title
                });
            }

            const paymentRecords = attendanceRecords.map(attendance => {
                const lesson = attendance.lesson;
                const tutor = lesson?.tutor;

                return {
                    id: `payment-${attendance.id}`,
                    attendanceId: attendance.id,
                    tutorId: attendance.tutorId,
                    tutorFirstName: tutor?.firstName || 'Unknown',
                    tutorLastName: tutor?.lastName || 'Tutor',
                    tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Unknown Tutor',
                    paymentAmount: parseFloat(lesson?.tutorRate || 0),
                    PaymentStatus: attendance.isPaid, //shld be non-null
                    // isPaid: attendance.isPaid,
                    paymentDate: null,
                    lessonTitle: lesson?.title || 'Unknown Lesson',
                    attendanceDate: attendance.date ? new Date(attendance.date).toISOString() : new Date().toISOString(),
                    createdAt: attendance.createdAt,
                    updatedAt: attendance.updatedAt
                };
            });

            console.log("🎉 Payment Records Created:", paymentRecords.length);
            return paymentRecords;

        } catch (error) {
            console.error('Business Logic Error - Get payments by agency:', error);
            throw new Error(`Failed to fetch tutor payments: ${error.message}`);
        }
    }

    // ✅ BUSINESS LOGIC: Update payment status (for when payment is made)

    async updatePaymentStatus(id, updateData) {
        try {
            console.log(`Business Logic: Updating payment status for: ${id} with data:`, updateData);

            const paymentRecord = await TutorPayment.findByPk(id);
            if (!paymentRecord) {
                throw new Error('Payment record not found');
            }
            const updatedRecord = await paymentRecord.update(updateData);
            console.log(`Business Logic: Payment statzus updated for: ${id}`);
            return updatedRecord;
        }
        catch (error) {
            console.error('Business Logic Error - Update payment status:', error);
            throw new Error(`Failed to update payment status: ${error.message}`);
        }
    }

    // ✅ BUSINESS LOGIC: Get tutor balance summary
    async getTutorBalanceSummary(tutorId, monthFilter = null) {
        try {
            console.log(`Business Logic: Calculating balance for tutor: ${tutorId}`);

            let whereCondition = { tutorId };

            // Add date filter if provided
            if (monthFilter) {
                const filterDate = new Date(monthFilter);
                const year = filterDate.getFullYear();
                const month = String(filterDate.getMonth() + 1).padStart(2, '0');
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
                        as: 'lesson',
                        attributes: ['id', 'title', 'tutorRate'],
                        required: true
                    }
                ]
            });

            // Calculate totals
            let totalEarnings = 0;
            let totalSessions = attendances.length;

            const sessionBreakdown = attendances.map(attendance => {
                const earnings = parseFloat(attendance.lesson?.tutorRate || 0);
                totalEarnings += earnings;

                return {
                    date: attendance.date,
                    lessonTitle: attendance.lesson?.title,
                    earnings: earnings
                };
            });

            const summary = {
                tutorId,
                totalEarnings,
                totalSessions,
                averagePerSession: totalSessions > 0 ? (totalEarnings / totalSessions) : 0,
                monthFilter,
                sessionBreakdown
            };

            console.log(`Business Logic: Balance summary calculated - Total: $${totalEarnings}, Sessions: ${totalSessions}`);
            return summary;

        } catch (error) {
            console.error('Business Logic Error - Get tutor balance summary:', error);
            throw new Error(`Failed to calculate tutor balance: ${error.message}`);
        }
    }

    // ✅ BUSINESS LOGIC: Get payments by tutor ID
    async getTutorPaymentsByTutorId(tutorId) {
        try {
            console.log(`Business Logic: Fetching payments for tutor: ${tutorId}`);

            const attendanceRecords = await Attendance.findAll({
                where: { tutorId },
                include: [
                    {
                        model: Lesson,
                        as: 'lesson',
                        attributes: ['id', 'title', 'tutorRate'],
                        required: true
                    }
                ],
                order: [['date', 'DESC']]
            });

            const paymentRecords = attendanceRecords.map(attendance => ({
                id: `payment-${attendance.id}`,
                attendanceId: attendance.id,
                tutorId: attendance.tutorId,
                paymentAmount: parseFloat(attendance.lesson?.tutorRate || 0),
                paymentStatus: 'Not Paid', // Default - you might have actual payment tracking
                paymentDate: null,
                lessonTitle: attendance.lesson?.title || 'Unknown Lesson',
                attendanceDate: attendance.date,
                createdAt: attendance.createdAt,
                updatedAt: attendance.updatedAt
            }));

            console.log(`Business Logic: Found ${paymentRecords.length} payments for tutor ${tutorId}`);
            return paymentRecords;

        } catch (error) {
            console.error('Business Logic Error - Get payments by tutor:', error);
            throw new Error(`Failed to fetch tutor payments by tutor ID: ${error.message}`);
        }
    }
}

export default TutorPaymentService;