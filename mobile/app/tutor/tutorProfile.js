import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useEffect } from "react";
import tutorService from "../../services/tutorService.js";
import { tutorProfileStyles as styles } from "../styles/tutorProfileStyles";

export default function TutorProfileScreen() {
  const { id } = useLocalSearchParams();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fallback to mock data if API fails - mapped by ID
  const MOCK_TUTORS_DATA = {
    1: {
      id: 1,
      firstName: "Alice",
      lastName: "Smith",
      email: "alice.smith@example.com",
      phone: "87654321",
      hourlyRate: "45.50",
      age: 28,
      subjects: [
        {
          name: "Mathematics",
          experienceLevel: "advanced",
          gradeLevel: "Upper Primary",
        },
        {
          name: "Physics",
          experienceLevel: "intermediate",
          gradeLevel: "Secondary",
        },
      ],
      rating: 4.8,
      totalReviews: 24,
      isOnline: true,
      education:
        "National University of Singapore, Bachelor's degree in Mathematics",
      aboutMe:
        "I am a passionate mathematics tutor with over 5 years of experience helping students excel in their studies. I believe in making learning fun and engaging while building strong foundational skills.",
    },
    2: {
      id: 2,
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob.johnson@example.com",
      phone: "87654322",
      hourlyRate: "35.00",
      age: 42,
      subjects: [
        {
          name: "English",
          experienceLevel: "expert",
          gradeLevel: "Secondary",
        },
        {
          name: "Literature",
          experienceLevel: "advanced",
          gradeLevel: "Upper Secondary",
        },
      ],
      rating: 4.6,
      totalReviews: 18,
      isOnline: false,
      education: "Cambridge University, Master's degree in English Literature",
      aboutMe:
        "With over 15 years of teaching experience, I specialize in helping students improve their English language skills and appreciate literature. My approach focuses on critical thinking and effective communication.",
    },
    3: {
      id: 3,
      firstName: "Carol",
      lastName: "Wilson",
      email: "carol.wilson@example.com",
      phone: "87654323",
      hourlyRate: "50.00",
      age: 35,
      subjects: [
        {
          name: "Chemistry",
          experienceLevel: "expert",
          gradeLevel: "Upper Secondary",
        },
        {
          name: "Biology",
          experienceLevel: "advanced",
          gradeLevel: "Secondary",
        },
      ],
      rating: 4.9,
      totalReviews: 31,
      isOnline: true,
      education: "MIT, PhD in Chemistry",
      aboutMe:
        "I am a research scientist and passionate educator with a PhD in Chemistry. I love helping students understand complex scientific concepts through hands-on experiments and real-world applications.",
    },
  };

  const MOCK_TUTOR_DETAILS =
    MOCK_TUTORS_DATA[parseInt(id)] || MOCK_TUTORS_DATA[1];

  useEffect(() => {
    fetchTutorData();
  }, [id]);

  const fetchTutorData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from API first
      const response = await tutorService.getTutorById(id || 1);

      // Transform API data to match our component needs
      const tutorData = {
        ...response,
        age: 35, // Mock age since not in API
        rating: 3.8, // Mock rating since not implemented yet
        totalReviews: 174, // Mock reviews
        isOnline: true, // Mock online status
        education: "XYZ University, Bachelor's degree in Mathematics", // Mock education
        aboutMe: `I am a passionate ${
          response.subjects?.[0]?.name || "subject"
        } tutor with extensive experience helping students excel in their studies.`, // Generate aboutMe
      };

      setTutor(tutorData);
      console.log("✅ Fetched tutor from API:", tutorData);
    } catch (error) {
      console.warn("⚠️ API failed, using mock data:", error.message);
      setError("Using demo data - API not available");
      setTutor(MOCK_TUTOR_DETAILS);
    } finally {
      setLoading(false);
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tutor Profile</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageText}>
                  {tutor.firstName[0]}
                  {tutor.lastName[0]}
                </Text>
              </View>
              {/* Online indicator */}
              {tutor.isOnline && <View style={styles.onlineIndicator} />}
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
                <Text style={styles.subjectLevel}>
                  {subject.experienceLevel
                    ? subject.experienceLevel.charAt(0).toUpperCase() +
                      subject.experienceLevel.slice(1)
                    : "Intermediate"}
                </Text>
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
            <Text style={styles.hourlyRate}>${tutor.hourlyRate}/hour</Text>
          </View>
        </View>

        {/* Future Sprint 2 Features: Call and Book buttons will be added later */}
      </ScrollView>
    </View>
  );
}
