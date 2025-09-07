import apiClient from "./apiClient.js";

class TutorService {
  // Get all tutors
  async getAllTutors(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/tutors?${queryString}` : "/tutors";
    return apiClient.get(endpoint);
  }

  // Get tutor by ID
  async getTutorById(id) {
    return apiClient.get(`/tutors/${id}`);
  }

  // Create new tutor
  async createTutor(tutorData) {
    return apiClient.post("/tutors", tutorData);
  }

  // Update tutor
  async updateTutor(id, updateData) {
    return apiClient.patch(`/tutors/${id}`, updateData);
  }

  // Change tutor password
  async changePassword(id, passwordData) {
    return apiClient.patch(`/tutors/${id}/password`, passwordData);
  }

  // Delete tutor
  async deleteTutor(id) {
    return apiClient.delete(`/tutors/${id}`);
  }

  // Deactivate tutor
  async deactivateTutor(id) {
    return apiClient.patch(`/tutors/${id}/deactivate`);
  }

  // Get all subjects
  async getAllSubjects() {
    return apiClient.get("/tutors/subjects/all");
  }

  // Create new subject
  async createSubject(subjectData) {
    return apiClient.post("/tutors/subjects", subjectData);
  }
}

export default new TutorService();