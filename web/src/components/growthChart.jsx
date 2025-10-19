import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import ApiClient from '../api/apiClient';

const GrowthChart = ({ dataType = 'revenue', agencyId, timeRange = 'monthly', currentValue }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!agencyId) return;
    
    fetchGrowthData();
  }, [dataType, agencyId, timeRange, currentValue]);

  const fetchGrowthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = dataType === 'revenue' 
        ? `/tutorPayments/agency/${agencyId}/revenue-growth`
        : `/tutorPayments/agency/${agencyId}/subscription-growth`;
      
      console.log(`🔍 Frontend: Making API call to: ${endpoint}`, {
        agencyId,
        timeRange,
        dataType,
        currentValue
      });
      
      const res = await ApiClient.get(endpoint, {
        params: { timeRange }
      });

      console.log(`🔍 Frontend: API Response:`, res);
      console.log(`🔍 Frontend: Response data:`, res.data);
      console.log(`🔍 Frontend: Is response data an array?`, Array.isArray(res.data));
      console.log(`🔍 Frontend: Response data length:`, res.data?.length);
      let growthData = res.data || [];
      
      // If we have mock data but also have real current value, replace the current period value
      if (growthData.length > 0 && currentValue) {
        console.log(`🔄 Frontend: Replacing mock current value with real value:`, currentValue);
        
        // Find the most recent data point (last in array) and update its value
        const latestDataIndex = growthData.length - 1;
        growthData[latestDataIndex] = {
          ...growthData[latestDataIndex],
          value: currentValue
        };
        
        // Recalculate growth rates if we have multiple data points
        if (growthData.length > 1) {
          const previousValue = growthData[growthData.length - 2].value;
          const newGrowthRate = previousValue === 0 ? 100 : Math.round(((currentValue - previousValue) / previousValue) * 100);
          
          growthData[latestDataIndex] = {
            ...growthData[latestDataIndex],
            growthRate: newGrowthRate,
            growthLabel: newGrowthRate > 0 ? `↑ ${newGrowthRate}%` : 
                        newGrowthRate < 0 ? `↓ ${Math.abs(newGrowthRate)}%` : "→ 0%"
          };
        }
        
        console.log(`🔍 Frontend: Updated growth data:`, growthData);
      }
      
      setData(growthData);
    } catch (err) {
      console.error(`Error fetching ${dataType} growth data:`, err);
      setError(`Failed to load ${dataType} growth data`);
      
      // Even if API fails, we can create basic data with the current value
      if (currentValue) {
        console.log(`🔄 Frontend: Creating fallback data with current value:`, currentValue);
        const fallbackData = [{
          period: new Date().toISOString().slice(0, 7), // Current month
          value: currentValue,
          growthRate: 0,
          growthLabel: "→ 0%",
          label: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        }];
        setData(fallbackData);
      } else {
        setData([]);
      }
    } finally {
      setLoading(false);
    }
  };


  const getChartColor = () => {
    return dataType === 'revenue' 
      ? { stroke: "#28a745", fill: "rgba(40, 167, 69, 0.2)" }
      : { stroke: "#6155F5", fill: "rgba(97, 85, 245, 0.2)" };
  };

  const getChartTitle = () => {
    return dataType === 'revenue' ? 'Revenue Growth' : 'Subscription Growth';
  };

  const formatValue = (value) => {
    if (dataType === 'revenue') {
      return `$${value?.toLocaleString() || '0'}`;
    } else {
      return value?.toLocaleString() || '0';
    }
  };

  const getValueLabel = () => {
    return dataType === 'revenue' ? 'Gross Revenue' : 'Total Subscriptions';
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 8px 0', color: '#333' }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ color: '#6c757d' }}>{getValueLabel()}:</span>
              <span style={{ fontWeight: 'bold', color: dataType === 'revenue' ? '#28a745' : '#6155F5' }}>
                {formatValue(dataItem.value)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ color: '#6c757d' }}>Growth Rate:</span>
              <span style={{ 
                fontWeight: 'bold', 
                color: dataItem.growthRate > 0 ? '#28a745' : dataItem.growthRate < 0 ? '#dc3545' : '#6c757d'
              }}>
                {dataItem.growthLabel}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ 
        minWidth: '500px', 
        height: '300px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#6c757d'
      }}>
        Loading {getChartTitle()}...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minWidth: '500px', 
        height: '300px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#dc3545'
      }}>
        {error}
      </div>
    );
  }

  console.log(`📊 Frontend: Chart rendering with data:`, {
    dataLength: data.length,
    dataSample: data.length > 0 ? data[0] : null,
    hasRequiredFields: data.length > 0 ? {
      hasGrowthRate: data[0].growthRate !== undefined,
      hasLabel: data[0].label !== undefined,
      hasValue: data[0].value !== undefined
    } : null
  });

  if (data.length === 0) {
    console.log(`❌ Frontend: No data available for chart`);
    return (
      <div style={{ 
        minWidth: '500px', 
        height: '300px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#6c757d'
      }}>
        No growth data available
      </div>
    );
  }

  if (data.length === 1) {
    console.log(`⚠️ Frontend: Only one data point, showing value display`);
    const singleData = data[0];
    return (
      <div style={{ 
        minWidth: '500px', 
        height: '300px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#333',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: getChartColor().stroke }}>
          {formatValue(singleData.value)}
        </div>
        <div style={{ fontSize: '1rem', color: '#6c757d', marginTop: '1rem' }}>
          Current {getValueLabel()}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
          More data needed to show growth trends
        </div>
      </div>
    );
  }

  console.log(`✅ Frontend: Rendering chart with ${data.length} data points`);

  const colors = getChartColor();

  return (
    <div style={{ minWidth: '500px', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area 
            type="monotone"
            dataKey="growthRate" 
            stroke={colors.stroke} 
            fill={colors.fill} 
            strokeWidth={2} 
            name="Growth Rate"
            dot={{ fill: colors.stroke, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: colors.stroke }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GrowthChart;