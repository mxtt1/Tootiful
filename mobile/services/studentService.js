import apiClient from "./apiClient.js";

class StudentService {
  // Get all students
  async getAllStudents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/students?${queryString}` : "/students";
    return apiClient.get(endpoint);
  }

  // Get student by ID
  async getStudentById(id) {
    return apiClient.get(`/students/${id}`);
  }

  // Create new student
  async createStudent(studentData) {
    return apiClient.post("/students", studentData);
  }

  // Update student
  async updateStudent(id, updateData) {
    return apiClient.patch(`/students/${id}`, updateData);
  }

  // Change student password
  async changePassword(id, passwordData) {
    return apiClient.patch(`/students/${id}/password`, passwordData);
  }

  // Delete student
  async deleteStudent(id) {
    return apiClient.delete(`/students/${id}`);
  }

  // Deactivate student
  async deactivateStudent(id) {
    return apiClient.patch(`/students/${id}/deactivate`);
  }
}

export default new StudentService();
