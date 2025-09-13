import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import moment from 'moment';

const GrowthChart = () => {
    const [data, setData] = useState([]);
    
    // sample data for demo purposes
    const generateSampleData = () => {
        const year = moment().year();
        const currentMonthIndex = moment().month();
        const months = Array.from({ length: currentMonthIndex + 1 }, (_, i) =>
            moment().month(i).year(year).format("MMM YYYY")
        );

        return months.map((label, index) => {
            const baseRevenue = 100 + (index * 20);
            const baseSubscriptions = 5 + (index * 2);
            
            return {
                label,
                revenue: baseRevenue + Math.floor(Math.random() * 30),
                subscription: baseSubscriptions + Math.floor(Math.random() * 3)
            };
        });
    };

    const addGrowthRates = (data) => {
        return data.map((entry, index) => {
            if (index === 0) {
                return { 
                    ...entry, 
                    revenueGrowth: 0, 
                    revenueGrowthLabel: "→ 0%",
                    subscriptionGrowth: 0,
                    subscriptionGrowthLabel: "→ 0%"
                };
            }

            // calculate revenue growth
            const prevRevenue = data[index - 1].revenue;
            const currRevenue = entry.revenue;
            let revenueGrowth, revenueGrowthLabel;

            if (prevRevenue === 0 && currRevenue > 0) {
                revenueGrowth = 100;
                revenueGrowthLabel = "↑ 100%+";
            } else if (prevRevenue === 0 && currRevenue === 0) {
                revenueGrowth = 0;
                revenueGrowthLabel = "→ 0%";
            } else {
                const rawRevenueGrowth = ((currRevenue - prevRevenue) / prevRevenue) * 100;
                revenueGrowth = Math.round(rawRevenueGrowth);
                revenueGrowthLabel = revenueGrowth > 0 ? `↑ ${revenueGrowth}%` : revenueGrowth < 0 ? `↓ ${Math.abs(revenueGrowth)}%` : "→ 0%";
            }

            // calculate subscription growth
            const prevSubscription = data[index - 1].subscription;
            const currSubscription = entry.subscription;
            let subscriptionGrowth, subscriptionGrowthLabel;
        
            if (prevSubscription === 0 && currSubscription > 0) {
                subscriptionGrowth = 100;
                subscriptionGrowthLabel = "↑ 100%+";
            } else if (prevSubscription === 0 && currSubscription === 0) {
                subscriptionGrowth = 0;
                subscriptionGrowthLabel = "→ 0%";
            } else {
                const rawSubscriptionGrowth = ((currSubscription - prevSubscription) / prevSubscription) * 100;
                subscriptionGrowth = Math.round(rawSubscriptionGrowth);
                subscriptionGrowthLabel = subscriptionGrowth > 0 ? `↑ ${subscriptionGrowth}%` : subscriptionGrowth < 0 ? `↓ ${Math.abs(subscriptionGrowth)}%` : "→ 0%";
            }

            return { 
                ...entry, 
                revenueGrowth, 
                revenueGrowthLabel,
                subscriptionGrowth,
                subscriptionGrowthLabel
            };
        });
    };

    useEffect(() => {
        // generate sample data 
        const sampleData = generateSampleData();
        const dataWithGrowth = addGrowthRates(sampleData);
        setData(dataWithGrowth);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', margin: '1rem 0' }}>

            {/* Growth Rate Chart */}
            <div style={{ minWidth: '500px', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip
                            formatter={(value, name, props) => {
                                if (name === "Revenue Growth") {
                                    return [props.payload.revenueGrowthLabel, "Revenue Growth"];
                                } else if (name === "Subscription Growth") {
                                    return [props.payload.subscriptionGrowthLabel, "Subscription Growth"];
                                }
                                return [value, name];
                            }}
                        />
                        <Legend />
                        <Area 
                            type="monotone"
                            dataKey="revenueGrowth" 
                            stroke="#0d6efd" 
                            fill="rgba(13, 110, 253, 0.2)" 
                            strokeWidth={2} 
                            name="Revenue Growth"
                        />
                        <Area 
                            type="monotone"
                            dataKey="subscriptionGrowth" 
                            stroke="#ff6b6b" 
                            fill="rgba(255, 107, 107, 0.2)" 
                            strokeWidth={2} 
                            name="Subscription Growth"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default GrowthChart;