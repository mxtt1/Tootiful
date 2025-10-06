import { Location } from '../../models/index.js';

class LocationService {
    // Get locations by agency ID
    async getLocationsByAgency(agencyId) {
        try {
            const locations = await Location.findAll({
                where: { agencyId }
            });
            return locations;
        } catch (error) {
            throw new Error(`Failed to fetch locations: ${error.message}`);
        }
    }

    // Route handler
    async handleGetLocationsByAgency(req, res) {
        try {
            const { agencyId } = req.query;

            if (!agencyId) {
                return res.status(400).json({
                    success: false,
                    message: "Agency ID is required"
                });
            }

            console.log("🔍 Fetching locations for agencyId:", agencyId);

            const locations = await this.getLocationsByAgency(agencyId);

            console.log("📍 Found locations:", locations.length);

            res.status(200).json({
                success: true,
                data: locations
            });
        } catch (error) {
            console.error("❌ Error fetching locations:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get all locations (for debugging)
    async handleGetAllLocations(req, res) {
        try {
            const locations = await Location.findAll({
                attributes: ['id', 'address', 'agencyId', 'createdAt'],
                order: [['createdAt', 'DESC']]
            });

            res.status(200).json({
                success: true,
                data: locations,
                total: locations.length
            });
        } catch (error) {
            console.error("❌ Error fetching all locations:", error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

export default LocationService;