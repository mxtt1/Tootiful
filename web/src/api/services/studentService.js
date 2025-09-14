import apiClient from '../apiClient';

const studentService = {
  getStudent: async (id) => apiClient.get(`/students/${id}`),
  getStudents: async (params = {}) => {
    const query = Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : '';
    return apiClient.get(`/students${query}`);
  },
  updateStudent: async (id, data) => apiClient.patch(`/students/${id}`, data),
  deleteStudent: async (id) => apiClient.delete(`/students/${id}`),
};

export default studentService;
