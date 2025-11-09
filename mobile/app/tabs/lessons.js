import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import lessonService from "../../services/lessonService";
import notificationService from "../../services/notificationService"; // Import the service
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import { lessonsStyles as styles } from "../styles/lessonsStyles";

export default function LessonsScreen() {
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const [error, setError] = useState(null);

  // Filter options
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableAgencies, setAvailableAgencies] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notificationStats, setNotificationStats] = useState({ total: 0, unread: 0 });
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Filter dropdown states
  const [dropdownVisible, setDropdownVisible] = useState({
    subject: false,
    dayOfWeek: false,
    agency: false,
    timeOfDay: false,
  });

  // Filter states
  const [filters, setFilters] = useState({
    dayOfWeek: "all",
    priceRange: "all",
    timeOfDay: "all",
    subject: "all",
    agency: "all",
  });

  // Load lessons when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchLessons();
      fetchNotifications();
    }, [])
  );

  // Filter lessons when search text or filters change
  useEffect(() => {
    filterLessons();
  }, [searchText, filters, lessons]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Fetching lessons...");
      const response = await lessonService.getAllLessons();
      console.log(
        `📚 Found ${(response.data || response || []).length} lessons`
      );

      const lessonsData = response.data || response || [];
      setLessons(lessonsData);
      extractFilterOptions(lessonsData);
    } catch (error) {
      console.error("❌ Error fetching lessons:", error);
      setError(error.message || "Failed to load lessons");
      Alert.alert("Error", "Failed to load lessons. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load notifications
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      console.log('🔔 DEBUG: Starting to fetch notifications...');
      
      // These now return the direct data (array and object)
      const notificationsData = await notificationService.getUserNotifications();
      console.log('🔔 DEBUG: Notifications data:', notificationsData);
      
      const statsData = await notificationService.getNotificationStats();
      console.log('🔔 DEBUG: Stats data:', statsData);
      
      setNotifications(notificationsData);
      setNotificationStats(statsData);
      
    } catch (error) {
      console.error('❌ DEBUG: Error fetching notifications:', error);
      console.log('🔔 DEBUG: Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status
      });
      
      // Set empty states on error
      setNotifications([]);
      setNotificationStats({ total: 0, unread: 0 });
    } finally {
      setLoadingNotifications(false);
    }
  };

// Handle notification press
const handleNotificationPress = async (notification) => {
  try {
    // Mark as read
    await notificationService.markAsRead(notification.id);
    
    // Refresh notifications
    await fetchNotifications();
    
    // Navigate to lesson if target exists
    if (notification.metadata?.targetLessonId) {
      setNotificationsModalVisible(false);
      
      try {
        // Check capacity before navigating
        const lessonResponse = await lessonService.getLessonById(notification.metadata.targetLessonId);
        const lesson = lessonResponse.data || lessonResponse;
        
        if (lesson.currentCap >= lesson.totalCap) {
          Alert.alert("Lesson Full", "This lesson is at full capacity. Please check back later.");
          return;
        }
        
        // Open the lesson in the modal instead of navigating to non-existent page
        setSelectedLesson(lesson);
        setModalVisible(true);
        checkEnrollmentStatus(lesson.id);
        
      } catch (lessonError) {
        console.error("❌ Error fetching lesson:", lessonError);
        Alert.alert("Error", "This lesson is no longer available.");
      }
    }
  } catch (error) {
    console.error("❌ Error handling notification:", error);
    Alert.alert("Error", "Failed to open notification");
  }
};

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      // Refresh to get updated read status
      await fetchNotifications();
    } catch (error) {
      console.error("❌ Error marking all as read:", error);
      Alert.alert("Error", "Failed to mark all as read");
    }
  };

  const filterLessons = () => {
    let filtered = [...lessons];

    // Search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (lesson) =>
          lesson.title?.toLowerCase().includes(search) ||
          lesson.subjectName?.toLowerCase().includes(search) ||
          lesson.locationAddress?.toLowerCase().includes(search) ||
          lesson.agencyName?.toLowerCase().includes(search)
      );
    }

    // Day of week filter
    if (filters.dayOfWeek !== "all") {
      filtered = filtered.filter(
        (lesson) => lesson.dayOfWeek === filters.dayOfWeek
      );
    }

    // Subject filter
    if (filters.subject !== "all") {
      filtered = filtered.filter(
        (lesson) => lesson.subjectName === filters.subject
      );
    }

    // Agency filter
    if (filters.agency !== "all") {
      filtered = filtered.filter(
        (lesson) => lesson.agencyName === filters.agency
      );
    }

    // Price range filter
    if (filters.priceRange !== "all") {
      const [min, max] = filters.priceRange.split("-").map(Number);
      filtered = filtered.filter((lesson) => {
        const price = parseFloat(lesson.studentRate);
        return max ? price >= min && price <= max : price >= min;
      });
    }

    // Time of day filter
    if (filters.timeOfDay !== "all") {
      filtered = filtered.filter((lesson) => {
        const hour = parseInt(lesson.startTime.split(":")[0]);
        switch (filters.timeOfDay) {
          case "morning":
            return hour >= 6 && hour < 12;
          case "afternoon":
            return hour >= 12 && hour < 18;
          case "evening":
            return hour >= 18 && hour < 22;
          default:
            return true;
        }
      });
    }

    setFilteredLessons(filtered);
  };

  const checkEnrollmentStatus = async (lessonId) => {
    try {
      setCheckingEnrollment(true);

      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        setIsEnrolled(false);
        return;
      }

      // Get user info from JWT token
      await apiClient.loadTokenFromStorage();
      const token = await authService.getCurrentToken();
      if (!token) {
        setIsEnrolled(false);
        return;
      }

      // Decode JWT token to get user ID
      let userId;
      try {
        const payload = jwtDecode(token);
        userId = payload.userId;
      } catch (decodeError) {
        console.error("❌ Token decode error:", decodeError);
        setIsEnrolled(false);
        return;
      }

      // Check enrollment status via API
      const response = await lessonService.checkEnrollmentStatus(
        userId,
        lessonId
      );
      setIsEnrolled(response.isEnrolled || false);
    } catch (error) {
      console.error("❌ Error checking enrollment status:", error);
      setIsEnrolled(false);
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const extractFilterOptions = (lessonsData) => {
    // Extract unique subjects
    const subjects = [
      ...new Set(lessonsData.map((lesson) => lesson.subjectName)),
    ].filter(Boolean);
    setAvailableSubjects(subjects);

    // Extract unique agencies
    const agencies = [
      ...new Set(lessonsData.map((lesson) => lesson.agencyName)),
    ].filter(Boolean);
    setAvailableAgencies(agencies);

    // Extract unique days of week
    const days = [
      ...new Set(lessonsData.map((lesson) => lesson.dayOfWeek)),
    ].filter(Boolean);
    setAvailableDays(days);
  };

  const toggleDropdown = (category) => {
    setDropdownVisible((prev) => ({
      subject: false,
      dayOfWeek: false,
      agency: false,
      timeOfDay: false,
      [category]: !prev[category],
    }));
  };

  const selectFilter = (category, value) => {
    setFilters((prev) => ({
      ...prev,
      [category]: prev[category] === value ? "all" : value,
    }));
    setDropdownVisible((prev) => ({
      ...prev,
      [category]: false,
    }));
  };

  const closeAllDropdowns = () => {
    setDropdownVisible({
      subject: false,
      dayOfWeek: false,
      agency: false,
      timeOfDay: false,
    });
  };

  const handleUnenrollment = async () => {
    try {
      setEnrolling(true);

      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        Alert.alert("Error", "Please log in to unenroll from lessons");
        return;
      }

      // Get user info from JWT token
      await apiClient.loadTokenFromStorage();
      const token = await authService.getCurrentToken();
      if (!token) {
        Alert.alert("Error", "Please log in to unenroll from lessons");
        return;
      }

      // Decode JWT token
      let userId, userType;
      try {
        const payload = jwtDecode(token);
        userId = payload.userId;
        userType = payload.userType;
      } catch (decodeError) {
        console.error("❌ Token decode error:", decodeError);
        Alert.alert("Error", "Session expired. Please log in again.");
        return;
      }

      console.log(
        `📚 Unenrolling ${userType} from lesson: ${selectedLesson.title}`
      );

      // Ensure only students can unenroll
      if (userType !== "student") {
        Alert.alert("Error", "Only students can unenroll from lessons");
        return;
      }

      // Make unenrollment API call
      try {
        await lessonService.unenrollStudentFromLesson(
          userId,
          selectedLesson.id
        );

        Alert.alert(
          "Success",
          "You have successfully unenrolled from this lesson!",
          [{ text: "OK", onPress: () => setModalVisible(false) }]
        );

        // Refresh lessons and enrollment status
        fetchLessons();
        setIsEnrolled(false);
      } catch (unenrollmentError) {
        console.error("❌ Unenrollment error:", unenrollmentError);
        const errorMessage =
          unenrollmentError.response?.data?.message ||
          unenrollmentError.message ||
          "Failed to unenroll from lesson";

        Alert.alert("Error", errorMessage);
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnrollment = async () => {
    try {
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        Alert.alert("Error", "Please log in to enroll in lessons");
        return;
      }

      // Get user info from JWT token - ensure token is loaded from storage
      await apiClient.loadTokenFromStorage();
      const token = await authService.getCurrentToken();
      if (!token) {
        Alert.alert("Error", "Please log in to enroll in lessons");
        return;
      }

      // Decode JWT token
      let userId, userType;
      try {
        const payload = jwtDecode(token);
        userId = payload.userId;
        userType = payload.userType;
      } catch (decodeError) {
        console.error("❌ Token decode error:", decodeError);
        Alert.alert("Error", "Session expired. Please log in again.");
        return;
      }

      console.log(
        `🎓 Redirecting ${userType} to payment for lesson: ${selectedLesson.title}`
      );

      // Ensure only students can enroll
      if (userType !== "student") {
        Alert.alert("Error", "Only students can enroll in lessons");
        return;
      }

      // Close modal and redirect to payment page
      setModalVisible(false);

      // Navigate to payment page with lesson details
      router.push({
        pathname: "/payment",
        params: {
          lessonId: selectedLesson.id,
        },
      });
    } catch (error) {
      console.error("❌ Navigation error:", error);
      Alert.alert("Error", "Failed to proceed to payment. Please try again.");
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLessons();
  }, []);

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? "AM" : "PM";
    return `${hour12}:${minutes} ${ampm}`;
  };

  const renderLesson = (lesson) => (
    <TouchableOpacity
      key={lesson.id}
      style={styles.lessonCard}
      onPress={() => {
        setSelectedLesson(lesson);
        setModalVisible(true);
        checkEnrollmentStatus(lesson.id);
      }}
    >
      <View style={styles.lessonHeader}>
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${lesson.studentRate}</Text>
        </View>
      </View>

      <View style={styles.lessonInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="book-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {lesson.subjectName} - {lesson.subjectGradeLevel}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {lesson.locationAddress} ({lesson.agencyName})
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {lesson.dayOfWeek} {formatTime(lesson.startTime)} -{" "}
            {formatTime(lesson.endTime)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            {lesson.currentCap}/{lesson.totalCap} students
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading lessons...</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={closeAllDropdowns}>
      <View style={styles.safeArea}>
        {/* Header with Notification Bell */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <View>
              <Text style={styles.headerTitle}>Available Lessons</Text>
              <Text style={styles.headerSubtitle}>
                {filteredLessons.length} lesson{filteredLessons.length !== 1 ? "s" : ""} found
              </Text>
            </View>
            
            {/* Notification Bell */}
            <TouchableOpacity 
              style={styles.notificationBell}
              onPress={() => {
                setNotificationsModalVisible(true);
                fetchNotifications();
              }}
            >
              <Ionicons name="notifications-outline" size={24} color="#8B5CF6" />
              {notificationStats.unread > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationStats.unread > 9 ? '9+' : notificationStats.unread}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search lessons, subjects, locations..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Filter Dropdowns */}
        <View style={styles.filtersContainer}>
          <View style={styles.dropdownsRow}>
            {/* Subject Dropdown */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  filters.subject !== "all" && styles.dropdownButtonActive,
                ]}
                onPress={() => toggleDropdown("subject")}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    filters.subject !== "all" &&
                      styles.dropdownButtonTextActive,
                  ]}
                >
                  {filters.subject !== "all" ? filters.subject : "Subject"}
                </Text>
                <Ionicons
                  name={dropdownVisible.subject ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={filters.subject !== "all" ? "#8B5CF6" : "#666"}
                />
              </TouchableOpacity>
              {dropdownVisible.subject && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => selectFilter("subject", "all")}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        filters.subject === "all" &&
                          styles.dropdownItemTextActive,
                      ]}
                    >
                      All Subjects
                    </Text>
                  </TouchableOpacity>
                  {availableSubjects.map((subject) => (
                    <TouchableOpacity
                      key={subject}
                      style={styles.dropdownItem}
                      onPress={() => selectFilter("subject", subject)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          filters.subject === subject &&
                            styles.dropdownItemTextActive,
                        ]}
                      >
                        {subject}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Day of Week Dropdown */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  filters.dayOfWeek !== "all" && styles.dropdownButtonActive,
                ]}
                onPress={() => toggleDropdown("dayOfWeek")}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    filters.dayOfWeek !== "all" &&
                      styles.dropdownButtonTextActive,
                  ]}
                >
                  {filters.dayOfWeek !== "all" ? filters.dayOfWeek : "Day"}
                </Text>
                <Ionicons
                  name={
                    dropdownVisible.dayOfWeek ? "chevron-up" : "chevron-down"
                  }
                  size={16}
                  color={filters.dayOfWeek !== "all" ? "#8B5CF6" : "#666"}
                />
              </TouchableOpacity>
              {dropdownVisible.dayOfWeek && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => selectFilter("dayOfWeek", "all")}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        filters.dayOfWeek === "all" &&
                          styles.dropdownItemTextActive,
                      ]}
                    >
                      All Days
                    </Text>
                  </TouchableOpacity>
                  {availableDays.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={styles.dropdownItem}
                      onPress={() => selectFilter("dayOfWeek", day)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          filters.dayOfWeek === day &&
                            styles.dropdownItemTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Agency Dropdown */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  filters.agency !== "all" && styles.dropdownButtonActive,
                ]}
                onPress={() => toggleDropdown("agency")}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    filters.agency !== "all" && styles.dropdownButtonTextActive,
                  ]}
                >
                  {filters.agency !== "all" ? filters.agency : "Agency"}
                </Text>
                <Ionicons
                  name={dropdownVisible.agency ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={filters.agency !== "all" ? "#8B5CF6" : "#666"}
                />
              </TouchableOpacity>
              {dropdownVisible.agency && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => selectFilter("agency", "all")}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        filters.agency === "all" &&
                          styles.dropdownItemTextActive,
                      ]}
                    >
                      All Agencies
                    </Text>
                  </TouchableOpacity>
                  {availableAgencies.map((agency) => (
                    <TouchableOpacity
                      key={agency}
                      style={styles.dropdownItem}
                      onPress={() => selectFilter("agency", agency)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          filters.agency === agency &&
                            styles.dropdownItemTextActive,
                        ]}
                      >
                        {agency}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Time of Day Dropdown */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  filters.timeOfDay !== "all" && styles.dropdownButtonActive,
                ]}
                onPress={() => toggleDropdown("timeOfDay")}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    filters.timeOfDay !== "all" &&
                      styles.dropdownButtonTextActive,
                  ]}
                >
                  {filters.timeOfDay !== "all" ? filters.timeOfDay : "Time"}
                </Text>
                <Ionicons
                  name={
                    dropdownVisible.timeOfDay ? "chevron-up" : "chevron-down"
                  }
                  size={16}
                  color={filters.timeOfDay !== "all" ? "#8B5CF6" : "#666"}
                />
              </TouchableOpacity>
              {dropdownVisible.timeOfDay && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => selectFilter("timeOfDay", "all")}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        filters.timeOfDay === "all" &&
                          styles.dropdownItemTextActive,
                      ]}
                    >
                      All Times
                    </Text>
                  </TouchableOpacity>
                  {["morning", "afternoon", "evening"].map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={styles.dropdownItem}
                      onPress={() => selectFilter("timeOfDay", time)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          filters.timeOfDay === time &&
                            styles.dropdownItemTextActive,
                        ]}
                      >
                        {time.charAt(0).toUpperCase() + time.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Lessons List */}
        <ScrollView
          style={styles.lessonsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredLessons.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No lessons found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            filteredLessons.map(renderLesson)
          )}
        </ScrollView>

        {/* Notifications Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={notificationsModalVisible}
          onRequestClose={() => setNotificationsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Notifications {notificationStats.unread > 0 && `(${notificationStats.unread})`}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {notificationStats.unread > 0 && (
                    <TouchableOpacity 
                      onPress={handleMarkAllAsRead}
                      style={{ marginRight: 15 }}
                    >
                      <Text style={{ color: '#8B5CF6', fontSize: 14 }}>Mark all read</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView 
                style={styles.modalBody}
                refreshControl={
                  <RefreshControl 
                    refreshing={loadingNotifications} 
                    onRefresh={fetchNotifications} 
                  />
                }
              >
                {loadingNotifications ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#8B5CF6" />
                    <Text style={styles.loadingText}>Loading notifications...</Text>
                  </View>
                ) : notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No notifications</Text>
                    <Text style={styles.emptySubtext}>You're all caught up!</Text>
                  </View>
                ) : (
                  notifications.map((notification) => (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        !notification.isRead && styles.unreadNotification
                      ]}
                      onPress={() => handleNotificationPress(notification)}
                    >
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>
                          {notification.title}
                        </Text>
                        <Text style={styles.notificationMessage}>
                          {notification.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {new Date(notification.createdAt).toLocaleDateString()} • {new Date(notification.createdAt).toLocaleTimeString()}
                        </Text>
                        {notification.metadata?.targetLessonId && (
                          <Text style={styles.notificationAction}>
                            Tap to view lesson →
                          </Text>
                        )}
                      </View>
                      {!notification.isRead && (
                        <View style={styles.unreadDot} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Lesson Details Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {selectedLesson && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {selectedLesson.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody}>
                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Subject Details</Text>
                      <Text style={styles.detailText}>
                        {selectedLesson.subjectName} -{" "}
                        {selectedLesson.subjectGradeLevel}
                      </Text>
                      {selectedLesson.subjectDescription && (
                        <Text style={styles.description}>
                          {selectedLesson.subjectDescription}
                        </Text>
                      )}
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Schedule</Text>
                      <Text style={styles.detailText}>
                        {selectedLesson.dayOfWeek} at{" "}
                        {formatTime(selectedLesson.startTime)} -{" "}
                        {formatTime(selectedLesson.endTime)}
                      </Text>
                    </View>

                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Location</Text>
                      <Text style={styles.detailText}>
                        {selectedLesson.locationAddress}
                      </Text>
                      <Text style={styles.agencyText}>
                        Organized by {selectedLesson.agencyName}
                      </Text>
                    </View>

                    {selectedLesson.tutorFullName && (
                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Instructor</Text>
                        {selectedLesson.tutorId ? (
                          <TouchableOpacity
                            onPress={() => {
                              setModalVisible(false);
                              router.push(`/viewTutorProfile?id=${selectedLesson.tutorId}`);
                            }}
                          >
                            <Text style={[styles.detailText, styles.tutorLink]}>
                              {selectedLesson.tutorFullName}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.detailText}>
                            {selectedLesson.tutorFullName}
                          </Text>
                        )}
                      </View>
                    )}

                    <View style={styles.detailSection}>
                      <Text style={styles.sectionTitle}>Class Information</Text>
                      <Text style={styles.detailText}>
                        Price: ${selectedLesson.studentRate} per session
                      </Text>
                      <Text style={styles.detailText}>
                        Capacity: {selectedLesson.currentCap}/
                        {selectedLesson.totalCap} students
                      </Text>
                      <Text style={styles.detailText}>
                        Available spots:{" "}
                        {selectedLesson.totalCap - selectedLesson.currentCap}
                      </Text>
                    </View>

                    {selectedLesson.description && (
                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.description}>
                          {selectedLesson.description}
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    {checkingEnrollment ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#8B5CF6" />
                        <Text style={styles.loadingText}>
                          Checking enrollment...
                        </Text>
                      </View>
                    ) : selectedLesson.currentCap >= selectedLesson.totalCap &&
                      !isEnrolled ? (
                      <Text style={styles.fullText}>This lesson is full</Text>
                    ) : isEnrolled ? (
                      <TouchableOpacity
                        style={[
                          styles.enrollButton,
                          styles.unenrollButton,
                          enrolling && styles.enrollButtonDisabled,
                        ]}
                        onPress={handleUnenrollment}
                        disabled={enrolling}
                      >
                        {enrolling ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.enrollButtonText}>
                            Unenroll from this Lesson
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.enrollButton,
                          enrolling && styles.enrollButtonDisabled,
                        ]}
                        onPress={handleEnrollment}
                        disabled={enrolling}
                      >
                        {enrolling ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.enrollButtonText}>
                            Continue to Payment
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}