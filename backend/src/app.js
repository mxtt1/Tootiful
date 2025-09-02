import express from 'express';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import studentRoutes from './modules/user-management/student.routes.js';
import tutorRoutes from './modules/user-management/tutor.routes.js';
import { seedSubjects } from './seeders/seed-subjects.js';
import { errorHandler } from './middleware/errorHandler.js';


// Load environment variables
dotenv.config();


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (allow all origins for now)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/tutors', tutorRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Database connection and server start
const dropOrphanedTables = async () => {
  try {
    console.log('Checking for orphaned tables...');
    
    // Get all tables in database
    const [results] = await sequelize.query(
      `SELECT TABLE_NAME as table_name FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`
    );
    const existingTables = results.map(row => row.table_name || row.TABLE_NAME).filter(Boolean);
    
    // Get all model table names
    const modelTables = Object.keys(sequelize.models).map(modelName => 
      sequelize.models[modelName].tableName
    );
    
    // System tables to never drop
    const systemTables = ['SequelizeMeta', 'SequelizeData'];
    
    console.log('Existing tables:', existingTables);
    console.log('Model tables:', modelTables);
    
    // Find orphaned tables
    const orphanedTables = existingTables.filter(table => 
      !modelTables.includes(table) && 
      !systemTables.includes(table)
    );
    
    if (orphanedTables.length > 0) {
      console.log(`Found ${orphanedTables.length} orphaned table(s):`, orphanedTables);
      
      // Drop orphaned tables
      for (const table of orphanedTables) {
        await sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
        console.log(`✅ Dropped orphaned table: ${table}`);
      }
    } else {
      console.log('✅ No orphaned tables found');
    }
  } catch (error) {
    console.error('❌ Error during orphaned table cleanup:', error.message);
    // Don't throw - continue with normal startup
  }
};

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Clean up orphaned tables if enabled
    if (process.env.NODE_ENV === 'development' && process.env.DROP_ORPHANED_TABLES === 'true') {
      await dropOrphanedTables();
    }
    
    // Sync database models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully.');
    
    // Seed subjects for dev and test environments
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      await seedSubjects();
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Students API: http://localhost:${PORT}/api/students`);
      console.log(`Tutors API: http://localhost:${PORT}/api/tutors`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();
