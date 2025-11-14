import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { myProfileStyles as styles } from "../styles/myProfileStyles";
import apiClient from "../../services/apiClient";
import { Picker } from "@react-native-picker/picker";

// same -> better format for $$
const formatCurrency = (value) => {
  const numericValue = Number.parseFloat(value ?? 0);
  if (Number.isNaN(numericValue)) {
    return "$0.00";
  }
  return `$${numericValue.toFixed(2)}`;
};

const formatDateLabel = (value) => {
  if (!value) {
    return "Date TBD";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getMonthKey = (value) => {
  if (!value) {
    return "unknown";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

// table for status styles
const PAYMENT_STATUS_STYLES = {
  Paid: {
    container: "paymentStatusPaid",
    text: "paymentStatusTextPaid",
    label: "Paid",
  },
  Pending: {
    container: "paymentStatusPending",
    text: "paymentStatusTextPending",
    label: "Pending",
  },
  "Not Paid": {
    container: "paymentStatusPending",
    text: "paymentStatusTextPending",
    label: "Pending",
  },
};

// U18: payout overview with a detailed breakdown per attendance
export default function PaymentSummaryScreen() {
  const router = useRouter();
  const { tutorId } = useLocalSearchParams();

  // for tracking fetch status and the summary payload returned by API
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState("all");

  // Handles both raw and Axios-wrapped responses returned by the apiClient
  const resolvePayload = (response) => {
    if (!response) return null;
    if (response.data) {
      return response.data;
    }
    return response;
  };

  // load latest payout summary for the tutor
  const fetchSummary = useCallback(async () => {
    if (!tutorId) {
      setError("Missing tutor context. Please reopen this screen from your profile.");
      setSummary(null);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await apiClient.get(`/tutors/${tutorId}/payments/summary`);
      setSummary(resolvePayload(response));
    } catch (err) {
      console.error("Failed to fetch payment summary:", err);
      const message =
        err?.data?.message ||
        err?.message ||
        "Unable to load payment summary. Please try again.";
      setError(message);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [tutorId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (summary?.currentMonthKey) {
      setSelectedMonthKey(summary.currentMonthKey);
    }
  }, [summary?.currentMonthKey]);

  useFocusEffect(
    // Refresh whenever the screen regains focus so tutors see up-to-date totals.
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary])
  );

  // when user pulls to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
  };

  // error handling
  const showErrorAlert = () => {
    if (error) {
      Alert.alert("Payment Summary", error);
    }
  };

  const monthSummaries = Array.isArray(summary?.monthSummaries)
    ? summary.monthSummaries
    : [];

  const monthOptions = useMemo(() => {
    const options = monthSummaries.map((item) => ({
      key: item.key,
      label: item.label,
    }));
    const uniqueKeys = new Set();
    const deduped = options.filter((option) => {
      if (uniqueKeys.has(option.key)) {
        return false;
      }
      uniqueKeys.add(option.key);
      return true;
    });
    return [{ key: "all", label: "View all" }, ...deduped];
  }, [monthSummaries]);

  const breakdown = Array.isArray(summary?.breakdown) ? summary.breakdown : [];
  const filteredBreakdown = useMemo(() => {
    if (selectedMonthKey === "all") {
      return breakdown;
    }
    return breakdown.filter(
      (item) => getMonthKey(item.attendanceDate) === selectedMonthKey
    );
  }, [breakdown, selectedMonthKey]);

  const selectedMonthLabel = useMemo(() => {
    const match = monthOptions.find((option) => option.key === selectedMonthKey);
    return match?.label ?? "View all";
  }, [monthOptions, selectedMonthKey]);

  const totalPaid = formatCurrency(summary?.totalPaid ?? 0);
  const totalPending = formatCurrency(summary?.totalPending ?? 0);
  const overviewCount =
    (summary?.paidCount ?? 0) + (summary?.pendingCount ?? 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#8B5CF6"]}
            tintColor="#8B5CF6"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Summary</Text>
        </View>

        {/* Overview Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Payment Overview</Text>
            <Text style={styles.sectionSubtitle}>
              {summary?.currentMonthLabel || "This month"}
            </Text>
          </View>
          <Text style={styles.sectionHelperText}>
            {overviewCount} payment{overviewCount === 1 ? "" : "s"} recorded this
            month
          </Text>
          <View style={styles.paymentSummaryRow}>
            <View style={[styles.paymentCard, styles.paymentCardPaid]}>
              <Text style={styles.paymentCardLabel}>Total Paid</Text>
              <Text style={styles.paymentCardAmount}>{totalPaid}</Text>
              <Text style={styles.paymentCardCount}>
                {summary?.paidCount ?? 0} payments
              </Text>
            </View>
            <View style={[styles.paymentCard, styles.paymentCardPending]}>
              <Text style={styles.paymentCardLabel}>Pending</Text>
              <Text style={styles.paymentCardAmount}>{totalPending}</Text>
              <Text style={styles.paymentCardCount}>
                {summary?.pendingCount ?? 0} payments
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Breakdown</Text>
            <View style={styles.sectionHeaderActions}>
              {error && (
                <TouchableOpacity onPress={showErrorAlert}>
                  <Text style={styles.errorLink}>View error</Text>
                </TouchableOpacity>
              )}
              <View style={styles.monthFilterContainer}>
                <Text style={styles.monthFilterValue}>{selectedMonthLabel}</Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  style={styles.monthFilterIcon}
                />
                <Picker
                  selectedValue={selectedMonthKey}
                  onValueChange={(value) =>
                    setSelectedMonthKey(value || "all")
                  }
                  mode="dropdown"
                  style={styles.monthPickerNative}
                >
                  {monthOptions.map((option) => (
                    <Picker.Item
                      key={option.key}
                      label={option.label}
                      value={option.key}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {loading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : filteredBreakdown.length === 0 ? (
            <View style={styles.lessonEmptyContainer}>
              <Ionicons
                name="card-outline"
                size={20}
                color="#9CA3AF"
                style={styles.lessonEmptyIcon}
              />
              <Text style={styles.lessonEmptyTitle}>
                {selectedMonthKey === "all"
                  ? "No payment records yet"
                  : "No payments for this month"}
              </Text>
              <Text style={styles.lessonEmptySubtitle}>
                {selectedMonthKey === "all"
                  ? "Payments will appear here once they are processed by the agency."
                  : "Try selecting another month or choose View all to see every payout."}
              </Text>
            </View>
          ) : (
            <View style={styles.paymentList}>
              {filteredBreakdown.map((payment) => {
                const statusStyle =
                  PAYMENT_STATUS_STYLES[payment.paymentStatus] ??
                  PAYMENT_STATUS_STYLES.Pending;
                const attendanceStatusLabel =
                  payment.isAttendanceMarked === true ? "Attended" : "Pending";
                const lessonRateAmount =
                  typeof payment.lessonRate === "number" && !Number.isNaN(payment.lessonRate)
                    ? payment.lessonRate
                    : payment.paymentAmount;
                return (
                  <View style={styles.paymentItem} key={payment.id}>
                    <View style={styles.paymentItemHeader}>
                      <Text style={styles.paymentItemTitle} numberOfLines={1}>
                        {payment.lessonTitle || "Lesson Payment"}
                      </Text>
                      <View
                        style={[
                          styles.paymentStatusBadge,
                          styles[statusStyle.container],
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentStatusText,
                            styles[statusStyle.text],
                          ]}
                        >
                          {statusStyle.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.paymentAmount}>
                      {formatCurrency(payment.paymentAmount)}
                    </Text>
                    <View style={styles.paymentMetaRow}>
                      <Ionicons
                        name="calendar-clear-outline"
                        size={16}
                        color="#6B7280"
                        style={styles.paymentMetaIcon}
                      />
                      <Text style={styles.paymentMetaText}>
                        Attendance: {formatDateLabel(payment.attendanceDate)} ({attendanceStatusLabel})
                      </Text>
                    </View>
                    <View style={styles.paymentMetaRow}>
                      <Ionicons
                        name="cash-outline"
                        size={16}
                        color="#6B7280"
                        style={styles.paymentMetaIcon}
                      />
                      <Text style={styles.paymentMetaText}>
                        Rate: {formatCurrency(lessonRateAmount)}
                      </Text>
                    </View>
                    {payment.paymentDate && (
                      <View style={styles.paymentMetaRow}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#6B7280"
                          style={styles.paymentMetaIcon}
                        />
                        <Text style={styles.paymentMetaText}>
                          Paid on {formatDateLabel(payment.paymentDate)}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
