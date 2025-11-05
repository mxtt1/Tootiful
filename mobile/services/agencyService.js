import apiClient from "./apiClient";

class AgencyService {
  // Get all active agencies for students to view
  async getAllActiveAgencies() {
    try {
      console.log("🏢 Fetching agencies...");
      const response = await apiClient.get("/agencies/public");
      console.log(`✅ Loaded ${response.data?.length || 0} agencies`);
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch agencies:", error.message);
      throw error;
    }
  }

  // Get agency details by ID (includes locations)
  async getAgencyById(agencyId) {
    try {
      console.log(`🏢 Fetching agency: ${agencyId}`);
      const response = await apiClient.get(`/agencies/${agencyId}/public`);
      console.log(`✅ Loaded agency: ${response.data?.name}`);
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch agency details:", error.message);
      throw error;
    }
  }

  // Get agency locations
  async getAgencyLocations(agencyId) {
    try {
      console.log(`📍 Fetching locations for agency: ${agencyId}`);
      const response = await apiClient.get(`/agencies/${agencyId}/locations`);
      console.log(`✅ Loaded ${response.data?.length || 0} locations`);
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch agency locations:", error.message);
      throw error;
    }
  }

  // Get lessons by agency ID
  async getLessonsByAgencyId(agencyId) {
    try {
      console.log(`📚 Fetching lessons for agency: ${agencyId}`);
      const response = await apiClient.get(`/lessons/agency/${agencyId}`);
      console.log(`✅ Loaded ${response.data?.length || 0} lessons`);
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch agency lessons:", error.message);
      throw error;
    }
  }

  // Get all unique locations for filtering
  async getAllLocations() {
    try {
      console.log("📍 Fetching locations...");
      const response = await apiClient.get("/agencies/locations/public");
      console.log(`✅ Loaded ${response.data?.length || 0} locations`);
      return response;
    } catch (error) {
      console.error("❌ Failed to fetch locations:", error.message);
      throw error;
    }
  }

}

export default new AgencyService();
