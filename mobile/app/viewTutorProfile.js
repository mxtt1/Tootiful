import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import tutorService from "../services/tutorService.js";
import lessonService from "../services/lessonService.js";
import authService from "../services/authService.js";
import { tutorProfileStyles as styles } from "./styles/tutorProfileStyles";

export default function ViewTutorProfileScreen() {
  const { id } = useLocalSearchParams();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [subjectLessons, setSubjectLessons] = useState({});
  const [loadingLessons, setLoadingLessons] = useState({});

  useEffect(() => {
    fetchTutorData();
  }, [id]);

  const fetchTutorData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await tutorService.getTutorById(id || 1);

      const tutorData = {
        ...response,
        age: response.age || 35,
        rating: response.rating || 4.5,
        totalReviews: response.totalReviews || Math.floor(Math.random() * 50) + 10,
        education: response.education || "University Graduate",
        aboutMe: response.aboutMe || `I am a passionate ${response.subjects?.[0]?.name || "subject"} tutor with extensive experience helping students excel in their studies.`,
        subjects: response.subjects || [],
      };

      setTutor(tutorData);
    } catch (error) {
      console.error("Error fetching tutor data:", error.message);
      setError("Failed to load tutor profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    router.push("/tabs/tutors");
  };

  const handleRefresh = () => {
    fetchTutorData();
  };

  const toggleSubject = async (subjectId) => {
    const isExpanded = expandedSubjects[subjectId];

    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !isExpanded
    }));

    // If expanding and we haven't loaded lessons yet, fetch them
    if (!isExpanded && !subjectLessons[subjectId]) {
      try {
        setLoadingLessons(prev => ({ ...prev, [subjectId]: true }));

        const lessonsData = await lessonService.getAllLessons({
          tutorId: id,
          subjectId: subjectId
        });

        setSubjectLessons(prev => ({
          ...prev,
          [subjectId]: lessonsData || []
        }));
      } catch (error) {
        console.error('Error fetching lessons:', error);
        setSubjectLessons(prev => ({
          ...prev,
          [subjectId]: []
        }));
      } finally {
        setLoadingLessons(prev => ({ ...prev, [subjectId]: false }));
      }
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    // Convert 24h format to 12h format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDayName = (dayNumber) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Unknown';
  };

  const handleEnrollInLesson = async (lesson) => {
    try {
      if (!authService.isAuthenticated()) {
        Alert.alert("Login Required", "Please log in to enroll in lessons.", [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => router.push("/login") },
        ]);
        return;
      }

      // Navigate to lesson enrollment/payment
      router.push({
        pathname: "/payment",
        params: { lessonId: lesson.id },
      });
    } catch (error) {
      console.error("Error handling lesson enrollment:", error);
      Alert.alert("Error", "Failed to process enrollment. Please try again.");
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={16} color="#F59E0B" />);
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={16} color="#F59E0B" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={16}
          color="#D1D5DB"
        />
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading tutor profile...</Text>
      </View>
    );
  }

  if (!tutor) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Tutor not found</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleBackPress}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tutor Profile</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={["#8B5CF6"]}
            tintColor="#8B5CF6"
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              {tutor.image ? (
                <Image
                  source={{
                    uri: tutor.image + `?timestamp=${Date.now()}`,
                  }}
                  style={styles.profileImagePlaceholder}
                  onError={() => console.error("Image failed to load")}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImageText}>
                    {tutor.firstName[0]}
                    {tutor.lastName[0]}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.tutorName}>
                {tutor.firstName} {tutor.lastName}
              </Text>

              <View style={styles.subjectAndAge}>
                <Text style={styles.primarySubject}>
                  {tutor.subjects?.[0]?.name || "Mathematics"}
                </Text>
                <Text style={styles.age}>Age {tutor.age}</Text>
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.phoneNumber}>{tutor.phone}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* About Me Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.sectionText}>{tutor.aboutMe}</Text>
        </View>

        {/* Education Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          <Text style={styles.sectionText}>{tutor.education}</Text>
        </View>

        {/* Subjects of Expertise */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subjects of Expertise</Text>
          {tutor.subjects && tutor.subjects.length > 0 ? (
            tutor.subjects.map((subject, index) => {
              const isExpanded = expandedSubjects[subject.id];
              const lessons = subjectLessons[subject.id] || [];
              const isLoadingLessons = loadingLessons[subject.id];

              return (
                <View key={subject.id} style={styles.subjectAccordion}>
                  <TouchableOpacity
                    style={styles.subjectHeader}
                    onPress={() => toggleSubject(subject.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.subjectHeaderLeft}>
                      <View style={styles.subjectMainInfo}>
                        <Text style={styles.subjectName}>{subject.name}</Text>
                        <Text style={styles.subjectGrade}>
                          {subject.gradeLevel || "All Levels"}
                        </Text>
                      </View>
                      <View style={styles.subjectDetails}>
                        <Text style={styles.subjectLevel}>
                          {(
                            subject.experienceLevel ||
                            subject.TutorSubject?.experienceLevel ||
                            "intermediate"
                          )
                            .charAt(0)
                            .toUpperCase() +
                            (
                              subject.experienceLevel ||
                              subject.TutorSubject?.experienceLevel ||
                              "intermediate"
                            ).slice(1)}
                        </Text>
                        <Text style={styles.subjectRate}>
                          ${subject.TutorSubject?.hourlyRate || 45}/hr
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={24}
                      color="#8B5CF6"
                    />
                  </TouchableOpacity>

                  {/* Expanded Lessons List */}
                  {isExpanded && (
                    <View style={styles.lessonsContainer}>
                      {isLoadingLessons ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#8B5CF6" />
                          <Text style={styles.loadingText}>Loading lessons...</Text>
                        </View>
                      ) : lessons.length > 0 ? (
                        lessons.map((lesson, lessonIndex) => (
                          <View key={lessonIndex} style={styles.lessonCard}>
                            <View style={styles.lessonHeader}>
                              <Text style={styles.lessonTitle}>{lesson.title}</Text>
                              <Text style={styles.lessonRate}>${lesson.studentRate}/month</Text>
                            </View>

                            <View style={styles.lessonDetailsRow}>
                              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                              <Text style={styles.lessonDetail}>
                                {getDayName(lesson.dayOfWeek)}
                              </Text>
                            </View>

                            <View style={styles.lessonDetailsRow}>
                              <Ionicons name="time-outline" size={16} color="#6B7280" />
                              <Text style={styles.lessonDetail}>
                                {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                              </Text>
                            </View>

                            <View style={styles.lessonDetailsRow}>
                              <Ionicons name="location-outline" size={16} color="#6B7280" />
                              <Text style={styles.lessonDetail}>
                                {lesson.locationAddress || 'Location not specified'}
                              </Text>
                            </View>

                            <View style={styles.lessonDetailsRow}>
                              <Ionicons name="people-outline" size={16} color="#6B7280" />
                              <Text style={styles.lessonDetail}>
                                {lesson.currentCap || 0}/{lesson.totalCap} students
                              </Text>
                            </View>

                            {lesson.description && (
                              <Text style={styles.lessonDescription}>
                                {lesson.description}
                              </Text>
                            )}

                            {/* Enrollment Button */}
                            {lesson.isActive && (
                              <TouchableOpacity
                                style={styles.enrollButton}
                                onPress={() => handleEnrollInLesson(lesson)}
                              >
                                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                                <Text style={styles.enrollButtonText}>Enroll Now</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))
                      ) : (
                        <View style={styles.noLessonsContainer}>
                          <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
                          <Text style={styles.noLessonsText}>
                            No lessons available for this subject
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.noSubjects}>No subjects listed</Text>
          )}
        </View>

        {/* Ratings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.ratingLeft}>
              <View style={styles.starsContainer}>
                {renderStars(tutor.rating)}
              </View>
              <Text style={styles.ratingText}>
                {tutor.rating} stars ({tutor.totalReviews} reviews)
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons for Students */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.primaryButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
