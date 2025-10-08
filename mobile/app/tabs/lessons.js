import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const [error, setError] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    dayOfWeek: "all",
    priceRange: "all",
    availableOnly: true,
    timeOfDay: "all",
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

    // Available spots filter
    if (filters.availableOnly) {
      filtered = filtered.filter(
        (lesson) => lesson.currentCap < lesson.totalCap
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

  const getAvailabilityColor = (lesson) => {
    const availability = lesson.totalCap - lesson.currentCap;
    if (availability === 0) return "#ff4444";
    if (availability <= 2) return "#ff8800";
    return "#00aa00";
  };

  const renderLesson = (lesson) => (
    <TouchableOpacity
      key={lesson.id}
      style={styles.lessonCard}
      onPress={() => {
        setSelectedLesson(lesson);
        setModalVisible(true);
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
          <View
            style={[
              styles.availabilityDot,
              { backgroundColor: getAvailabilityColor(lesson) },
            ]}
          />
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

      {/* Quick Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filters.availableOnly && styles.filterChipActive,
            ]}
            onPress={() =>
              setFilters({ ...filters, availableOnly: !filters.availableOnly })
            }
          >
            <Text
              style={[
                styles.filterText,
                filters.availableOnly && styles.filterTextActive,
              ]}
            >
              Available Only
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filters.timeOfDay === "morning" && styles.filterChipActive,
            ]}
            onPress={() =>
              setFilters({
                ...filters,
                timeOfDay: filters.timeOfDay === "morning" ? "all" : "morning",
              })
            }
          >
            <Text
              style={[
                styles.filterText,
                filters.timeOfDay === "morning" && styles.filterTextActive,
              ]}
            >
              Morning
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filters.timeOfDay === "afternoon" && styles.filterChipActive,
            ]}
            onPress={() =>
              setFilters({
                ...filters,
                timeOfDay:
                  filters.timeOfDay === "afternoon" ? "all" : "afternoon",
              })
            }
          >
            <Text
              style={[
                styles.filterText,
                filters.timeOfDay === "afternoon" && styles.filterTextActive,
              ]}
            >
              Afternoon
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filters.timeOfDay === "evening" && styles.filterChipActive,
            ]}
            onPress={() =>
              setFilters({
                ...filters,
                timeOfDay: filters.timeOfDay === "evening" ? "all" : "evening",
              })
            }
          >
            <Text
              style={[
                styles.filterText,
                filters.timeOfDay === "evening" && styles.filterTextActive,
              ]}
            >
              Evening
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
                  <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
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
                  {selectedLesson.currentCap >= selectedLesson.totalCap ? (
                    <Text style={styles.fullText}>This lesson is full</Text>
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
  );
}
