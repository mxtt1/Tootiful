import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const StudentPayment = sequelize.define('StudentPayment', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },

    lessonId: {
        type: DataTypes.UUID,
        allowNull: false,
    },

    studentId: {
        type: DataTypes.UUID,
        allowNull: false,
    },

    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0,
        },
    },

    platformFee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0,
        }
    },

    paymentDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    

}, {
    tableName: 'student_payments',
    timestamps: true,
});
 
export default StudentPayment;