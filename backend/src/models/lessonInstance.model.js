import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const LessonInstance = sequelize.define('LessonInstance', {
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
    tableName: 'lesson_instances',
    timestamps: true
});

export default LessonInstance;
