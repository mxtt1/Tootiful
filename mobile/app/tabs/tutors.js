import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { tutorsStyles as styles } from "../styles/tutorsStyles";
import tutorService from "../../services/tutorService";

// Mock tutors data (fallback)
const MOCK_TUTORS = [
  {
    id: 1,
    firstName: "Alice",
    lastName: "Smith",
    email: "alice.smith@example.com",
    phone: "87654321",
    subjects: [
      { name: "Mathematics", experienceLevel: "advanced" },
      { name: "Physics", experienceLevel: "intermediate" },
    ],
    rating: 4.8,
    totalReviews: 24,
    isOnline: true,
  },
  {
    id: 2,
    firstName: "Bob",
    lastName: "Johnson",
    email: "bob.johnson@example.com",
    phone: "87654322",
    subjects: [
      { name: "English", experienceLevel: "expert" },
      { name: "Literature", experienceLevel: "advanced" },
    ],
    rating: 4.6,
    totalReviews: 18,
    isOnline: false,
  },
  {
    id: 3,
    firstName: "Carol",
    lastName: "Wilson",
    email: "carol.wilson@example.com",
    phone: "87654323",
    subjects: [
      { name: "Chemistry", experienceLevel: "expert" },
      { name: "Biology", experienceLevel: "advanced" },
    ],
    rating: 4.9,
    totalReviews: 31,
    isOnline: true,
  },
];

export default function TutorsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tutors, setTutors] = useState([]);
  const [filteredTutors, setFilteredTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tutors from API on component mount
  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from API first
      const response = await tutorService.getAllTutors({
        active: true,
        limit: 50, // Get more tutors for better demo
      });

      // Transform API data to match component expectations
      const apiTutors = response.data.map((tutor) => ({
        id: tutor.id,
        firstName: tutor.firstName,
        lastName: tutor.lastName,
        email: tutor.email,
        phone: tutor.phone,
        subjects: tutor.subjects.map((subject) => ({
          name: subject.name,
          experienceLevel: subject.TutorSubject.experienceLevel,
        })),
        rating: 4.5, // Mock rating since not in API yet
        totalReviews: Math.floor(Math.random() * 50) + 10, // Mock reviews
        isOnline: Math.random() > 0.3, // Mock online status
      }));

      setTutors(apiTutors);
      setFilteredTutors(apiTutors);
      console.log("✅ Fetched tutors from API:", apiTutors.length, "tutors");
    } catch (error) {
      console.warn("⚠️ API failed, using mock data:", error.message);
      setError("Using demo data - API not available");
      setTutors(MOCK_TUTORS);
      setFilteredTutors(MOCK_TUTORS);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text === "") {
      setFilteredTutors(tutors);
    } else {
      const filtered = tutors.filter(
        (tutor) =>
          tutor.firstName.toLowerCase().includes(text.toLowerCase()) ||
          tutor.lastName.toLowerCase().includes(text.toLowerCase()) ||
          tutor.subjects.some((subject) =>
            subject.name.toLowerCase().includes(text.toLowerCase())
          )
      );
      setFilteredTutors(filtered);
    }
  };

  const handleTutorPress = (tutor) => {
    // Navigate to tutor profile screen
    router.push(`/tutor/tutorProfile?id=${tutor.id}`);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={14} color="#F59E0B" />);
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#F59E0B" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={14}
          color="#D1D5DB"
        />
      );
    }

    return stars;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Search Header */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tutors or subjects..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>Finding great tutors...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.tutorsList}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={fetchTutors}
                colors={["#007bff"]}
              />
            }
          >
            {filteredTutors.map((tutor) => (
              <TouchableOpacity
                key={tutor.id}
                style={styles.tutorCard}
                onPress={() => handleTutorPress(tutor)}
              >
                <View style={styles.tutorHeader}>
                  <View style={styles.tutorImageContainer}>
                    <View style={styles.tutorImagePlaceholder}>
                      <Text style={styles.tutorImageText}>
                        {tutor.firstName[0]}
                        {tutor.lastName[0]}
                      </Text>
                    </View>
                    {/* Online indicator */}
                    {tutor.isOnline && <View style={styles.onlineIndicator} />}
                  </View>

                  <View style={styles.tutorInfo}>
                    <Text style={styles.tutorName}>
                      {tutor.firstName} {tutor.lastName}
                    </Text>

                    <View style={styles.ratingContainer}>
                      <View style={styles.starsContainer}>
                        {renderStars(tutor.rating)}
                      </View>
                      <Text style={styles.ratingText}>
                        {tutor.rating} ({tutor.totalReviews} reviews)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.onlineStatus}>
                    <Text
                      style={[
                        styles.statusText,
                        { color: tutor.isOnline ? "#10B981" : "#6B7280" },
                      ]}
                    >
                      {tutor.isOnline ? "Online" : "Offline"}
                    </Text>
                  </View>
                </View>

                {/* Subjects */}
                <View style={styles.subjectsContainer}>
                  <Text style={styles.subjectsLabel}>Subjects:</Text>
                  <View style={styles.subjectsTags}>
                    {tutor.subjects.map((subject, index) => (
                      <View key={index} style={styles.subjectTag}>
                        <Text style={styles.subjectTagText}>
                          {subject.name} ({subject.experienceLevel})
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.messageButton}>
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color="#8B5CF6"
                    />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.viewProfileButton}>
                    <Text style={styles.viewProfileButtonText}>
                      View Profile
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}

            {filteredTutors.length === 0 && !loading && (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search" size={64} color="#D1D5DB" />
                <Text style={styles.noResultsText}>No tutors found</Text>
                <Text style={styles.noResultsSubtext}>
                  Try searching for different subjects or tutors
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
