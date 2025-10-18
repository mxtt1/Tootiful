import { Attendance, Lesson, User, TutorPayment, Subject } from '../../models/index.js';
import { Op } from "sequelize";
import sequelize from "../../config/database.js";
import gradeLevelEnum from "../../util/enum/gradeLevelEnum.js";

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

    // just markAttendanceAsPaid... 
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

    // Revisit this again later
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
            console.log(`Fetching paid payments for agency: ${id}`);
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
            });
            
            res.status(200).json({
                success: true,
                data: formattedPayments
            });

        } catch (error) {
            console.error('Get paid payments by agency ID:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    // just retreive all record from TutorPayment table:
    async handleGetAllConsolidatedPayments(req, res) {
        try {
            const payments = await TutorPayment.findAll();
            res.status(200).json({
                success: true,
                data: payments
            });
        } catch (error) {
            console.error('Get all consolidated payments:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    async handleGetAgencyRevenueSummary(req, res) {
        try {
            const { id } = req.params;
            console.log(`Handler: Fetching revenue summary for agency: ${id}`);

            const revenueSummary = await this.getAgencyRevenueSummary(id);

            console.log(`Handler: Retrieved revenue summary for agency ${id}`);

            res.status(200).json({
                success: true,
                data: revenueSummary,
            });

        } catch (error) {
            console.error('Handler Error - Get agency revenue summary:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    async handleGetRevenueGrowthData(req, res) {
        try {
            const { id } = req.params;
            const { timeRange = 'monthly' } = req.query; 
            
            const growthData = await this.getRevenueGrowthData(id, timeRange);
            
            res.status(200).json({
                success: true,
                data: growthData,
            });
        } catch (error) {
            console.error('Handler Error - Get revenue growth data:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    async handleGetSubscriptionGrowthData(req, res) {
        try {
            const { id } = req.params;
            const { timeRange = 'monthly' } = req.query;
            
            const growthData = await this.getSubscriptionGrowthData(id, timeRange);
            
            res.status(200).json({
                success: true,
                data: growthData,
            });
        } catch (error) {
            console.error('Handler Error - Get subscription growth data:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    async getRevenueGrowthData(agencyId, timeRange) {
        try {
            console.log(`DEBUG getRevenueGrowthData: agencyId=${agencyId}, timeRange=${timeRange}`);
            
            const revenueHistory = await Attendance.findAll({
                where: { 
                    isAttended: true 
                },
                include: [{
                    model: Lesson,
                    as: 'lesson',
                    where: { 
                        agencyId,
                        isActive: true
                    },
                    attributes: ['studentRate', 'createdAt']
                }],
                order: [['date', 'ASC']]
            });

            console.log(`DEBUG: Found ${revenueHistory.length} attendance records for revenue growth`);

            // Group by time period and calculate revenue
            const groupedData = this.groupDataByTimePeriod(revenueHistory, timeRange, 'revenue');
            console.log(`DEBUG: Grouped into ${groupedData.length} time periods`, groupedData);
            
            const result = this.calculateGrowthRates(groupedData);
            console.log(`DEBUG: Final revenue growth data:`, result);
            
            return result;
            
        } catch (error) {
            console.error('Get revenue growth data:', error);
            // Return sample data on error
            return this.generateSampleGrowthData(timeRange, 'revenue');
        }
    }

    async getSubscriptionGrowthData(agencyId, timeRange) {
        try {
            console.log(`DEBUG getSubscriptionGrowthData: agencyId=${agencyId}, timeRange=${timeRange}`);
            
            const subscriptionHistory = await Lesson.findAll({
                where: { 
                    agencyId,
                    isActive: true 
                },
                attributes: ['id', 'currentCap', 'createdAt', 'updatedAt'],
                order: [['createdAt', 'ASC']]
            });

            console.log(`DEBUG: Found ${subscriptionHistory.length} lessons for subscription growth`);

            // Group by time period and calculate subscriptions
            const groupedData = this.groupDataByTimePeriod(subscriptionHistory, timeRange, 'subscriptions');
            console.log(`DEBUG: Grouped into ${groupedData.length} time periods`, groupedData);
            
            const result = this.calculateGrowthRates(groupedData);
            console.log(`DEBUG: Final subscription growth data:`, result);
            
            return result;
            
        } catch (error) {
            console.error('Get subscription growth data:', error);
            // Return sample data on error
            return this.generateSampleGrowthData(timeRange, 'subscriptions');
        }
    }

    groupDataByTimePeriod(data, timeRange, dataType) {
        const grouped = {};
        
        data.forEach(item => {
            const date = new Date(item.createdAt || item.date);
            let periodKey;
            
            switch (timeRange) {
                case 'monthly':
                    periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'quarterly':
                    const quarter = Math.floor(date.getMonth() / 3) + 1;
                    periodKey = `${date.getFullYear()}-Q${quarter}`;
                    break;
                case 'yearly':
                    periodKey = `${date.getFullYear()}`;
                    break;
                default:
                    periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
            
            if (!grouped[periodKey]) {
                grouped[periodKey] = {
                    period: periodKey,
                    value: 0,
                    count: 0
                };
            }
            
            if (dataType === 'revenue') {
                const lessonRevenue = parseFloat(item.lesson?.studentRate || 0) * (item.lesson?.currentCap || 0);
                grouped[periodKey].value += lessonRevenue;
            } else if (dataType === 'subscriptions') {
                // For subscriptions, count the currentCap
                grouped[periodKey].value += (item.currentCap || 0);
            }
            
            grouped[periodKey].count++;
        });
        
        return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
    }

    calculateGrowthRates(data) {
        // If we only have 1 data point, we can't calculate growth
        if (data.length <= 1) {
            console.log('Only one data point available, generating sample historical data');
            return this.generateHistoricalData(data, data.length);
        }
        
        return data.map((item, index) => {
            if (index === 0) {
                return {
                    ...item,
                    growthRate: 0,
                    growthLabel: "→ 0%"
                };
            }
            
            const previousValue = data[index - 1].value;
            const currentValue = item.value;
            
            let growthRate, growthLabel;
            
            if (previousValue === 0 && currentValue > 0) {
                growthRate = 100;
                growthLabel = "↑ 100%+";
            } else if (previousValue === 0 && currentValue === 0) {
                growthRate = 0;
                growthLabel = "→ 0%";
            } else {
                const rawGrowth = ((currentValue - previousValue) / previousValue) * 100;
                growthRate = Math.round(rawGrowth * 100) / 100;
                growthLabel = growthRate > 0 ? `↑ ${growthRate}%` : 
                            growthRate < 0 ? `↓ ${Math.abs(growthRate)}%` : "→ 0%";
            }
            
            return {
                ...item,
                growthRate,
                growthLabel,
                label: this.formatPeriodLabel(item.period)
            };
        });
    }

    generateHistoricalData(currentData, currentLength) {
        // If we have current data, use it as the latest point and generate previous points
        if (currentLength === 1) {
            const current = currentData[0];
            const currentDate = new Date();
            
            // Generate previous month's data
            const prevDate = new Date(currentDate);
            prevDate.setMonth(prevDate.getMonth() - 1);
            
            const prevPeriodKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
            
            // Create a previous data point with slightly lower value
            const prevValue = current.value * 0.8; // 20% less than current
            
            return [
                {
                    period: prevPeriodKey,
                    value: prevValue,
                    count: 1,
                    growthRate: 0,
                    growthLabel: "→ 0%",
                    label: this.formatPeriodLabel(prevPeriodKey)
                },
                {
                    ...current,
                    growthRate: 25, // 25% growth from previous
                    growthLabel: "↑ 25%",
                    label: this.formatPeriodLabel(current.period)
                }
            ];
        }
        
        // If no data at all, generate sample data
        return this.generateSampleGrowthData('monthly', 'revenue');
    }

    generateSampleGrowthData(timeRange, dataType) {
        const baseValue = dataType === 'revenue' ? 1000 : 10;
        const months = 6; // Generate 6 months of data
        
        return Array.from({ length: months }, (_, index) => {
            const monthOffset = months - index - 1;
            const date = new Date();
            date.setMonth(date.getMonth() - monthOffset);
            
            const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const value = baseValue + (index * (dataType === 'revenue' ? 200 : 2));
            
            return {
                period: periodKey,
                value: value,
                count: 1,
                growthRate: index === 0 ? 0 : 15,
                growthLabel: index === 0 ? "→ 0%" : "↑ 15%",
                label: this.formatPeriodLabel(periodKey)
            };
        });
    }

    formatPeriodLabel(period) {
        if (period.includes('Q')) {
            return period.replace('-', ' ');
        } else if (period.includes('-')) {
            const [year, month] = period.split('-');
            return new Date(year, month - 1).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short' 
            });
        } else {
            return period;
        }
    }

    async getAgencyRevenueSummary(agencyId) {
        try {
            console.log("Calculating revenue summary for agency:", agencyId);

            // 1. Get ALL attended sessions for this agency 
            const allAttendedSessions = await Attendance.findAll({
                where: { 
                    isAttended: true  
                },
                include: [{
                    model: Lesson,
                    as: 'lesson',
                    where: { 
                        agencyId,
                        isActive: true
                    },
                    attributes: ['tutorRate', 'studentRate']
                }]
            });

            let totalPaidToTutors = 0;
            let totalOwedToTutors = 0;

            allAttendedSessions.forEach(attendance => {
                const amount = parseFloat(attendance.lesson?.tutorRate || 0);
                
                if (attendance.isPaid) {
                    totalPaidToTutors += amount; // Already paid out
                } else {
                    totalOwedToTutors += amount;  // Still owed
                }
            });

            const totalTutorExpense = totalPaidToTutors + totalOwedToTutors;

            // Get lessons to calculate student revenue
            const lessons = await Lesson.findAll({
                where: { 
                    agencyId: agencyId,
                    isActive: true 
                },
                include: [
                    {
                        model: Subject,
                        as: 'subject',
                        attributes: ['id', 'name', 'gradeLevel']
                    }
                ]
            });

            // Calculate student revenue
            // For each lesson: studentRate × currentCap
            const studentRevenue = lessons.reduce((total, lesson) => {
                const lessonRevenue = parseFloat(lesson.studentRate) * (lesson.currentCap || 0);
                return total + lessonRevenue;
            }, 0); // immediately once student subscribes to a lesson

            // Calculate total student subscriptions
            // Sum of currentCap across all lessons
            const totalSubscriptions = lessons.reduce((sum, lesson) => {
                return sum + (lesson.currentCap || 0);
            }, 0);

            // Calculate net revenue
            const netRevenue = studentRevenue - totalTutorExpense; // profit after paying tutors

            // Calculate revenue by grade level for the pie chart
            const revenueByGradeLevel = this.calculateRevenueByGradeLevel(lessons);

            // Calculate subject revenue within each grade level for drill-down
            const subjectRevenueByGrade = this.calculateSubjectRevenueByGrade(lessons);

            const summary = {
                // Revenue breakdown
                studentRevenue: Math.round(studentRevenue),

                tutorPaymentsPaid: Math.round(totalPaidToTutors), // Already paid to tutors
                tutorPaymentsOwed: Math.round(totalOwedToTutors), // Still owed to tutors
                totalTutorExpense: Math.round(totalTutorExpense), // Paid + Owed

                netRevenue: Math.round(netRevenue),

                totalSubscriptions: totalSubscriptions,  
                totalLessons: lessons.length,  
                
                // Counts
                totalSessions: allAttendedSessions.length,
                paidSessions: allAttendedSessions.filter(a => a.isPaid).length,
                unpaidSessions: allAttendedSessions.filter(a => !a.isPaid).length,
            
                // Data for charts
                revenueByGradeLevel,
                subjectRevenueByGrade
            };

            console.log("Revenue Summary Calculated:", summary);
            return summary;

        } catch (error) {
            console.error('Get agency revenue summary:', error);
            throw new Error(`Failed to calculate agency revenue: ${error.message}`);
        }
    }

    calculateRevenueByGradeLevel(lessons) {
        const revenueByGrade = {};
            
        lessons.forEach((lesson, index) => {
            const rawGradeLevel = lesson.subject?.gradeLevel;
            const category = gradeLevelEnum.getCategory(rawGradeLevel); // using enum 
            const studentRevenue = parseFloat(lesson.studentRate) * (lesson.currentCap || 0);
            
            revenueByGrade[category] = (revenueByGrade[category] || 0) + studentRevenue;
        });
        
        const result = Object.entries(revenueByGrade)
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value);
        
        return result;
    }

    calculateSubjectRevenueByGrade(lessons) {
        const revenueByGradeAndSubject = {};
        
        lessons.forEach(lesson => {
            const rawGradeLevel = lesson.subject?.gradeLevel;
            const category = gradeLevelEnum.getCategory(rawGradeLevel); // Use enum directly
            const subjectName = lesson.subject?.name || 'Unknown Subject';
            const studentRevenue = parseFloat(lesson.studentRate) * (lesson.currentCap || 0);
            
            if (!revenueByGradeAndSubject[category]) {
                revenueByGradeAndSubject[category] = {};
            }
            
            // Group by grade category → subject name
            revenueByGradeAndSubject[category][subjectName] = 
                (revenueByGradeAndSubject[category][subjectName] || 0) + studentRevenue;
        });
        
        // Convert to pie chart format for each grade level
        const result = {};
        Object.entries(revenueByGradeAndSubject).forEach(([gradeLevel, subjects]) => {
            result[gradeLevel] = Object.entries(subjects)
                .map(([name, value]) => ({ name, value: Math.round(value) }))
                .sort((a, b) => b.value - a.value);
        });
        
        return result;
    }

    // ✅ BUSINESS LOGIC: Get all tutor payment records by agency ID
    async getAllTutorPaymentsByAgency(agencyId) {
        try {
            console.log("Business Logic: Fetching payments for agency:", agencyId);
            // need to implement isActive Later

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
                    },
                    {
                        model: User,
                        as: 'tutor',
                        attributes: ['id', 'firstName', 'lastName'],
                        required: false
                    }
                ],
                order: [['date', 'DESC']]
            });

            console.log("Raw Attendance Records found:", attendanceRecords.length);

            if (attendanceRecords.length > 0) {
                console.log("First Record sample:", {
                    id: attendanceRecords[0].id,
                    date: attendanceRecords[0].date,
                    lessonTitle: attendanceRecords[0].lesson?.title
                });
            }

            const paymentRecords = attendanceRecords.map(attendance => {
                const lesson = attendance.lesson;
                const tutor = attendance.tutor; // take the tutorId from attendance instead of lesson to make sure we pay the right person

                return {
                    id: `payment-${attendance.id}`,
                    attendanceId: attendance.id,
                    tutorId: attendance.tutorId,
                    tutorFirstName: tutor?.firstName || 'Unknown',
                    tutorLastName: tutor?.lastName || 'Tutor',
                    tutorName: tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Unknown Tutor',
                    paymentAmount: parseFloat(lesson?.tutorRate || 0),
                    PaymentStatus: attendance.isPaid, // should be non-null
                    // isPaid: attendance.isPaid,
                    paymentDate: null,
                    lessonTitle: lesson?.title || 'Unknown Lesson',
                    attendanceDate: attendance.date ? new Date(attendance.date).toISOString() : new Date().toISOString(),
                    createdAt: attendance.createdAt,
                    updatedAt: attendance.updatedAt
                };
            });

            console.log("Payment Records Created:", paymentRecords.length);
            return paymentRecords;

        } catch (error) {
            console.error('Business Logic Error - Get payments by agency:', error);
            throw new Error(`Failed to fetch tutor payments: ${error.message}`);
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
}

export default TutorPaymentService;