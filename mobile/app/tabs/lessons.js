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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { jwtDecode } from "jwt-decode";
import lessonService from "../../services/lessonService";
import authService from "../../services/authService";
import apiClient from "../../services/apiClient";
import { lessonsStyles as styles } from "../styles/lessonsStyles";

export default function LessonsScreen() {
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
  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);

  // Filter dropdown states
  const [dropdownVisible, setDropdownVisible] = useState({
    subject: false,
    dayOfWeek: false,
    location: false,
    timeOfDay: false,
  });

  // Filter states
  const [filters, setFilters] = useState({
    dayOfWeek: "all",
    priceRange: "all",
    timeOfDay: "all",
    subject: "all",
    location: "all",
  });

  // Load lessons when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchLessons();
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

    // Location filter
    if (filters.location !== "all") {
      filtered = filtered.filter(
        (lesson) => lesson.agencyName === filters.location
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

    // Extract unique locations/agencies
    const locations = [
      ...new Set(lessonsData.map((lesson) => lesson.agencyName)),
    ].filter(Boolean);
    setAvailableLocations(locations);

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
      location: false,
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
      location: false,
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
      setEnrolling(true);

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
        `🎓 Enrolling ${userType} in lesson: ${selectedLesson.title}`
      );

      // Ensure only students can enroll
      if (userType !== "student") {
        Alert.alert("Error", "Only students can enroll in lessons");
        return;
      }

      // Make enrollment API call
      try {
        await lessonService.enrollStudentInLesson(userId, selectedLesson.id);

        Alert.alert(
          "Success",
          "You have successfully enrolled in this lesson!",
          [{ text: "OK", onPress: () => setModalVisible(false) }]
        );

        // Refresh lessons to update capacity
        fetchLessons();
      } catch (enrollmentError) {
        console.error("❌ Enrollment error:", enrollmentError);
        const errorMessage =
          enrollmentError.response?.data?.message ||
          enrollmentError.message ||
          "Failed to enroll in lesson";

        // Map backend error messages to user-friendly alerts
        if (errorMessage.toLowerCase().includes("already enrolled")) {
          Alert.alert(
            "Enrollment Error",
            "You are already enrolled in this lesson."
          );
        } else if (errorMessage.toLowerCase().includes("time clash")) {
          Alert.alert(
            "Enrollment Error",
            "This lesson clashes with another lesson you are enrolled in."
          );
        } else if (errorMessage.toLowerCase().includes("grade level")) {
          Alert.alert(
            "Enrollment Error",
            "This lesson is not for your grade level."
          );
        } else if (errorMessage.toLowerCase().includes("lesson is full")) {
          Alert.alert("Enrollment Error", "This lesson is already full.");
        } else {
          Alert.alert("Error", errorMessage);
        }
      }
    } finally {
      setEnrolling(false);
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading lessons...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={closeAllDropdowns}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Available Lessons</Text>
          <Text style={styles.headerSubtitle}>
            {filteredLessons.length} lesson
            {filteredLessons.length !== 1 ? "s" : ""} found
          </Text>
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

            {/* Location Dropdown */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  filters.location !== "all" && styles.dropdownButtonActive,
                ]}
                onPress={() => toggleDropdown("location")}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    filters.location !== "all" &&
                      styles.dropdownButtonTextActive,
                  ]}
                >
                  {filters.location !== "all" ? filters.location : "Location"}
                </Text>
                <Ionicons
                  name={
                    dropdownVisible.location ? "chevron-up" : "chevron-down"
                  }
                  size={16}
                  color={filters.location !== "all" ? "#8B5CF6" : "#666"}
                />
              </TouchableOpacity>
              {dropdownVisible.location && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => selectFilter("location", "all")}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        filters.location === "all" &&
                          styles.dropdownItemTextActive,
                      ]}
                    >
                      All Locations
                    </Text>
                  </TouchableOpacity>
                  {availableLocations.map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={styles.dropdownItem}
                      onPress={() => selectFilter("location", location)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          filters.location === location &&
                            styles.dropdownItemTextActive,
                        ]}
                      >
                        {location}
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
                        <Text style={styles.detailText}>
                          {selectedLesson.tutorFullName}
                        </Text>
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
                            Enroll in this Lesson
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
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
