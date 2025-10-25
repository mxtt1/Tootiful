import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../services/apiClient";
import { paymentHistoryStyles as styles } from "../app/styles/paymentHistoryStyles";

export default function PaymentHistory({ userId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(10); // Show 10 items initially
  const [selectedAgency, setSelectedAgency] = useState(null); // null means "All Agencies"
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'week', 'month', 'year'

  const fetchPayments = async () => {
    try {
      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await apiClient.get(`/payments/student?studentId=${userId}`);
      // response.data should be {success: true, data: [...]}
      const paymentsArray = response.data || [];
      setPayments(paymentsArray);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [userId]);

  // Get unique agencies from payments
  const agencies = useMemo(() => {
    const agencyMap = new Map();
    payments.forEach(payment => {
      if (payment.lesson?.agency) {
        agencyMap.set(payment.lesson.agency.id, payment.lesson.agency.name);
      }
    });
    return Array.from(agencyMap, ([id, name]) => ({ id, name }));
  }, [payments]);

  // Filter payments based on selected filters
  const filteredPayments = useMemo(() => {
    let filtered = [...payments];

    // Filter by agency
    if (selectedAgency) {
      filtered = filtered.filter(p => p.lesson?.agency?.id === selectedAgency);
    }

    // Filter by date range
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(p => new Date(p.paymentDate) >= filterDate);
    }

    return filtered;
  }, [payments, selectedAgency, dateFilter]);

  // Paginated payments to display
  const displayedPayments = useMemo(() => {
    return filteredPayments.slice(0, displayCount);
  }, [filteredPayments, displayCount]);

  const hasMore = displayedPayments.length < filteredPayments.length;

  const loadMore = () => {
    setDisplayCount(prev => prev + 10);
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderPaymentItem = (item, index) => (
    <View
      key={item.id}
      style={[
        styles.paymentCard,
        index === payments.length - 1 && styles.lastCard,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="card-outline" size={24} color="#8B5CF6" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          <Text style={styles.date}>{formatDate(item.paymentDate)}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        {item.lesson && (
          <View style={styles.detailRow}>
            <Ionicons name="book-outline" size={16} color="#6B7280" />
            <Text style={styles.detailLabel}>Lesson:</Text>
            <Text style={styles.detailValue}>{item.lesson.title}</Text>
          </View>
        )}
        {item.lesson?.agency && (
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={16} color="#6B7280" />
            <Text style={styles.detailLabel}>Agency:</Text>
            <Text style={styles.detailValue}>{item.lesson.agency.name}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
          <Text style={styles.detailLabel}>Platform Fee:</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(item.platformFee)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[styles.detailValue, styles.statusPaid]}>Paid</Text>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Payment History</Text>
      <Text style={styles.emptySubtitle}>
        Your payment transactions will appear here
      </Text>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      {/* Date Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Date Range</Text>
        <View style={styles.filterButtons}>
          {[
            { value: 'all', label: 'All' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Year' }
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                dateFilter === option.value && styles.filterButtonActive
              ]}
              onPress={() => {
                setDateFilter(option.value);
                setDisplayCount(10); // Reset pagination when filter changes
              }}
            >
              <Text style={[
                styles.filterButtonText,
                dateFilter === option.value && styles.filterButtonTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Agency Filter */}
      {agencies.length > 0 && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Agency</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedAgency === null && styles.filterButtonActive
              ]}
              onPress={() => {
                setSelectedAgency(null);
                setDisplayCount(10);
              }}
            >
              <Text style={[
                styles.filterButtonText,
                selectedAgency === null && styles.filterButtonTextActive
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {agencies.map(agency => (
              <TouchableOpacity
                key={agency.id}
                style={[
                  styles.filterButton,
                  selectedAgency === agency.id && styles.filterButtonActive
                ]}
                onPress={() => {
                  setSelectedAgency(agency.id);
                  setDisplayCount(10);
                }}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedAgency === agency.id && styles.filterButtonTextActive
                ]}>
                  {agency.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results count */}
      <Text style={styles.resultsCount}>
        Showing {displayedPayments.length} of {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="receipt" size={24} color="#8B5CF6" />
        <Text style={styles.headerTitle}>Payment History</Text>
      </View>

      {renderFilters()}

      {filteredPayments.length === 0 ? (
        renderEmptyState()
      ) : (
        <View>
          {displayedPayments.map((item, index) => renderPaymentItem(item, index))}
          
          {hasMore && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
              <Ionicons name="chevron-down-circle-outline" size={20} color="#8B5CF6" />
              <Text style={styles.loadMoreText}>
                Load More ({filteredPayments.length - displayedPayments.length} remaining)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
