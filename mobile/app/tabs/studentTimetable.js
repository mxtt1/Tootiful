import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import apiClient from "../../services/apiClient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import authService from "../../services/authService";
import lessonService from "../../services/lessonService";
import { jwtDecode } from "jwt-decode";
import {
  studentTimetableStyles as styles
} from "../styles/studentTimetableStyles.js";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const START_HOUR = 8;
const END_HOUR = 22;

export default function StudentTimetable() {
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [lessonToUnenroll, setLessonToUnenroll] = useState(null);

  // Helper to normalize dayOfWeek from API to grid format
  const normalizeDay = (day) => {
    const map = {
      monday: "MON",
      tuesday: "TUE",
      wednesday: "WED",
      thursday: "THU",
      friday: "FRI",
      saturday: "SAT",
      sunday: "SUN",
    };
    if (!day) return day;
    const lower = day.toLowerCase();
    return map[lower] || day.toUpperCase();
  };

  // Helper to convert "HH:mm:ss" to minutes since midnight
  function timeToMinutes(timeStr) {
    const [h, m, s] = timeStr.split(":").map(Number);
    return h * 60 + m;
  }

  // Fetch lessons from API
  const fetchLessons = async () => {
    // Get the authenticated user's ID
    let userId = null;
    if (studentId === null && authService.isAuthenticated()) {
      const token = authService.getCurrentToken();
      if (token) {
        try {
          const decoded = jwtDecode(token);
          userId = decoded.userId;
        } catch (error) {
          console.error("Error decoding token:", error);
        }
      }
    }
    setStudentId(userId);

    try {
      const res = await lessonService.getStudentLessons(studentId !== null ? studentId : userId, true);
      // Normalize dayOfWeek for each lesson
      const lessonsNormalized = res.map((lesson) => ({
        ...lesson,
        dayOfWeek: normalizeDay(lesson.dayOfWeek),
      }));
      setLessons(lessonsNormalized);
    } catch (err) {
      console.log("Error fetching lessons:", err);
      setLessons([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  // Fetch lessons when studentId is set
  useEffect(() => {
    fetchLessons();
  }, []);

  // Refresh data when user returns to this tab
  useFocusEffect(
    useCallback(() => {
      fetchLessons();
    }, [])
  );

  // Build timetable grid: rows = days, columns = hours
  const renderGrid = () => {
    const cols = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      cols.push(
        <View key={hour} style={styles.colHeader}>
          <Text style={styles.timeLabel}>{`${hour}:00`}</Text>
        </View>
      );
    }

    return DAYS.map((day) => {
      // For each day, render a row
      return (
        <View key={day} style={styles.dayRow}>
          <Text style={styles.dayLabel}>{day}</Text>
          <View style={styles.dayRowGrid}>

            {/* Render lesson blocks for this day, positioned and sized proportionally */}
            {lessons
              .filter((l) => l.dayOfWeek === day)
              .map((lesson) => {
                const startMin = timeToMinutes(lesson.startTime);
                const endMin = timeToMinutes(lesson.endTime);
                const dayStartMin = START_HOUR * 60;
                const dayEndMin = END_HOUR * 60;
                // Clamp lesson to grid
                const clampedStart = Math.max(startMin, dayStartMin);
                const clampedEnd = Math.min(endMin, dayEndMin);
                const left =
                  ((clampedStart - dayStartMin) /
                    ((END_HOUR - START_HOUR) * 60)) *
                  100;
                const width =
                  ((clampedEnd - clampedStart) /
                    ((END_HOUR - START_HOUR) * 60)) *
                  100;
                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={[
                      styles.lessonBlock,
                      {
                        position: "absolute",
                        left: `${left}%`,
                        width: `${width}%`,
                        top: 6,
                        bottom: 6,
                        zIndex: 2,
                      },
                    ]}
                    onPress={() => setSelectedLesson(lesson)}
                  >
                    <Text style={styles.lessonText}>{lesson.title}</Text>
                    <Text style={styles.lessonTime}>
                      {lesson.startTime} - {lesson.endTime}
                    </Text>
                  </TouchableOpacity>
                );
              })}

            {/* Render hour grid lines */}
            {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: `${(i / (END_HOUR - START_HOUR)) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  backgroundColor: "#E5E7EB",
                  zIndex: 1,
                }}
              />
            ))}
          </View>
        </View>
      );
    });
  };

  const handleUnenrollPress = (lesson) => {
    setLessonToUnenroll(lesson);
    setShowUnenrollModal(true);
  };

  const confirmUnenroll = async () => {
    if (!lessonToUnenroll || !studentId) return;

    try {
      setUnenrolling(true);
      setShowUnenrollModal(false);

      await lessonService.unenrollStudentFromLesson(
        studentId,
        lessonToUnenroll.id
      );

      Alert.alert(
        "Success",
        "You have successfully unenrolled from this lesson!",
        [{ text: "OK" }]
      );

      // Refresh lessons
      fetchLessons();
      setLessonToUnenroll(null);
    } catch (error) {
      console.error("Unenrollment error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to unenroll from lesson";

      Alert.alert("Error", errorMessage);
    } finally {
      setUnenrolling(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? "AM" : "PM";
    return `${hour12}:${minutes} ${ampm}`;
  };

  const renderEnrolledClassesList = () => {
    if (lessons.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Enrolled Classes</Text>
          <Text style={styles.emptySubtitle}>
            Browse lessons to enroll in your first class
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.classList}>
        {lessons.map((lesson) => (
          <View key={lesson.id} style={styles.classCard}>
            <View style={styles.classCardHeader}>
              <View style={styles.classIconContainer}>
                <Ionicons name="book" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.classTitle}>{lesson.title}</Text>
                <Text style={styles.classSubject}>
                  {lesson.subject.gradeLevel} {lesson.subject.name}
                </Text>
              </View>
            </View>

            <View style={styles.classDetails}>
              <View style={styles.classDetailRow}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.classDetailText}>
                  {lesson.dayOfWeek} • {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                </Text>
              </View>

              <View style={styles.classDetailRow}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={styles.classDetailText}>
                  {lesson.location.address}
                </Text>
              </View>

              <View style={styles.classDetailRow}>
                <Ionicons name="person-outline" size={16} color="#6B7280" />
                {lesson.tutor ? (
                  <TouchableOpacity
                    onPress={() => router.push(`/viewTutorProfile?id=${lesson.tutor.id}`)}
                  >
                    <Text style={[styles.classDetailText, styles.tutorLink]}>
                      {`${lesson.tutor.firstName} ${lesson.tutor.lastName}`}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.classDetailText}>Not assigned</Text>
                )}
              </View>

              <View style={styles.classDetailRow}>
                <Ionicons name="business-outline" size={16} color="#6B7280" />
                <Text style={styles.classDetailText}>
                  {lesson.agency.name}
                </Text>
              </View>

              <View style={styles.classDetailRow}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
                <Text style={styles.classDetailText}>
                  Ends On: {lesson.endDate ? lesson.endDate : 'N/A'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.unenrollButton,
                unenrolling && styles.unenrollButtonDisabled,
              ]}
              onPress={() => handleUnenrollPress(lesson)}
              disabled={unenrolling}
            >
              <Ionicons name="exit-outline" size={18} color="#EF4444" />
              <Text style={styles.unenrollButtonText}>Unenroll</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>My Schedule</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchLessons}
              colors={["#8B5CF6"]}
            />
          }
        >
          {/* Timetable Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Timetable</Text>
            <ScrollView horizontal style={{ minHeight: 350 }}>
              <View>
                {/* Header row for time slots */}
                <View style={styles.timeHeaderRow}>
                  <Text style={styles.dayLabel}></Text>
                  {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                    <View key={i + START_HOUR} style={styles.colHeader}>
                      <Text style={styles.timeLabel}>{`${i + START_HOUR
                        }:00`}</Text>
                    </View>
                  ))}
                </View>
                {/* Timetable grid: days as rows */}
                {renderGrid()}
              </View>
            </ScrollView>
          </View>

          {/* Enrolled Classes List Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Enrolled Classes</Text>
            {renderEnrolledClassesList()}
          </View>
        </ScrollView>
      )}

      {/* Lesson details modal */}
      <Modal visible={!!selectedLesson} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedLesson && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setSelectedLesson(null)}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.infoRow}>
                    <Ionicons name="book-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>
                      {selectedLesson.subject.gradeLevel}{" "}
                      {selectedLesson.subject.name}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>
                      {selectedLesson.location.address}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>
                      {selectedLesson.dayOfWeek} {selectedLesson.startTime} -{" "}
                      {selectedLesson.endTime}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={20} color="#666" />
                    {selectedLesson.tutor ? (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedLesson(null);
                          router.push(`/viewTutorProfile?id=${selectedLesson.tutor.id}`);
                        }}
                      >
                        <Text style={[styles.infoText, styles.tutorLink]}>
                          {`${selectedLesson.tutor.firstName} ${selectedLesson.tutor.lastName}`}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.infoText}>Not assigned</Text>
                    )}
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="business-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>
                      {selectedLesson.agency.name}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Unenroll Confirmation Modal */}
      <Modal visible={showUnenrollModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Ionicons name="warning-outline" size={48} color="#EF4444" />
              <Text style={styles.confirmModalTitle}>Confirm Unenrollment</Text>
            </View>

            <View style={styles.confirmModalBody}>
              <Text style={styles.confirmModalText}>
                Are you sure you want to unenroll from{" "}
                <Text style={styles.confirmModalBold}>
                  {lessonToUnenroll?.title}
                </Text>
                ?
              </Text>
              <Text style={styles.confirmModalWarning}>
                Please note: No refunds will be given for unenrolling from this lesson.
              </Text>
            </View>

            <View style={styles.confirmModalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowUnenrollModal(false);
                  setLessonToUnenroll(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmUnenroll}
              >
                <Text style={styles.confirmButtonText}>Unenroll</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
