import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './UserChart.css';

const UserPieChart = ({ tutors, students, agencies }) => {
    const data = [
        { name: 'Tutors', value: tutors },
        { name: 'Students', value: students },
        { name: 'Agencies', value: agencies },
    ];

    const COLORS = ['#EA4335', '#FBBC05', '#4285B4'];

    return (
        <div className="pie-chart-container">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius="var(--pie-radius, 100)"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        dataKey="value"
                        nameKey="name"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        formatter={(value, name) => [`${value} users`, name]}
                    />
                    <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        wrapperStyle={{ color: '#333' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default UserPieChart;