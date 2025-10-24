import Stripe from "stripe";
import { Lesson, User, StudentPayment } from "../../models/index.js";

class PaymentService {
  constructor() {
    // Initialize Stripe with your secret key (you'll need to add this to your config)
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.PLATFORM_FEE_PERCENTAGE = 0.05; // 5% platform fee
  }

  /**
   * Calculate payment amounts for a lesson enrollment
   * @param {string} lessonId - The lesson ID
   * @returns {Object} Payment calculation details
   */
  async calculateLessonPayment(lessonId) {
    try {
      const lesson = await Lesson.findByPk(lessonId, {
        include: [
          { association: "subject", attributes: ["name"] },
          { association: "tutor", attributes: ["firstName", "lastName"] },
          { association: "agency", attributes: ["name"] },
        ],
      });

      if (!lesson) {
        throw new Error("Lesson not found");
      }

      const lessonFee = parseFloat(lesson.studentRate);
      const platformFee = lessonFee * this.PLATFORM_FEE_PERCENTAGE;
      const totalAmount = lessonFee + platformFee;

      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonFee: lessonFee,
        platformFee: platformFee,
        platformFeePercentage: this.PLATFORM_FEE_PERCENTAGE * 100,
        totalAmount: totalAmount,
        currency: "sgd",
        lesson: {
          title: lesson.title,
          subject: lesson.subject?.name,
          tutor: lesson.tutor
            ? `${lesson.tutor.firstName} ${lesson.tutor.lastName}`
            : "TBD",
          agency: lesson.agency?.name,
          dayOfWeek: lesson.dayOfWeek,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
        },
      };
    } catch (error) {
      console.error("Error calculating lesson payment:", error);
      throw error;
    }
  }

  /**
   * Create a Stripe Payment Intent for lesson enrollment
   * @param {string} studentId - The student's user ID
   * @param {string} lessonId - The lesson ID
   * @returns {Object} Payment intent details
   */
  async createPaymentIntent(studentId, lessonId) {
    try {
      // Get student details
      const student = await User.findByPk(studentId);
      if (!student || student.role !== "student") {
        throw new Error("Invalid student");
      }

      // Calculate payment details
      const paymentDetails = await this.calculateLessonPayment(lessonId);

      // Create Stripe Payment Intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentDetails.totalAmount * 100), // Convert to cents
        currency: paymentDetails.currency,
        metadata: {
          studentId: studentId,
          lessonId: lessonId,
          lessonTitle: paymentDetails.lessonTitle,
          studentName: `${student.firstName} ${student.lastName}`,
          studentEmail: student.email,
        },
        description: `Lesson enrollment: ${paymentDetails.lessonTitle}`,
        // Enable for test mode - no actual charges
        payment_method_types: ["card"],
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        ...paymentDetails,
      };
    } catch (error) {
      console.error("Error creating payment intent:", error);
      throw error;
    }
  }

  /**
   * Confirm payment and enroll student in lesson
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Object} Enrollment confirmation
   */
  async confirmPaymentAndEnroll(paymentIntentId) {
    try {
      // Retrieve payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (paymentIntent.status !== "succeeded") {
        throw new Error("Payment not completed");
      }

      const { studentId, lessonId } = paymentIntent.metadata;

      // Import student service to handle enrollment
      const { default: StudentService } = await import(
        "../user-management/student.service.js"
      );
      const studentService = new StudentService();

      // Enroll student in lesson (using existing business logic)
      const enrollmentResult = await studentService.enrollInLesson(
        studentId,
        lessonId
      );

      return {
        success: true,
        paymentIntentId: paymentIntentId,
        amount: paymentIntent.amount / 100, // Convert back from cents
        currency: paymentIntent.currency,
        studentId: studentId,
        lessonId: lessonId,
        enrollment: enrollmentResult,
      };
    } catch (error) {
      console.error("Error confirming payment and enrollment:", error);
      throw error;
    }
  }

  /**
   * Get payment status
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @returns {Object} Payment status details
   */
  async getPaymentStatus(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      console.error("Error getting payment status:", error);
      throw error;
    }
  }

  /**
   * Create a StudentPayment record
   * @param {Object} data - { studentId, lessonId, amount }
   * @returns {Object} Created payment record
   */
  async createStudentPayment({ studentId, lessonId, amount }) {
    try {
      if (!studentId || !lessonId || !amount) {
        throw new Error("studentId, lessonId, and amount are required");
      }
      const payment = await StudentPayment.create({
        studentId,
        lessonId,
        amount,
        platformFee:
          (amount / (1 + this.PLATFORM_FEE_PERCENTAGE)) *
          this.PLATFORM_FEE_PERCENTAGE,
      });
      return payment;
    } catch (error) {
      console.error("Error creating student payment:", error);
      throw error;
    }
  }

  /**
   * Get StudentPayment records (optionally filter by studentId or lessonId)
   * @param {Object} filter - { studentId, lessonId }
   * @returns {Array} Payment records
   */
  async getStudentPayments({ studentId, lessonId } = {}) {
    try {
      const where = {};
      if (studentId) where.studentId = studentId;
      if (lessonId) where.lessonId = lessonId;

      const payments = await StudentPayment.findAll({
        where,
        include: [
          {
            association: "lesson",
            attributes: ["id", "title"],
            include: [
              {
                association: "agency",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
        order: [["paymentDate", "DESC"]],
      });

      return payments;
    } catch (error) {
      console.error("Error fetching student payments:", error);
      throw error;
    }
  }
}

export default PaymentService;
