import { Agency, Location, User } from '../../models/index.js';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';

class AgencyService {
    // Route handler methods with complete HTTP response logic
    async handleGetAllAgencies(req, res) {
        try {
            const { page, limit, active } = req.query;
            const result = await this.getAgencies({ page, limit, active });

            const data = result.rows.map(agency => {
                const { password, ...agencyResponse } = agency.toJSON();
                return agencyResponse;
            });

            let pagination = undefined;
            if (page && limit) {
                pagination = {
                    total: result.count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(result.count / limit)
                };
            }

            res.status(200).json({
                data,
                ...(pagination ? { pagination } : {})
            });
        } catch (error) {
            console.error('Get all agencies error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async handleCreateAgency(req, res) {
        try {
            const agencyData = req.body;
            console.log('Creating agency with data:', agencyData); // Add logging

            const newAgency = await this.createAgency(agencyData);
            const { password, ...agencyResponse } = newAgency.toJSON();

            console.log('Agency created successfully:', agencyResponse); // Add logging
            res.status(201).json(agencyResponse);
        } catch (error) {
            console.error('Create agency error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async handleCreateAgencyAdmin(req, res) {
        const { id: agencyId } = req.params; // Agency ID from URL
        const { firstName, lastName, email, password } = req.body;
        
        try {
            // Check if agency exists
            const agency = await Agency.findByPk(agencyId);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            // Check if email already exists
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already exists' });
            }

            // Hash the password before saving
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create the agency admin user
            const agencyAdmin = await User.create({
                firstName,
                lastName,
                email,
                password, //: hashedPassword, // Store hashed password
                role: 'agencyAdmin',
                agencyId: agencyId,
                isActive: true,
                isSuspended: false
            });

            // Return user without password
            const { password: _, ...userResponse } = agencyAdmin.toJSON();
            res.status(201).json(userResponse);

        } catch (error) {
            console.error('Create agency admin error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    // DELETE Agency Admin - FIXED
    async handleDeleteAgencyAdmin(req, res) {
        const { id: agencyId, adminId } = req.params;
        
        try {
            // Verify the agency exists
            const agency = await Agency.findByPk(agencyId);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            // Find the agency admin belonging to this agency
            const agencyAdmin = await User.findOne({
                where: {
                    id: adminId,
                    agencyId: agencyId,
                    role: 'agencyAdmin'
                }
            });

            if (!agencyAdmin) {
                return res.status(404).json({ message: 'Agency admin not found' });
            }

            // Perform HARD delete (remove from database)
            await agencyAdmin.destroy();

            res.status(200).json({ 
                message: 'Agency admin deleted successfully',
                deletedAdmin: { id: adminId, email: agencyAdmin.email }
            });

        } catch (error) {
            console.error('Delete agency admin error:', error);
            res.status(500).json({ message: error.message });
        }
    }

    async handleGetAgencyAdmins(req, res) {
        const { id: agencyId } = req.params;
        const { limit = 10, offset = 0 } = req.query;

        try {
            // Verify agency exists
            const agency = await Agency.findByPk(agencyId);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            // Get agency admins with pagination
            const { count, rows } = await User.findAndCountAll({
                where: {
                    agencyId: agencyId,
                    role: 'agencyAdmin'
                },
                attributes: { exclude: ['password'] }, // Don't return password
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['createdAt', 'DESC']]
            });

            res.status(200).json({
                rows,
                totalCount: count,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

        } catch (error) {
            console.error('Get agency admins error:', error);
            res.status(500).json({ message: error.message });
        }
    }



    // Add similar try-catch blocks to other handler methods...
    async handleGetAgencyById(req, res) {
        try {
            const { id } = req.params;
            const agency = await this.getAgencyById(id);
            const { password, ...agencyResponse } = agency.toJSON();
            res.status(200).json(agencyResponse);
        } catch (error) {
            console.error('Get agency by ID error:', error);
            res.status(404).json({ error: error.message });
        }
    }

    async handleUpdateAgency(req, res) {
        const { id } = req.params;
        const updateData = req.body;

        if (updateData.password) {
            return res.status(400).json({
                success: false,
                message: 'Use the password change endpoint to update passwords'
            });
        }

        const updatedAgency = await this.updateAgency(id, updateData);
        const { password, ...agencyResponse } = updatedAgency.toJSON();
        res.status(200).json(agencyResponse);
    }

    async handleChangePassword(req, res) {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        await this.changePassword(id, currentPassword, newPassword);
        res.sendStatus(200);
    }

    async handleDeleteAgency(req, res) {
        const { id } = req.params;
        await this.deleteAgency(id);
        res.sendStatus(200);
    }

    async handleGetAgencyLocations(req, res) {
        try {
            const { id } = req.params;
            const user = req.user;

            const locations = await this.getAgencyLocations(id);
            res.status(200).json(locations);
        } catch (error) {
            console.error('Get agency locations error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    async handleCreateLocation(req, res) {
        try {
            const { id } = req.params;
            const locationData = req.body;
            const user = req.user;

            const newLocation = await this.createLocation(id, locationData);
            res.status(201).json(newLocation);
        } catch (error) {
            console.error('Create location error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    async handleDeleteLocation(req, res) {
        try {
            const { agencyId, locationId } = req.params;
            const user = req.user;


            const location = await Location.findOne({
                where: { 
                    id: locationId, 
                    agencyId: agencyId 
                }
            });

            if (!location) {
                return res.status(404).json({ message: 'Location not found' });
            }

            await location.destroy();
            res.status(200).json({ message: 'Location deleted successfully' });
        } catch (error) {
            console.error('Delete location error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Business logic methods
    async createAgency(agencyData) {
        // Check if email already exists
        const existingAgency = await Agency.findOne({ where: { email: agencyData.email } });
        if (existingAgency) {
            throw new Error('Agency with this email already exists');
        }

        // Check if name already exists
        const existingName = await Agency.findOne({ where: { name: agencyData.name } });
        if (existingName) {
            throw new Error('Agency with this name already exists');
        }

        // Check phone uniqueness (ADD THIS)
        if (agencyData.phone) {
            const existingPhone = await Agency.findOne({ where: { phone: agencyData.phone } });
            if (existingPhone) {
                throw new Error('Phone number already exists');
            }
        }


        return await Agency.create({
            ...agencyData,
            isActive: false // Default to inactive for new agencies
        });
    }

    async getAgencies(options = {}) {
        const { page, limit, active } = options;
        const where = {};

        if (active !== undefined) {
            where.isActive = active === 'true' || active === true;
        }

        const queryOptions = {
            attributes: { exclude: ['password'] },
            where,
            order: [['createdAt', 'DESC']]
        };

        if (page && limit) {
            queryOptions.limit = parseInt(limit);
            queryOptions.offset = (parseInt(page) - 1) * parseInt(limit);
        }

        return await Agency.findAndCountAll(queryOptions);
    }

    async getAgencyById(id) {
        const agency = await Agency.findByPk(id);
        if (!agency) {
            throw new Error('Agency not found');
        }
        return agency;
    }

    async updateAgency(id, updateData) {
        if (updateData.email) {
            const existingAgency = await Agency.findOne({ where: { email: updateData.email } });
            if (existingAgency && existingAgency.id !== id) {
                throw new Error('Email already exists for another agency');
            }
        }

        if (updateData.name) {
            const existingName = await Agency.findOne({ where: { name: updateData.name } });
            if (existingName && existingName.id !== id) {
                throw new Error('Agency name already exists');
            }
        }

        const agency = await this.getAgencyById(id);
        return await agency.update(updateData);
    }

    async deleteAgency(id) {
        const agency = await this.getAgencyById(id);
        await agency.destroy();
    }

    async changePassword(agencyId, currentPassword, newPassword) {
        const agency = await this.getAgencyById(agencyId);
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, agency.password);

        if (!isValidCurrentPassword) {
            throw new Error('Current password is incorrect');
        }

        return await agency.update({ password: newPassword });
    }

    async createAgencyAdmin(agencyAdminData) {
        // Check if email already exists
        const existingUser = await User.findOne({ where: { email: agencyAdminData.email } });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        if (agencyAdminData.password) {
            agencyAdminData.password = await bcrypt.hash(agencyAdminData.password, 10);
        }
        return await User.create({ ...agencyAdminData, role: 'agencyAdmin' });
    }
    
    async deleteAgencyAdmin(adminId, agencyId) {
        console.log(`Deleting agency admin: adminId=${adminId}, agencyId=${agencyId}`)
        const agencyAdmin = await User.findOne({ 
            where: { 
                id: adminId, 
                role: 'agencyAdmin',
                agencyId: agencyId
            } 
        });
        if (!agencyAdmin) {
            throw new Error('Agency Admin not found');
        }
        await agencyAdmin.destroy();
    }


    async getAgencyLocations(agencyId) {
        return await Location.findAll({
            where: { agencyId },
            order: [['createdAt', 'DESC']]
        });
    }

    async createLocation(agencyId, locationData) {
        return await Location.create({
            ...locationData,
            agencyId
        });
    }

}

export default AgencyService;