import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import React from "react";
import { myProfileStyles as styles } from "../styles/myProfileStyles";
import apiClient from "../../services/apiClient";

// helper so whatever the backend sends still makes sense in the UI
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

const formatTimeFromISO = (value) => {
  if (!value) {
    return "TBD";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatWindowLabel = (start, end) => {
  const startLabel = formatTimeFromISO(start);
  const endLabel = formatTimeFromISO(end);
  if (startLabel === "TBD" && endLabel === "TBD") {
    return "Window TBD";
  }
  if (startLabel === "TBD") {
    return `Until ${endLabel}`;
  }
  if (endLabel === "TBD") {
    return `From ${startLabel}`;
  }
  return `${startLabel} - ${endLabel}`;
};

// table for which badge + label for each attendance state
const ATTENDANCE_STATUS_META = {
  attended: {
    badgeStyle: "attendanceStatusAttended",
    textStyle: "attendanceStatusTextAttended",
    label: "Marked",
  },
  pending: {
    badgeStyle: "attendanceStatusPending",
    textStyle: "attendanceStatusTextPending",
    label: "Mark now",
  },
  upcoming: {
    badgeStyle: "attendanceStatusUpcoming",
    textStyle: "attendanceStatusTextUpcoming",
    label: "Upcoming",
  },
  missed: {
    badgeStyle: "attendanceStatusMissed",
    textStyle: "attendanceStatusTextMissed",
    label: "Missed",
  },
};

// main lesson screen: info about the class, upcoming sessions, and enrolled students
export default function LessonDetailsScreen() {
  const router = useRouter();
  const { lessonId } = useLocalSearchParams();
  // hang on to the lesson data plus all the loading/marking flags we need
  const [lesson, setLesson] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [markingSessionId, setMarkingSessionId] = useState(null);
  const [isMarking, setIsMarking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // use lessonId to grab details
  useEffect(() => {
    if (lessonId) {
      fetchLessonDetails();
    }
  }, [lessonId]);

  // use API to load lesson info, students, and attendance sessions
  const fetchLessonDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Fetching lesson details for ID: ${lessonId}`);

      // Tutor endpoint returns the lesson details along with students
      const lessonData = await apiClient.get(`/tutors/lessons/${lessonId}/students`);
      
      console.log("📄 Lesson data:", lessonData);

      if (lessonData) {
        setLesson(lessonData);
        setStudents(lessonData.students || []);
        setClasses(Array.isArray(lessonData.classes) ? lessonData.classes : []);
      } else {
        throw new Error("Failed to fetch lesson data");
      }
    } catch (error) {
      console.error("❌ Error fetching lesson details:", error);
      setError(error.message || "Failed to load lesson details");
    } finally {
      setLoading(false);
    }
  };

  // when tutor marka attendance -> call API then refresh the classes list
  const handleMarkAttendance = async (session) => {
    if (!lessonId || !session?.id) {
      return;
    }

    if (isMarking) {
      return;
    }

    try {
      setIsMarking(true);
      setMarkingSessionId(session.id);
      const response = await apiClient.patch(`/tutors/lessons/${lessonId}/attendance/${session.id}/mark`);
      const payload = response?.data ?? response;
      if (payload?.classes && Array.isArray(payload.classes)) {
        setClasses(payload.classes);
      }
      Alert.alert('Attendance', 'Attendance marked successfully.');
    } catch (err) {
      console.error('Failed to mark attendance:', err);
      const message = err?.data?.message || err?.message || 'Unable to mark attendance right now.';
      Alert.alert('Attendance', message);
    } finally {
      setIsMarking(false);
      setMarkingSessionId(null);
    }
  };

  // for refreshing screen
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLessonDetails();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
  };

  // Loading screen while we wait for the API to respond.
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
            Loading lesson details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error screen if something blows up while fetching lesson data.
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Lesson Details</Text>
          </View>
          <View
            style={[
              styles.container,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={{ marginTop: 16, fontSize: 16, color: "#6B7280", textAlign: "center" }}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.logoutButton, { marginTop: 16 }]}
              onPress={handleRefresh}
            >
              <Text style={styles.logoutText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // just in case no lesson date 
  if (!lesson) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ fontSize: 16, color: "#6B7280" }}>
            No lesson data available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Build the nice-looking strings for subject, schedule, location, etc.
  const subjectName = lesson?.subject?.name || "Subject TBD";
  const dayLabel = formatDayLabel(lesson?.dayOfWeek);
  const timeLabel = formatTimeRangeLabel(lesson?.startTime, lesson?.endTime);
  const scheduleLine =
    dayLabel === "Schedule TBD" && timeLabel === "Time TBD"
      ? "Schedule TBD"
      : `${dayLabel} - ${timeLabel}`;
  const locationLine = lesson?.location?.address
    ? lesson.location.address
    : "Location TBD";
  const studentCount = `${lesson?.currentCap ?? 0}/${lesson?.totalCap ?? 0} students`;
  const isActive = lesson?.isActive !== false;

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lesson Details</Text>
        </View>

        {/* Lesson Information */}
        <View style={styles.section}>
          <View style={styles.lessonHeader}>
            <Text style={styles.lessonTitle} numberOfLines={2}>
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
          
          {lesson?.description && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.lessonMeta}>{lesson.description}</Text>
            </View>
          )}
        </View>

        {/* Class Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Class Sessions</Text>
          {classes.length > 0 ? (
            classes.map((session) => {
              const statusMeta =
                ATTENDANCE_STATUS_META[session.status] ||
                ATTENDANCE_STATUS_META.upcoming;
              const canMark = session.canMarkNow && session.status === "pending";
              return (
                <View style={styles.attendanceItem} key={session.id}>
                  <View style={styles.attendanceItemHeader}>
                    <View style={styles.attendanceItemInfo}>
                      <Text style={styles.attendanceItemDate}>
                        {formatDateLabel(session.date)}
                      </Text>
                      <Text style={styles.attendanceMeta}>
                        Scheduled:{" "}
                        {formatWindowLabel(
                          session.markWindow?.scheduledStart,
                          session.markWindow?.scheduledEnd
                        )}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.attendanceStatusBadge,
                        styles[statusMeta.badgeStyle],
                      ]}
                    >
                      <Text
                        style={[
                          styles.attendanceStatusText,
                          styles[statusMeta.textStyle],
                        ]}
                      >
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.attendanceMeta}>
                    Mark window:{" "}
                    {formatWindowLabel(
                      session.markWindow?.start,
                      session.markWindow?.end
                    )}
                  </Text>
                  {session.isAttended && (
                    <Text style={styles.attendanceMeta}>
                      Attendance already marked.
                    </Text>
                  )}
                  {canMark && (
                    <TouchableOpacity
                      style={[
                        styles.attendanceMarkButton,
                        isMarking && markingSessionId === session.id
                          ? styles.attendanceMarkButtonDisabled
                          : null,
                      ]}
                      disabled={isMarking && markingSessionId === session.id}
                      onPress={() => handleMarkAttendance(session)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.attendanceMarkButtonText}>
                        {isMarking && markingSessionId === session.id
                          ? "Marking..."
                          : "Mark attendance"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.lessonEmptyContainer}>
              <Ionicons
                name="time-outline"
                size={20}
                color="#9CA3AF"
                style={styles.lessonEmptyIcon}
              />
              <Text style={styles.lessonEmptyTitle}>No class instances yet</Text>
              <Text style={styles.lessonEmptySubtitle}>
                Attendance dates will appear once the schedule is generated.
              </Text>
            </View>
          )}
        </View>

        {/* Enrolled Students */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Enrolled Students ({students.length})
          </Text>
          {students.length > 0 ? (
            students.map((student, index) => (
              <View
                key={student.id || index}
                style={[
                  styles.lessonItem,
                  index === students.length - 1 ? styles.lessonItemLast : null,
                ]}
              >
                <View style={styles.lessonHeader}>
                  <Text style={styles.lessonTitle} numberOfLines={1}>
                    {student.firstName} {student.lastName}
                  </Text>
                  <Text style={styles.lessonSubject}>
                    {student.gender || "Not specified"}
                  </Text>
                </View>
                <Text style={styles.lessonSchedule}>
                  Grade: {student.gradeLevel || "Not specified"}
                </Text>
                <Text style={styles.lessonMeta}>
                  Phone: {student.phone || "Not provided"}
                </Text>
                <Text style={styles.lessonMeta}>
                  Email: {student.email || "Not provided"}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.lessonEmptyContainer}>
              <Ionicons
                name="people-outline"
                size={20}
                color="#9CA3AF"
                style={styles.lessonEmptyIcon}
              />
              <Text style={styles.lessonEmptyTitle}>
                No students enrolled yet
              </Text>
              <Text style={styles.lessonEmptySubtitle}>
                Students will appear here once they enroll in this lesson.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



