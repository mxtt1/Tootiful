import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Attendance = sequelize.define('Attendance', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4, // Auto-generate UUID
    },
    lessonId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {  
            model: 'lessons', 
            key: 'id'
        },
        onDelete: 'CASCADE' // Cascade when lesson is deleted
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
    },

    isAttended: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    isPaid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'isPaid'
    }

}, {
    tableName: 'attendance',
    timestamps: true,

});

export default Attendance;
