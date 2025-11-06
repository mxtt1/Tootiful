import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { agencyDetailsStyles as styles } from "./styles/agenciesStyles";
import agencyService from "../services/agencyService";
import authService from "../services/authService";

export default function AgencyDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [agency, setAgency] = useState(null);
  const [locations, setLocations] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [brandColors, setBrandColors] = useState(null);

  useEffect(() => {
    if (id) {
      fetchAgencyDetails();
    }
  }, [id]);

  const fetchAgencyDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Fetching agency details for ID:", id);

      // Fetch agency details, locations, and lessons in parallel
      const [agencyResponse, locationsResponse, lessonsResponse] =
        await Promise.all([
          agencyService.getAgencyById(id),
          agencyService.getAgencyLocations(id),
          agencyService.getLessonsByAgencyId(id),
        ]);

      console.log("✅ Agency details:", agencyResponse.data);
      console.log("✅ Agency locations:", locationsResponse);
      console.log("✅ Agency lessons:", lessonsResponse);

      const agencyData = agencyResponse.data;
        
      const brandData = {
        // Use custom display name if available, otherwise agency name
        displayName: agencyData.customTheme?.displayName || agencyData.name,
        
        // Use custom colors if available
        colors: agencyData.customTheme?.colors || [],
        
        // Use selected brand image, fallback to agency image
        brandImage: agencyData.image,
        
        // Use custom description if available
        aboutUs: agencyData.customTheme?.description || agencyData.aboutUs,
        
        // Include all metadata for potential future use
        metadata: agencyData.metadata,
        customTheme: agencyData.customTheme,
        useCustomTheme: agencyData.useCustomTheme
      };

      console.log("🎨 Enhanced brand data:", brandData);
      
      setAgency(agencyData);
      setBrandColors(brandData.colors);
      setLocations(locationsResponse.data || []);
      setLessons(lessonsResponse.data || []);
      
    } catch (error) {
      console.error("❌ Error fetching agency details:", error);
      setError(error.message || "Failed to load agency details");
    } finally {
    setLoading(false); 
  }
};

  const handleEnrollInLesson = async (lesson) => {
    try {
      // Check if user is authenticated
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
        params: {
          lessonId: lesson.id,
        },
      });
    } catch (error) {
      console.error("❌ Error handling lesson enrollment:", error);
      Alert.alert("Error", "Failed to process enrollment. Please try again.");
    }
  };

  const toggleSubjectExpansion = (subjectName) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectName]: !prev[subjectName],
    }));
  };

  const groupLessonsBySubject = () => {
    const grouped = {};
    lessons.forEach((lesson) => {
      const subjectKey = lesson.subjectName || "Other";
      if (!grouped[subjectKey]) {
        grouped[subjectKey] = [];
      }
      grouped[subjectKey].push(lesson);
    });
    return grouped;
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? "AM" : "PM";
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getAgencyInitials = (name) => {
    if (!name) return "AG";
    const words = name.split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getPrimaryColor = () => {
    return brandColors && brandColors.length > 0 ? brandColors[0] : '#8B5CF6';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading agency details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !agency) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={64} color="#dc3545" />
          <Text style={styles.loadingText}>{error || "Agency not found"}</Text>
          <TouchableOpacity
            style={styles.enrollButton}
            onPress={() => router.back()}
          >
            <Text style={styles.enrollButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={getPrimaryColor()} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agency Details</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Agency Header */}
          <View style={styles.agencyHeader}>
            {agency.image ? (
              <Image
                source={{ uri: agency.image }}
                style={styles.agencyImage}
                onError={(e) =>
                  console.log("Image failed to load:", agency.image)
                }
              />
            ) : (
              <View style={styles.agencyImagePlaceholder}>
                <Text style={styles.agencyImageText}>
                  {getAgencyInitials(agency.name)}
                </Text>
              </View>
            )}
            <Text style={[styles.agencyName, { color: getPrimaryColor() }]}>{agency.name}</Text>
            <Text style={styles.agencyEmail}>{agency.email}</Text>
            {agency.phone && (
              <Text style={styles.agencyPhone}>{agency.phone}</Text>
            )}
          </View>

          {/* About Us Section */}
          {agency.aboutUs && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>About Us</Text>
              <Text style={styles.aboutText}>{agency.aboutUs}</Text>
            </View>
          )}

          {/* Locations Section */}
          {locations.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Our Locations</Text>
              {locations.map((location, index) => (
                <View key={location.id || index} style={styles.locationItem}>
                  <View style={styles.locationIcon}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={getPrimaryColor()}
                    />
                  </View>
                  <Text style={styles.locationText}>{location.address}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Lessons Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Available Lessons</Text>
            {lessons.length > 0 ? (
              (() => {
                const groupedLessons = groupLessonsBySubject();
                return Object.keys(groupedLessons).map((subjectName) => (
                  <View key={subjectName} style={styles.subjectGroup}>
                    {/* Subject Header - Collapsible */}
                    <TouchableOpacity
                      style={styles.subjectHeader}
                      onPress={() => toggleSubjectExpansion(subjectName)}
                    >
                      <View style={styles.subjectHeaderContent}>
                        <Text style={styles.subjectHeaderText}>
                          {subjectName}
                        </Text>
                        <Text style={styles.subjectLessonCount}>
                          {groupedLessons[subjectName].length} lesson
                          {groupedLessons[subjectName].length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <Ionicons
                        name={
                          expandedSubjects[subjectName]
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={20}
                        color={getPrimaryColor()}
                      />
                    </TouchableOpacity>

                    {/* Lessons under this subject - Collapsible Content */}
                    {expandedSubjects[subjectName] && (
                      <View style={styles.subjectLessons}>
                        {groupedLessons[subjectName].map((lesson) => (
                          <View key={lesson.id} style={styles.lessonCard}>
                            <Text style={styles.lessonTitle}>
                              {lesson.title}
                            </Text>
                            <View style={styles.lessonDetails}>
                              <View style={styles.lessonDetailRow}>
                                <View style={styles.lessonDetailIcon}>
                                  <Ionicons
                                    name="book-outline"
                                    size={16}
                                    color="#666"
                                  />
                                </View>
                                <Text style={styles.lessonDetailText}>
                                  Subject:{" "}
                                  {lesson.subjectName &&
                                  lesson.subjectGradeLevel
                                    ? `${lesson.subjectName} - ${lesson.subjectGradeLevel}`
                                    : lesson.subjectName || "N/A"}
                                </Text>
                              </View>
                              <View style={styles.lessonDetailRow}>
                                <View style={styles.lessonDetailIcon}>
                                  <Ionicons
                                    name="calendar-outline"
                                    size={16}
                                    color="#666"
                                  />
                                </View>
                                <Text style={styles.lessonDetailText}>
                                  {lesson.dayOfWeek?.charAt(0).toUpperCase() +
                                    lesson.dayOfWeek?.slice(1)}
                                </Text>
                              </View>
                              <View style={styles.lessonDetailRow}>
                                <View style={styles.lessonDetailIcon}>
                                  <Ionicons
                                    name="time-outline"
                                    size={16}
                                    color="#666"
                                  />
                                </View>
                                <Text style={styles.lessonDetailText}>
                                  {formatTime(lesson.startTime)} -{" "}
                                  {formatTime(lesson.endTime)}
                                </Text>
                              </View>
                              <View style={styles.lessonDetailRow}>
                                <View style={styles.lessonDetailIcon}>
                                  <Ionicons
                                    name="cash-outline"
                                    size={16}
                                    color="#666"
                                  />
                                </View>
                                <Text style={styles.lessonDetailText}>
                                  ${lesson.studentRate || "N/A"} per session
                                </Text>
                              </View>
                              {lesson.locationAddress && (
                                <View style={styles.lessonDetailRow}>
                                  <View style={styles.lessonDetailIcon}>
                                    <Ionicons
                                      name="location-outline"
                                      size={16}
                                      color="#666"
                                    />
                                  </View>
                                  <Text style={styles.lessonDetailText}>
                                    {lesson.locationAddress}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {lesson.isActive && (
                              <TouchableOpacity style={[styles.enrollButton, { backgroundColor: getPrimaryColor() }]} onPress={() => handleEnrollInLesson(lesson)}>
                                <Text style={styles.enrollButtonText}>
                                  Enroll Now
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ));
              })()
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>
                  No lessons available at this time
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
