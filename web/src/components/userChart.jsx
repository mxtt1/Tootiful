import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const GenericPieChart = ({ 
    data, 
    title, 
    colors = ['#EA4335', '#FBBC05', '#4285B4', '#34A853', '#9334E6', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
    showLabel = true,
    labelType = 'nameValue', // 'nameValue', 'percentage', 'value', 'name'
    outerRadius = 65,
    innerRadius = 30,
    height = 250
}) => {
    // Handle undefined or empty data
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="pie-chart-container" style={{ 
                width: '100%', 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                textAlign: 'center'
            }}>
                {title && (
                    <h4 style={{ marginBottom: '10px', color: '#333' }}>
                        {title}
                    </h4>
                )}
                <div style={{ fontSize: '14px' }}>
                    No data available
                </div>
            </div>
        );
    }

    // data is guaranteed to be an array
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

    const renderCustomLabel = ({ name, value, percent }) => {
        if (!showLabel) return null;
        
        switch (labelType) {
            case 'percentage':
                return `${(percent * 100).toFixed(1)}%`;
            case 'value':
                return `${value}`;
            case 'name':
                return name;
            case 'nameValue':
            default:
                return `${name}: ${value}`;
        }
    };

    const formatTooltip = (value, name, props) => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        return [
            <div key="tooltip-content" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontWeight: 'bold' }}>{name}</span>
                <span>{`Count: ${value}`}</span>
                <span style={{ color: '#666' }}>{`Percentage: ${percentage}%`}</span>
            </div>
        ];
    };

    return (
        <div className="pie-chart-container" style={{ width: '100%', height: '100%' }}>
            {title && (
                <h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#333' }}>
                    {title}
                </h4>
            )}
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={outerRadius}
                        innerRadius={innerRadius}
                        label={renderCustomLabel}
                        dataKey="value"
                        nameKey="name"
                    >
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={colors[index % colors.length]} 
                            />
                        ))}
                    </Pie>
                    <Tooltip 
                        formatter={formatTooltip}
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
                        wrapperStyle={{ 
                            paddingTop: '10px', 
                            fontSize: '12px',
                            display: 'flex',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default GenericPieChart;