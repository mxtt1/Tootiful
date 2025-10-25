import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import tutorService from "../services/tutorService.js";
import { tutorProfileStyles as styles } from "./styles/tutorProfileStyles";

export default function ViewTutorProfileScreen() {
  const { id } = useLocalSearchParams();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTutorData();
  }, [id]);

  const fetchTutorData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Fetching fresh tutor data for ID:", id);
      // Try to fetch from API first
      const response = await tutorService.getTutorById(id || 1);

      // Use real API data, only add mock data for fields not available in API
      const tutorData = {
        ...response,
        // Only mock data for fields that aren't implemented in the API yet
        age: response.age || 35,
        rating: response.rating || 4.5,
        totalReviews:
          response.totalReviews || Math.floor(Math.random() * 50) + 10,
        isOnline: response.isOnline !== undefined ? response.isOnline : true,
        // Use API data directly for these fields that can be updated
        education: response.education || "University Graduate",
        aboutMe:
          response.aboutMe ||
          `I am a passionate ${
            response.subjects?.[0]?.name || "subject"
          } tutor with extensive experience helping students excel in their studies.`,
        firstName: response.firstName,
        lastName: response.lastName,
        phone: response.phone,
        image: response.image || null,
        subjects: response.subjects || [],
      };

      setTutor(tutorData);
      console.log("✅ Fetched fresh tutor data:", tutorData);
    } catch (error) {
      console.warn("⚠️ API failed:", error.message);
      setError("Failed to load tutor profile. Please try again.");
      // Don't fallback to mock data - show error state instead
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    // Specifically navigate back to the tutors tab
    router.push("/tabs/tutors");
  };

  const handleRefresh = () => {
    // Force refresh the tutor data
    fetchTutorData();
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
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Text style={styles.backButtonText}>Go Back</Text>
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
                  onError={(e) =>
                    console.log("Image failed to load:", tutor.image)
                  }
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
          <Text style={styles.aboutText}>{tutor.aboutMe}</Text>
        </View>

        {/* Education Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          <Text style={styles.educationText}>{tutor.education}</Text>
        </View>

        {/* Subjects of Expertise */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subjects of Expertise</Text>
          {tutor.subjects && tutor.subjects.length > 0 ? (
            tutor.subjects.map((subject, index) => (
              <View key={index} style={styles.subjectItem}>
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
            ))
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
          <TouchableOpacity style={styles.messageButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
            <Text style={styles.messageButtonText}>Send Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bookButton}>
            <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            <Text style={styles.bookButtonText}>Book Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
