import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { myProfileStyles as styles } from "../styles/myProfileStyles";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import { jwtDecode } from "jwt-decode";

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_RANK = DAY_ORDER.reduce((accumulator, day, index) => {
  accumulator[day] = index;
  return accumulator;
}, {});

const formatDayLabel = (value) => {
  if (!value || typeof value !== "string") {
    return "Schedule TBD";
  }
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const formatTimeLabel = (value) => {
  if (!value || typeof value !== "string") {
    return "TBD";
  }

  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = parseInt(hoursRaw, 10);
  if (Number.isNaN(hours)) {
    return "TBD";
  }

  const minutes = (minutesRaw || "00").padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = ((hours + 11) % 12) + 1;

  return `${normalizedHours}:${minutes} ${period}`;
};

const formatTimeRangeLabel = (start, end) => {
  const startLabel = formatTimeLabel(start);
  const endLabel = formatTimeLabel(end);

  if (startLabel === "TBD" && endLabel === "TBD") {
    return "Time TBD";
  }
  if (startLabel === "TBD") {
    return `Ends ${endLabel}`;
  }
  if (endLabel === "TBD") {
    return `Starts ${startLabel}`;
  }
  return `${startLabel} - ${endLabel}`;
};

// format check just in case: ensure 2dp, rounding and no bad values
const formatCurrency = (value) => {
  const numericValue = Number.parseFloat(value ?? 0);
  if (Number.isNaN(numericValue)) {
    return "$0.00";
  }
  return `$${numericValue.toFixed(2)}`;
};

export default function TutorProfileScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch current tutor data on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Refresh data when user returns to this screen
  useFocusEffect(
    React.useCallback(() => {
      console.log("🔄 Tutor profile screen focused - refreshing data");
      fetchCurrentUser();
    }, [])
  );

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Checking tutor authentication...");

      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        console.log("❌ Tutor not authenticated");
        throw new Error("Please log in to view your profile");
      }

      console.log("✅ Tutor is authenticated!");

      // Try to decode the JWT to get user info
      const token = authService.getCurrentToken();
      console.log("🎫 Token:", token ? "exists" : "missing");

      if (token) {
        // Decode JWT payload
        try {
          const payload = jwtDecode(token);
          console.log("📋 Token payload:", payload);

          // Get user ID and type from token
          const userId = payload.userId;
          const userTypeFromToken = payload.userType;

          console.log(`👤 User ID: ${userId}, Type: ${userTypeFromToken}`);

          // Only fetch if it's a tutor
          if (userTypeFromToken === "tutor") {
            console.log("👨‍🏫 Fetching tutor data...");
            // Use API client instead of direct fetch
            const userData = await apiClient.get(`/tutors/${userId}`);

            console.log("📄 API Response:", userData);

            if (userData) {
              const finalUser = {
                ...userData,
                tutorLessons: Array.isArray(userData?.tutorLessons)
                  ? userData.tutorLessons
                  : [],
                userType: userTypeFromToken,
              };
              console.log("✅ Setting tutor data:", finalUser);
              setCurrentUser(finalUser);
            } else {
              throw new Error("Failed to fetch tutor data");
            }
          } else {
            throw new Error("Not a tutor account");
          }
        } catch (tokenError) {
          console.error("❌ Token decode error:", tokenError);
          throw new Error("Invalid token");
        }
      } else {
        throw new Error("No token available");
      }
    } catch (error) {
      console.error("❌ Error fetching tutor data:", error);
      setError(error.message || "Failed to load profile data");
      // Don't fallback to mock data - let user know they need to authenticate
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCurrentUser();
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    Alert.alert(
      "Edit Profile",
      "Edit functionality will be implemented by your groupmate!"
    );
  };

  const handleLogout = () => {
    console.log("🚪 Tutor logout button clicked!");

    // Use Alert for mobile compatibility
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: handleActualLogout },
    ]);
  };

  const handleActualLogout = async () => {
    try {
      await authService.logout();
      console.log("✅ Tutor auth service logout complete");
      // Clear user data and redirect to login
      setCurrentUser(null);
      console.log("🔄 Tutor navigating to login page");
      router.replace("/login");
    } catch (error) {
      console.error("❌ Tutor logout error:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const handlePaymentPress = () => {
    if (currentUser?.id) {
      router.push({
        pathname: "/tutor/paymentSummary",
        params: { tutorId: currentUser.id },
      });
    } else {
      Alert.alert(
        "Payment Summary",
        "Tutor information is missing. Please refresh and try again."
      );
    }
  };

  const handleLessonPress = (lesson) => {
    console.log("📚 Lesson pressed:", lesson?.title, "ID:", lesson?.id);
    if (lesson?.id) {
      router.push({
        pathname: "/tutor/lessonDetails",
        params: { lessonId: lesson.id },
      });
    } else {
      Alert.alert("Error", "Unable to view lesson details. Lesson ID is missing.");
    }
  };
  const tutorLessons = currentUser?.tutorLessons;
  const sortedAssignedLessons = useMemo(() => {
    if (!Array.isArray(tutorLessons)) {
      return [];
    }
    return [...tutorLessons].sort((lessonA, lessonB) => {
      const dayA =
        DAY_RANK[
          lessonA?.dayOfWeek && typeof lessonA.dayOfWeek === "string"
            ? lessonA.dayOfWeek.toLowerCase()
            : ""
        ] ?? 99;
      const dayB =
        DAY_RANK[
          lessonB?.dayOfWeek && typeof lessonB.dayOfWeek === "string"
            ? lessonB.dayOfWeek.toLowerCase()
            : ""
        ] ?? 99;
      if (dayA !== dayB) {
        return dayA - dayB;
      }
      const startA = lessonA?.startTime || "";
      const startB = lessonB?.startTime || "";
      return startA.localeCompare(startB);
    });
  }, [tutorLessons]);

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={{ marginTop: 16, fontSize: 16, color: "#6B7280" }}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state with fallback to demo data
  if (error) {
    console.warn("Profile error, using demo data:", error);
  }

  // Safety check for currentUser
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ fontSize: 16, color: "#6B7280" }}>
            No user data available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const paymentSummary = currentUser?.paymentSummary;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#8B5CF6"]}
            tintColor="#8B5CF6"
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            {currentUser.image ? (
              <Image
                source={{ uri: currentUser.image + "?t=" + Date.now() }}
                style={styles.profileImagePlaceholder}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageText}>
                  {currentUser.firstName[0]}
                  {currentUser.lastName[0]}
                </Text>
              </View>
            )}
            {/* Online indicator */}
            <View style={styles.onlineIndicator} />
            {/* Verified badge for tutors */}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.userName}>
            {currentUser.firstName} {currentUser.lastName}
          </Text>
          <Text style={styles.userRole}>Tutor</Text>

        </View>

        {/* Profile Information */}
        <View style={styles.profileInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{currentUser.email}</Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>{currentUser.phone}</Text>
          </View>
        </View>

        {/* Subjects for tutors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subjects</Text>
          {currentUser.subjects && currentUser.subjects.length > 0 ? (
            currentUser.subjects.map((subject, index) => (
              <View key={index} style={styles.subjectItem}>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectLevel}>
                    {subject.experienceLevel ||
                      subject.TutorSubject?.experienceLevel ||
                      "intermediate"}
                  </Text>
                </View>
                <Text style={styles.subjectRate}>
                  ${subject.TutorSubject?.hourlyRate || 45}/hr
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.subjectItem}>
              <Text style={styles.subjectName}>No subjects assigned</Text>
              <Text style={styles.subjectLevel}>Contact admin</Text>
            </View>
          )}
        </View>

        {paymentSummary && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Payment Overview</Text>
              <TouchableOpacity onPress={handlePaymentPress}>
                <Text style={styles.sectionLink}>View breakdown</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.paymentSummaryRow}>
              <View style={[styles.paymentCard, styles.paymentCardPaid]}>
                <Text style={styles.paymentCardLabel}>Total Paid</Text>
                <Text style={styles.paymentCardAmount}>
                  {formatCurrency(paymentSummary.totalPaid)}
                </Text>
                <Text style={styles.paymentCardCount}>
                  {paymentSummary.paidCount} payments
                </Text>
              </View>
              <View style={[styles.paymentCard, styles.paymentCardPending]}>
                <Text style={styles.paymentCardLabel}>Pending</Text>
                <Text style={styles.paymentCardAmount}>
                  {formatCurrency(paymentSummary.totalPending)}
                </Text>
                <Text style={styles.paymentCardCount}>
                  {paymentSummary.pendingCount} payments
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Assigned lessons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned Lessons</Text>
          {sortedAssignedLessons.length > 0 ? (
            sortedAssignedLessons.map((lesson, index) => {
              const subjectName = lesson?.subject?.name || "Subject TBD";
              const dayLabel = formatDayLabel(lesson?.dayOfWeek);
              const timeLabel = formatTimeRangeLabel(
                lesson?.startTime,
                lesson?.endTime
              );
              const scheduleLine =
                dayLabel === "Schedule TBD" && timeLabel === "Time TBD"
                  ? "Schedule TBD"
                  : `${dayLabel} - ${timeLabel}`;
              const locationLine = lesson?.location?.address
                ? lesson.location.address
                : "Location TBD";
              const studentCount = `${lesson?.currentCap ?? 0}/${
                lesson?.totalCap ?? 0
              } students`;
              const isActive = lesson?.isActive !== false;

              return (
                <TouchableOpacity
                  key={lesson?.id || `${lesson?.title || "lesson"}-${index}`}
                  style={[
                    styles.lessonItem,
                    index === sortedAssignedLessons.length - 1
                      ? styles.lessonItemLast
                      : null,
                  ]}
                  onPress={() => handleLessonPress(lesson)}
                >
                  <View style={styles.lessonHeader}>
                    <Text style={styles.lessonTitle} numberOfLines={1}>
                      {lesson?.title || "Lesson"}
                    </Text>
                    <View
                      style={[
                        styles.lessonStatusBadge,
                        isActive
                          ? styles.lessonStatusBadgeActive
                          : styles.lessonStatusBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.lessonStatusText,
                          isActive
                            ? styles.lessonStatusTextActive
                            : styles.lessonStatusTextInactive,
                        ]}
                      >
                        {isActive ? "Confirmed" : "Unconfirmed"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.lessonSubject} numberOfLines={1}>
                    {subjectName}
                  </Text>
                  <Text style={styles.lessonSchedule} numberOfLines={1}>
                    {scheduleLine}
                  </Text>
                  <Text style={styles.lessonMeta} numberOfLines={1}>
                    {locationLine}
                  </Text>
                  <Text style={styles.lessonMeta}>{studentCount}</Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.lessonEmptyContainer}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#9CA3AF"
                style={styles.lessonEmptyIcon}
              />
              <Text style={styles.lessonEmptyTitle}>
                No lessons assigned yet
              </Text>
              <Text style={styles.lessonEmptySubtitle}>
                Check back later or contact your agency admin for updates.
              </Text>
            </View>
          )}
        </View>

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="people-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>My students</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="book-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>My courses</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handlePaymentPress}>
            <Ionicons name="card-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Payment</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <Ionicons name="settings-outline" size={24} color="#374151" />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
