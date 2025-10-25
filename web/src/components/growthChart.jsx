import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import ApiClient from '../api/apiClient';

const GrowthChart = ({ 
  dataType = 'revenue', 
  agencyId, 
  timeRange = 'monthly', 
  location = 'all', 
  currentValue,
  isAdmin = false // Add this prop
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // For admin dashboard, we don't need agencyId
    if (!isAdmin && !agencyId) return;
    
    fetchGrowthData();
  }, [dataType, agencyId, timeRange, location, isAdmin]);

  // Helper functions
  const formatValue = (value) => {
    if (dataType === 'revenue') {
      return `$${value?.toLocaleString() || '0'}`;
    }
    return value?.toString() || '0';
  };

  const getValueLabel = () => {
    return dataType === 'revenue' ? 'Revenue' : 'Subscriptions';
  };

  const getChartColor = () => {
    return dataType === 'revenue' 
      ? { stroke: '#28a745', fill: 'rgba(40, 167, 69, 0.1)' }
      : { stroke: '#6155F5', fill: 'rgba(97, 85, 245, 0.1)' };
  };

  const getChartTitle = () => {
    return dataType === 'revenue' ? 'Revenue Growth' : 'Subscription Growth';
  };

  // Format Y-axis ticks based on data type
  const formatYAxis = (value) => {
    if (dataType === 'revenue') {
      if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}k`;
      }
      return `$${value}`;
    } else {
      return value;
    }
  };

  const fetchGrowthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint;
      
      if (isAdmin) {
        // Use admin endpoints
        endpoint = dataType === 'revenue' 
          ? `/analytics/admin/revenue-growth`
          : `/analytics/admin/subscription-growth`;
      } else {
        // Use agency endpoints
        endpoint = dataType === 'revenue' 
          ? `/analytics/agency/${agencyId}/revenue-growth`
          : `/analytics/agency/${agencyId}/subscription-growth`;
      }
      
      console.log(`Fetching ${dataType} growth data`, {
        isAdmin,
        agencyId,
        timeRange,
        location
      });
      
      const res = await ApiClient.get(endpoint, {
        params: { 
          timeRange,
          location: location !== 'all' ? location : undefined
        }
      });

      console.log(`API Response:`, res);
      
      // Extract data from the correct location in response
      let growthData = res.data?.data || res.data || [];
      
      console.log(`Processed growth data:`, growthData);
      
      // Ensure we have the proper data structure
      if (growthData.length > 0) {
        growthData = growthData.map(item => ({
          ...item,
          // Make sure we have the required fields
          label: item.label || item.period,
          value: item.value || 0,
          growthRate: item.growthRate || 0,
          growthLabel: item.growthLabel || "→ 0%"
        }));
      }

      // Replace fake data with real current value if available
      if (growthData.length > 0 && currentValue !== undefined && currentValue !== null) {
        const latestIndex = growthData.length - 1;
        const latestDataPoint = growthData[latestIndex];
        
        if (latestDataPoint.value !== currentValue) {
          console.log(`Replacing chart value ${latestDataPoint.value} with current value ${currentValue}`, {
            latestValue: latestDataPoint.value,
            currentValue
          });
          
          growthData[latestIndex] = {
            ...latestDataPoint,
            value: currentValue
          };
          
          // Recalculate growth rate if we have previous data
          if (latestIndex > 0) {
            const previousValue = growthData[latestIndex - 1].value;
            const newGrowthRate = previousValue === 0 ? 100 : 
                                Math.round(((currentValue - previousValue) / previousValue) * 100);
            
            growthData[latestIndex] = {
              ...growthData[latestIndex],
              growthRate: newGrowthRate,
              growthLabel: newGrowthRate > 0 ? `↑ ${newGrowthRate}%` : 
                         newGrowthRate < 0 ? `↓ ${Math.abs(newGrowthRate)}%` : "→ 0%"
            };
          }
        }
      }

      console.log('Final data structure:', {
        response: res.data,
        extractedData: growthData,
        dataLength: growthData.length,
        firstItem: growthData[0],
        currentValue,
        hasCurrentValue: currentValue !== undefined
      });
      
      setData(growthData);
    } catch (err) {
      console.error(`Error fetching ${dataType} growth data:`, err);
      setError(`Failed to load ${dataType} growth data`);
      setData([]);
    } finally {
      setLoading(false);
    }
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
              <span style={{ color: '#6c757d' }}>Growth:</span>
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
        width: '100%', 
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
        width: '100%', 
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

  console.log(`Chart rendering with data:`, data);

  if (data.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        height: '300px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#6c757d'
      }}>
        No growth data available for the selected filters
      </div>
    );
  }

  if (data.length === 1) {
    const singleData = data[0];
    return (
      <div style={{ 
        width: '100%', 
        height: '300px', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#333',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getChartColor().stroke }}>
          {formatValue(singleData.value)}
        </div>
        <div style={{ fontSize: '1rem', color: '#6c757d', marginTop: '1rem' }}>
          Current {getValueLabel()}
        </div>
        <div style={{ fontSize: '0.875rem', color: singleData.growthRate > 0 ? '#28a745' : singleData.growthRate < 0 ? '#dc3545' : '#6c757d', marginTop: '0.5rem' }}>
          {singleData.growthLabel} from previous period
        </div>
      </div>
    );
  }

  const colors = getChartColor();

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={formatYAxis}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {/* Plot actual values, not growth rates */}
          <Area 
            type="monotone"
            dataKey="value" 
            stroke={colors.stroke} 
            fill={colors.fill} 
            strokeWidth={2} 
            name={getValueLabel()}
            dot={{ fill: colors.stroke, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: colors.stroke }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GrowthChart;