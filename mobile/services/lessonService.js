import apiClient from "./apiClient.js";

class LessonService {
  // Get all available lessons
  async getAllLessons() {
    try {
      const response = await apiClient.get("/lessons");
      return response.data;
    } catch (error) {
      console.error("Error fetching lessons:", error);
      throw error;
    }
  }

  // Get lesson by ID
  async getLessonById(lessonId) {
    try {
      const response = await apiClient.get(`/lessons/${lessonId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching lesson:", error);
      throw error;
    }
  }

  // Enroll student in lesson
  async enrollStudentInLesson(studentId, lessonId) {
    try {
      const response = await apiClient.post(`/lessons/students/${studentId}`, {
        lessonId: lessonId,
      });
      return response.data;
    } catch (error) {
      console.error("Error enrolling in lesson:", error);
      throw error;
    }
  }

  // Check if student is enrolled in a lesson
  async checkEnrollmentStatus(studentId, lessonId) {
    try {
      const response = await apiClient.get(
        `/lessons/${lessonId}/students/${studentId}/status`
      );
      return response.data;
    } catch (error) {
      console.error("Error checking enrollment status:", error);
      throw error;
    }
  }

  // Unenroll student from lesson
  async unenrollStudentFromLesson(studentId, lessonId) {
    try {
      const response = await apiClient.delete(
        `/lessons/students/${studentId}`,
        {
          lessonId: lessonId,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error unenrolling from lesson:", error);
      throw error;
    }
  }

  // Get student's enrolled lessons
  async getStudentLessons(studentId, ongoingOnly = false) {
    try {
      const url = `/lessons/students/${studentId}${
        ongoingOnly ? "?ongoing=true" : ""
      }`;
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching student lessons:", error);
      throw error;
    }
  }

  // Get available subjects for filtering
  async getSubjects() {
    try {
      const response = await apiClient.get("/subjects");
      return response.data;
    } catch (error) {
      console.error("Error fetching subjects:", error);
      throw error;
    }
  }

  // Payment-related methods

  // Get payment calculation for a lesson
  async getPaymentCalculation(lessonId) {
    try {
      const response = await apiClient.get(`/payments/calculate/${lessonId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching payment calculation:", error);
      throw error;
    }
  }

  // Create payment intent for lesson enrollment
  async createPaymentIntent(lessonId) {
    try {
      const response = await apiClient.post("/payments/create-intent", {
        lessonId: lessonId,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating payment intent:", error);
      throw error;
    }
  }

  // Confirm payment and complete enrollment
  async confirmPaymentAndEnroll(paymentIntentId) {
    try {
      const response = await apiClient.post("/payments/confirm", {
        paymentIntentId: paymentIntentId,
      });
      return response.data;
    } catch (error) {
      console.error("Error confirming payment:", error);
      throw error;
    }
  }

  // Get payment status
  async getPaymentStatus(paymentIntentId) {
    try {
      const response = await apiClient.get(
        `/payments/status/${paymentIntentId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting payment status:", error);
      throw error;
    }
  }
}

export default new LessonService();
