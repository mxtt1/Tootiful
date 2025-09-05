// Global error handler middleware
export const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);

    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
            success: false,
            message: error.errors.map(e => e.message).join(', '),
            type: 'ValidationError'
        });
    }

    // Handle Sequelize unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            success: false,
            message: 'This value already exists',
            type: 'UniqueConstraintError'
        });
    }

    // Handle Sequelize foreign key constraint errors
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            success: false,
            message: 'Referenced record does not exist',
            type: 'ForeignKeyConstraintError'
        });
    }

    // Handle Sequelize database connection errors
    if (error.name === 'SequelizeConnectionError') {
        return res.status(503).json({
            success: false,
            message: 'Database connection error',
            type: 'ConnectionError'
        });
    }

    // Handle other errors
    if (error.message) {
        const message = error.message.toLowerCase();

        const statusCode =
            // Authentication errors 401
            message.includes('invalid email or password') ||
                message.includes('invalid credentials') ||
                message.includes('unauthorized') ? 401 :

                // Not found errors 404
                message.includes('not found') ? 404 :

                    // Conflict errors 409
                    message.includes('already exists') ? 409 :

                        // Bad request errors 400
                        message.includes('invalid') ||
                            message.includes('incorrect') ||
                            message.includes('must be') ||
                            message.includes('required') ? 400 :

                            // Default 500
                            500;

        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }

    // Handle unknown errors
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
};

// Async error wrapper to catch async errors in routes
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
