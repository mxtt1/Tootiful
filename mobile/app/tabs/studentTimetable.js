import React, { useEffect, useState, useCallback, use } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native";
import apiClient from "../../services/apiClient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import authService from "../../services/authService";
import lessonService from "../../services/lessonService";
import { jwtDecode } from "jwt-decode";
import PaymentHistory from "../../components/PaymentHistory";
import {
  studentTimetableStyles as styles
} from "../styles/studentTimetableStyles.js";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const START_HOUR = 8;
const END_HOUR = 22;

export default function StudentTimetable() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Weekly Timetable</Text>
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

          {/* Payment History Section */}
          <PaymentHistory userId={studentId} />
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
                    <Text style={styles.infoText}>
                      {selectedLesson.tutor
                        ? `${selectedLesson.tutor.firstName} ${selectedLesson.tutor.lastName}`
                        : "Not assigned"}
                    </Text>
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
    </SafeAreaView>
  );
}
