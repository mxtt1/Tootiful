import apiClient from '../apiClient';

const tutorService = {
  getTutor: async (id) => apiClient.get(`/tutors/${id}`),
  getTutors: async (params = {}) => {
    const query = Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient.get(`/tutors${query}`);
  },
  updateTutor: async (id, data) => apiClient.patch(`/tutors/${id}`, data),
  deleteTutor: async (id) => apiClient.delete(`/tutors/${id}`),
};

export default tutorService;
