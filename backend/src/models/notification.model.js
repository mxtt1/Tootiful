import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Notification = sequelize.define('Notification', {
    id: { 
        type: DataTypes.UUID, 
        primaryKey: true, 
        defaultValue: DataTypes.UUIDV4 
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [3, 100]
        }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM(
            'grade_progression',
            'lesson_reminder',
            'system_alert'
        ),
        allowNull: false,
        defaultValue: 'grade_progression'
    },
    lessonId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'lessons',
            key: 'id',
        }
    },
    agencyId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'agencies',
            key: 'id',
        }
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        }
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
    },
    scheduledFor: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'For scheduled notifications (like lesson reminders)'
    },
}, {
    tableName: 'notifications',
    timestamps: true,
    indexes: [
        { fields: ['userId', 'isRead'] },
        { fields: ['userId', 'type'] },
        { fields: ['scheduledFor'] },
        { fields: ['createdAt'] }
    ]
});

export default Notification;