import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const UserPieChart = ({ tutors, students, agencies }) => {
    const data = [
        { name: 'Tutors', value: tutors },
        { name: 'Students', value: students },
        { name: 'Agencies', value: agencies },
    ];

    const COLORS = ['#EA4335', '#FBBC05', '#4285B4'];

    return (
        <div className="pie-chart-container" style={{ width: '100%', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={65}
                        innerRadius={30}
                        label
                        dataKey="value"
                        nameKey="name"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        formatter={(value, name) => {
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <span>{`${value}`}</span>
                                    <span style={{ color: '#888' }}>{name}</span>
                                </div>
                            );
                        }}
                        contentStyle={{
                            padding: '10px',
                            borderRadius: '4px',
                            backgroundColor: '#fff',
                            boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
                        }}

                    />
                    <Legend 
                        iconSize={10}
                        iconType="circle"
                        layout="horizontal"
                        verticalAlign="bottom"
                        wrapperStyle={{ paddingTop: '10px', fontSize: '14px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default UserPieChart;
