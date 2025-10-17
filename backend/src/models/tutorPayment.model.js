import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TutorPayment = sequelize.define('TutorPayment', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },

    agencyId: {
        type: DataTypes.UUID,
        allowNull: false,
    },

    tutorId: {
        type: DataTypes.UUID,
        allowNull: false,
    },

    paymentAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0,
        },
    },

    paymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        validate: {
            isDate: true
        }
    },



}, {
    tableName: 'tutor_payments',
    timestamps: true,
});

export default TutorPayment;