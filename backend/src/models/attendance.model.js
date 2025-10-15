import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Attendance = sequelize.define('Attendance', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4, // Auto-generate UUID
        autoIncrement: true
    },
    lessonId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    tutorId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: true
        }
    }
}, {
    tableName: 'attendance',
    timestamps: true,
    indexs: [{
        fields: ['lessonId', 'date'],
        unique: true // Prevent duplicate instances for same lesson on same date
    },
    {
        fields: ['tutorId', 'date'] // Fast tutor schedule lookups
    }
    ]
});

export default Attendance;
